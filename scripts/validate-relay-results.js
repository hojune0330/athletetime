#!/usr/bin/env node
/**
 * 역전(구간)마라톤 결과 규격 검증기
 *
 * 스펙: docs/athletetime-relay-results-standardization.md (R1~R4)
 * 사용: node scripts/validate-relay-results.js [--json]
 *  - 위반 0건 → exit 0
 *  - 위반 존재 → exit 1 + 대회별 위반 목록 출력
 *
 * Codex 완료 조건: 이 스크립트가 전 연도에 대해 exit 0.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RESULTS_DIR = path.join(ROOT, 'data', 'results');

// ── 규칙 정의 ──────────────────────────────────────────────
const TIME_IN_TEXT = /\d{1,2}:\d{2}/; // R1: 이름/팀/소속에 시간 금지
const LONG_DIGITS = /\d{3,}/; // R1: 3자리 이상 연속 숫자 금지
const RECORD_OK = /^(\d{1,2}:)?\d{1,2}:\d{2}(\.\d{1,2})?$/; // R2: H:MM:SS | MM:SS
const STATUS_OK = /^(DNF|DNS|DQ|DSQ|NM|NT|-)?$/i; // R2: 상태 표기
const NAME_OK = /^[가-힣A-Za-z·\s]{1,20}$/; // R3: 이름은 한글/영문만
const LIFE_SPORT_COMPETITION_PATTERNS = [/생활체육/i, /마스터즈/i, /대축전/i, /recordsport/i];

/** 역전(구간) 대회 판별 */
function isRelayCompetition(comp) {
  const text = `${comp.competitionName || ''} ${(comp.events || []).map((e) => e.event || '').join(' ')}`;
  const isLifeSport = LIFE_SPORT_COMPETITION_PATTERNS.some((pattern) => pattern.test(comp.competitionName || ''));
  return !isLifeSport && /역전|구간/.test(text);
}

function checkNameField(violations, ctx, field, value) {
  const v = String(value || '');
  if (!v) return;
  if (TIME_IN_TEXT.test(v)) violations.push({ ...ctx, rule: 'R1', field, value: v, why: '시간 패턴 혼입' });
  else if (LONG_DIGITS.test(v)) violations.push({ ...ctx, rule: 'R1', field, value: v, why: '숫자 뭉치 혼입' });
}

function checkRecordField(violations, ctx, field, value) {
  const v = String(value || '').trim();
  if (!v) return;
  if (!RECORD_OK.test(v) && !STATUS_OK.test(v)) {
    violations.push({ ...ctx, rule: 'R2', field, value: v, why: '시간/상태 형식 아님' });
  }
}

function validateCompetition(comp, year) {
  const violations = [];
  for (const [ei, ev] of (comp.events || []).entries()) {
    const results = ev.results || [];
    const seenRanks = [];
    for (const [ri, r] of results.entries()) {
      const ctx = {
        year,
        competitionId: comp.competitionId,
        competitionName: comp.competitionName,
        event: ev.event,
        row: ri + 1,
      };

      // R5: unverified 행은 규격 검사 면제 (노출도 안 됨)
      if (r.parseStatus === 'unverified') continue;

      // R1: 텍스트 필드 오염
      checkNameField(violations, ctx, 'name', r.name);
      checkNameField(violations, ctx, 'team', r.team);
      checkNameField(violations, ctx, 'affiliation', r.affiliation);

      // R2: record 형식
      checkRecordField(violations, ctx, 'record', r.record);
      // note/newRecord에 주자 문자열이 흘러든 경우 (코오롱 고등부 사고 패턴)
      checkNameField(violations, ctx, 'note', TIME_IN_TEXT.test(String(r.note || '')) ? r.note : '');

      // R3: legs 규격
      for (const [li, leg] of (r.legs || []).entries()) {
        const lctx = { ...ctx, row: `${ri + 1}.leg${li + 1}` };
        if (!NAME_OK.test(String(leg.name || ''))) {
          violations.push({ ...lctx, rule: 'R3', field: 'legs.name', value: String(leg.name || ''), why: '이름 형식 아님' });
        }
        checkRecordField(violations, lctx, 'legs.legRecord', leg.legRecord);
      }

      if (r.rank != null) seenRanks.push(Number(r.rank));
    }

    // R4: rank 연속성 (동순위 허용) + 중복 완전행 금지
    const sorted = [...seenRanks].sort((a, b) => a - b);
    if (sorted.length && sorted[0] !== 1) {
      violations.push({
        year, competitionId: comp.competitionId, competitionName: comp.competitionName,
        event: ev.event, row: '-', rule: 'R4', field: 'rank', value: String(sorted[0]), why: 'rank가 1부터 시작하지 않음',
      });
    }
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i] - sorted[i - 1] > 1) {
        violations.push({
          year, competitionId: comp.competitionId, competitionName: comp.competitionName,
          event: ev.event, row: '-', rule: 'R4', field: 'rank', value: `${sorted[i - 1]}→${sorted[i]}`, why: 'rank 건너뜀',
        });
        break;
      }
    }
    void ei;
  }
  return violations;
}

function main() {
  const asJson = process.argv.includes('--json');
  const files = fs.readdirSync(RESULTS_DIR).filter((f) => /^\d{4}\.json$/.test(f)).sort();
  const all = [];
  let relayComps = 0;

  for (const file of files) {
    const year = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
    for (const comp of data) {
      if (!isRelayCompetition(comp)) continue;
      relayComps += 1;
      all.push(...validateCompetition(comp, year));
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ relayCompetitions: relayComps, violations: all.length, details: all }, null, 2));
  } else {
    console.log(`역전(구간) 대회 ${relayComps}건 검사 — 위반 ${all.length}건`);
    const byComp = new Map();
    for (const v of all) {
      const key = `${v.year} ${v.competitionId} ${v.competitionName}`;
      byComp.set(key, (byComp.get(key) || 0) + 1);
    }
    for (const [key, count] of byComp) console.log(`  ✗ ${key} — ${count}건`);
    if (all.length && !process.argv.includes('--quiet')) {
      console.log('\n샘플 (최대 10건):');
      for (const v of all.slice(0, 10)) {
        console.log(`  [${v.rule}] ${v.competitionId} ${v.event} row=${v.row} ${v.field}="${String(v.value).slice(0, 40)}" (${v.why})`);
      }
    }
  }

  process.exit(all.length === 0 ? 0 : 1);
}

main();
