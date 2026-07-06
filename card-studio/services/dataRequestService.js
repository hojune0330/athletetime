/**
 * 데이터 정정/삭제/이의제기 요청 서비스 (Data Request Service)
 *
 * "Notice & Graduated Takedown" 법적 방어 설계의 3·4층을 담당합니다.
 *
 *  3층 (요청 접수):  POST 로 들어온 요청을 파일 큐(data/requests/requests.json)에
 *                    티켓 ID(DR-YYYY-NNNN)와 함께 저장합니다. (관리자 로그/게시판형)
 *
 *  4층 (단계별 처리): 요청은 received → under_review → (restored | removed)
 *                    상태를 거칩니다. 관리자가 "검토중/삭제"로 전환하면 해당 기록이
 *                    suppression 목록(data/requests/suppressions.json)에 추가되어
 *                    검색/결과에서 자동으로 마스킹/제외됩니다.
 *
 * 설계 의도:
 *  - 즉시 응답 의무를 만들지 않되, 접수 채널과 처리 이력은 실재 → "성실 운영" 입증.
 *  - 직접 연락(이메일) 없이 관리자 화면에서 일괄 검토·처리하는 구조.
 *  - 외부 의존성 없이 파일 기반으로 동작(배포 환경 호환).
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

const REQUESTS_DIR = path.join(config.dirs.data, 'requests');
const REQUESTS_FILE = path.join(REQUESTS_DIR, 'requests.json');
const SUPPRESSIONS_FILE = path.join(REQUESTS_DIR, 'suppressions.json');

const REQUEST_TYPES = ['correction', 'deletion', 'objection'];
// 상태 단계 (graduated exposure model):
//   received      : 접수됨
//   under_review  : 검토 중 (임시 마스킹 — "비공개 요청 처리 중")
//   search_hidden : 검색 비노출 (결과표에는 남기되 이름/소속 검색·분석 화면에서 제외) — de-index
//   corrected     : 정정됨 (잘못된 기록 수정 완료, 노출은 유지)
//   restored      : 유지(검토 완료, suppression 해제)
//   removed       : 예외적 삭제 (모든 노출에서 완전 제외)
const STATUSES = ['received', 'under_review', 'search_hidden', 'corrected', 'restored', 'removed'];

let suppressionsCache = null;
let suppressionsMtimeMs = -1;
let suppressionsCheckedAt = 0;
const SUPPRESSIONS_STAT_TTL_MS = 5000;

// ── 저수준 파일 IO ──

function _ensureDir() {
  if (!fs.existsSync(REQUESTS_DIR)) {
    fs.mkdirSync(REQUESTS_DIR, { recursive: true });
  }
}

function _readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function _writeJson(file, data) {
  _ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function _readRequests() {
  const value = _readJson(REQUESTS_FILE, []);
  return Array.isArray(value) ? value : [];
}

function _writeRequests(list) {
  _writeJson(REQUESTS_FILE, list);
}

function _readSuppressions() {
  const now = Date.now();
  if (suppressionsCache && now - suppressionsCheckedAt < SUPPRESSIONS_STAT_TTL_MS) {
    return suppressionsCache;
  }
  suppressionsCheckedAt = now;

  let mtimeMs = -1;
  try {
    mtimeMs = fs.statSync(SUPPRESSIONS_FILE).mtimeMs;
  } catch (_) {
    if (suppressionsCache && suppressionsMtimeMs === -1) return suppressionsCache;
  }

  if (suppressionsCache && suppressionsMtimeMs === mtimeMs) {
    return suppressionsCache;
  }

  const value = _readJson(SUPPRESSIONS_FILE, []);
  suppressionsCache = Array.isArray(value) ? value : [];
  suppressionsMtimeMs = mtimeMs;
  return suppressionsCache;
}

function _writeSuppressions(list) {
  _writeJson(SUPPRESSIONS_FILE, list);
  suppressionsCache = Array.isArray(list) ? list : [];
  try {
    suppressionsMtimeMs = fs.statSync(SUPPRESSIONS_FILE).mtimeMs;
  } catch (_) {
    suppressionsMtimeMs = -1;
  }
  suppressionsCheckedAt = Date.now();
}

// ── 티켓 ID 발급 ──

function _nextTicketId(list) {
  const year = new Date().getFullYear();
  const prefix = `DR-${year}-`;
  const thisYear = list.filter(r => typeof r.ticketId === 'string' && r.ticketId.startsWith(prefix));
  let maxSeq = 0;
  for (const r of thisYear) {
    const seq = parseInt(r.ticketId.slice(prefix.length), 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

// ── 입력 정규화/검증 ──

function _sanitize(str, max = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, max);
}

/**
 * suppression 매칭 키를 만듭니다.
 * 선수명(필수) + 소속(선택) + 대회(선택) 조합으로 식별합니다.
 */
