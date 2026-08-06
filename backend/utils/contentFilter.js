/**
 * 콘텐츠 필터 (H-1b — 커뮤니티 안전장치)
 *
 * - 금칙어: 저장 거부(blocked) + 안내 문구
 * - 저격 패턴: 차단이 아니라 경고 플래그(flagged)만 — 과차단 방지, 감지 로그 용도
 * - 채팅 웹소켓 핸들러와 게시판 쓰기 라우트가 함께 사용한다.
 *
 * 금칙어 리스트는 분리 파일(badwords.json)에서 관리 — 운영자가 갱신 가능.
 */

const path = require('path');
const fs = require('fs');

const BLOCKED_MESSAGE =
  '커뮤니티 규칙에 맞지 않는 표현이 포함되어 있어요.';
const FLAG_MESSAGE =
  '특정인에 대한 글은 명예훼손 분쟁으로 이어질 수 있어요. 게시할까요?';

let badwords = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, 'badwords.json'), 'utf8');
  const parsed = JSON.parse(raw);
  badwords = Array.isArray(parsed) ? parsed : parsed.badwords || [];
} catch {
  badwords = [];
}

// 저격 패턴: 호칭 + 이름 조합 (예: "OOO 코치", "OO대 OOO", "OO 감독")
const TARGET_PATTERNS = [
  /\S{2,6}\s*(코치|감독|트레이너|선수)/,
  /[가-힣]{3,6}\s*(대|중|고)\s*[가-힣]{2,4}/,
  /(코치|감독|트레이너)\s*[가-힣]{2,4}/,
];

/**
 * 텍스트에서 금칙어 포함 여부와 저격 패턴 감지를 판정.
 *
 * @param {string} text
 * @returns {{ blocked: boolean, message?: string, flagged: boolean, flaggedReasons: string[] }}
 */
function checkContent(text) {
  const result = {
    blocked: false,
    flagged: false,
    flaggedReasons: [],
  };

  if (!text || !text.trim()) return result;
  const normalized = text.trim();

  // 1차: 금칙어 포함 시 저장 거부
  const hit = badwords.find((word) => word && normalized.includes(word));
  if (hit) {
    result.blocked = true;
    result.message = BLOCKED_MESSAGE;
    return result;
  }

  // 2차: 저격 패턴 감지 — 차단 아님, 경고 플래그만
  for (const pattern of TARGET_PATTERNS) {
    if (pattern.test(normalized)) {
      result.flagged = true;
      result.flaggedReasons.push(pattern.toString());
    }
  }
  if (result.flagged) result.message = FLAG_MESSAGE;

  return result;
}

module.exports = {
  BLOCKED_MESSAGE,
  FLAG_MESSAGE,
  checkContent,
};