function _suppressionKey({ athleteName, affiliation, competition }) {
  return [
    _sanitize(athleteName, 100),
    _sanitize(affiliation, 100),
    _sanitize(competition, 200),
  ].join('|');
}

// ── 공개 API ──

/**
 * 새 요청을 접수하고 티켓을 발급합니다.
 * @returns {{ ok: boolean, error?: string, ticketId?: string, status?: string, receivedAt?: string }}
 */
function submitRequest(input = {}) {
  const type = _sanitize(input.type, 20);
  if (!REQUEST_TYPES.includes(type)) {
    return { ok: false, error: '요청 유형이 올바르지 않습니다. (correction|deletion|objection)' };
  }

  const athleteName = _sanitize(input.athleteName, 100);
  const reason = _sanitize(input.reason, 2000);

  if (!athleteName) {
    return { ok: false, error: '대상 선수명(또는 식별 정보)을 입력해 주세요.' };
  }
  if (!reason) {
    return { ok: false, error: '요청 사유를 입력해 주세요.' };
  }

  const list = _readRequests();
  const ticketId = _nextTicketId(list);
  const now = new Date().toISOString();

  const record = {
    ticketId,
    type,
    athleteName,
    affiliation: _sanitize(input.affiliation, 100),
    competition: _sanitize(input.competition, 200),
    event: _sanitize(input.event, 120),
    reason,
    contact: _sanitize(input.contact, 200), // 선택 (없어도 됨)
    status: 'received',
    receivedAt: now,
    updatedAt: now,
    history: [{ status: 'received', at: now, note: '요청 접수' }],
  };

  list.push(record);
  _writeRequests(list);

  return { ok: true, ticketId, status: 'received', receivedAt: now };
}

/**
 * (공개) 티켓 ID로 처리 상태만 조회합니다. (개인정보 최소 노출)
 */
function getStatusByTicket(ticketId) {
  const id = _sanitize(ticketId, 30);
  const list = _readRequests();
  const r = list.find(x => x.ticketId === id);
  if (!r) return null;
  return {
    ticketId: r.ticketId,
    type: r.type,
    status: r.status,
    receivedAt: r.receivedAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * (관리자) 전체 요청 목록.
 */
function listRequests({ status } = {}) {
  let list = _readRequests();
  if (status && STATUSES.includes(status)) {
    list = list.filter(r => r.status === status);
  }
  // 최신순
  return list.slice().sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
}

/**
 * (관리자) 요청 상태를 변경합니다.
 *
 * suppression 동기화 규칙:
 *   under_review  → mode 'mask'   (검토 중 마스킹: 결과표/검색 모두 "비공개 요청 처리 중")
 *   search_hidden → mode 'hide'   (검색 비노출: 결과표엔 정상 노출, 이름/소속 검색·분석 화면에서만 제외)
 *   removed       → mode 'remove' (예외적 삭제: 모든 노출에서 완전 제외)
 *   corrected/restored → suppression 해제 (노출 유지)
 */
function updateStatus(ticketId, nextStatus, note = '') {
  const id = _sanitize(ticketId, 30);
  if (!STATUSES.includes(nextStatus)) {
    return { ok: false, error: '상태 값이 올바르지 않습니다.' };
  }

  const list = _readRequests();
  const idx = list.findIndex(r => r.ticketId === id);
  if (idx === -1) return { ok: false, error: '해당 티켓을 찾을 수 없습니다.' };

  const r = list[idx];
  const now = new Date().toISOString();
  r.status = nextStatus;
  r.updatedAt = now;
  r.history = r.history || [];
  r.history.push({ status: nextStatus, at: now, note: _sanitize(note, 500) });

  // suppression 동기화
  const key = _suppressionKey(r);
  let sup = _readSuppressions();
  // suppression 을 만드는 상태: under_review(mask) / search_hidden(hide) / removed(remove)
  // corrected / restored 는 suppression 을 만들지 않음(노출 유지).
  const SUPPRESSION_MODE = {
    under_review: 'mask',   // mask  = 검토 중 마스킹(결과표/검색 모두 "비공개 요청 처리 중")
    search_hidden: 'hide',  // hide  = 검색 비노출(결과표 정상, 검색/인사이트만 제외) — de-index
    removed: 'remove',      // remove= 완전 제외
  };
  const mode = SUPPRESSION_MODE[nextStatus];

  // 기존 동일 키 제거 후 재구성
  sup = sup.filter(s => s.key !== key);
  if (mode) {
    sup.push({
      key,
      ticketId: r.ticketId,
      athleteName: r.athleteName,
      affiliation: r.affiliation,
      competition: r.competition,
      mode,
      since: now,
    });
  }
  _writeSuppressions(sup);
  _writeRequests(list);

  return { ok: true, ticketId: r.ticketId, status: r.status };
}

/**
 * (내부) 현재 활성화된 suppression 목록을 반환합니다.
 * searchService / results 핸들러가 결과 필터링에 사용합니다.
 * @returns {Array<{athleteName, affiliation, competition, mode}>}
 */
function getActiveSuppressions() {
  return _readSuppressions();
}

// 유효한 suppression 모드 (저장된 mode 값을 정규화할 때 사용)
const SUPPRESSION_MODES = ['mask', 'hide', 'remove'];

/**
 * (내부) 특정 결과 행이 suppression 대상인지 판정합니다.
 *   'mask'   : under_review  — 결과표/검색 모두 "비공개 요청 처리 중"으로 마스킹
 *   'hide'   : search_hidden — 결과표엔 정상 노출, 이름/소속 검색·분석 화면에서만 제외(de-index)
 *   'remove' : removed       — 모든 노출에서 완전 제외
 * @returns {null | 'mask' | 'hide' | 'remove'}
 */
function checkSuppression({ name, affiliation, competition } = {}) {
  const sup = _readSuppressions();
  if (sup.length === 0) return null;

  const nm = (name || '').trim();
  const aff = (affiliation || '').trim();
  const comp = (competition || '').trim();

  for (const s of sup) {
    if (!s.athleteName) continue;
    if (s.athleteName !== nm) continue;
    // 소속이 지정돼 있으면 소속도 일치해야 함
    if (s.affiliation && s.affiliation !== aff) continue;
    // 대회가 지정돼 있으면 대회도 일치해야 함
    if (s.competition && s.competition !== comp) continue;
    // 저장된 mode 가 알 수 없는 값이면 가장 보수적인 'mask' 로 폴백
    return SUPPRESSION_MODES.includes(s.mode) ? s.mode : 'mask';
  }
  return null;
}

module.exports = {
  REQUEST_TYPES,
  STATUSES,
  submitRequest,
  getStatusByTicket,
  listRequests,
  updateStatus,
  getActiveSuppressions,
  checkSuppression,
};
