/**
 * 대회 볼거리(하이라이트) 계약 테스트
 *
 * 원칙 계약:
 * - HIGHLIGHT-RULE-001: 100% 규칙 기반 — 신기록/박빙/싹쓸이/다관왕/최다참가 5유형
 * - HIGHLIGHT-SAFE-001: 마스킹 행·품질 홀드 이벤트·혼성경기 세부종목은 집계 제외
 * - HIGHLIGHT-API-001: /results/:filename/events 응답에 highlights 포함
 * - HIGHLIGHT-UI-001: 대회 결과 탭에 볼거리 카드 렌더 (SVG 아이콘, 사실 고지)
 * - HIGHLIGHT-TONE-001: 예측/평가/랭킹/공식 인증 표현 금지
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const {
  buildCompetitionHighlights,
  recordToSeconds,
} = require(path.join(ROOT, 'card-studio/services/competitionHighlightsService'));

function makeEvent(overrides = {}) {
  return {
    event: '남자 100m 결승',
    eventType: 'track',
    results: [],
    ...overrides,
  };
}

test('HIGHLIGHT-RULE-001: record rows produce record highlights sorted 한국신 first', () => {
  const events = [
    makeEvent({
      event: '남자 100m 결승',
      results: [
        { rank: 1, name: '가선수', affiliation: 'A팀', record: '10.20', newRecord: '대회신' },
      ],
    }),
    makeEvent({
      event: '여자 3000mSC 결승',
      results: [
        { rank: 1, name: '나선수', affiliation: 'B팀', record: '9:59.05', newRecord: '한국신' },
      ],
    }),
  ];
  const highlights = buildCompetitionHighlights(events);
  assert.equal(highlights[0].type, 'record');
  assert.match(highlights[0].title, /한국신/);
  assert.match(highlights[0].detail, /나선수/);
  assert.match(highlights[1].title, /대회신/);
});

test('HIGHLIGHT-RULE-002: photo finish requires small gap on track events only', () => {
  const closeTrack = makeEvent({
    results: [
      { rank: 1, name: '가', affiliation: 'A', record: '10.41', newRecord: '' },
      { rank: 2, name: '나', affiliation: 'B', record: '10.45', newRecord: '' },
    ],
  });
  const wideTrack = makeEvent({
    results: [
      { rank: 1, name: '가', affiliation: 'A', record: '10.41', newRecord: '' },
      { rank: 2, name: '나', affiliation: 'B', record: '10.90', newRecord: '' },
    ],
  });
  const closeField = makeEvent({
    event: '남자 멀리뛰기 결승',
    eventType: 'field',
    results: [
      { rank: 1, name: '가', affiliation: 'A', record: '7.80', newRecord: '' },
      { rank: 2, name: '나', affiliation: 'B', record: '7.79', newRecord: '' },
    ],
  });

  assert.equal(buildCompetitionHighlights([closeTrack]).some((h) => h.type === 'photo_finish'), true);
  assert.equal(buildCompetitionHighlights([wideTrack]).some((h) => h.type === 'photo_finish'), false);
  // 필드 종목(거리형)은 박빙 계산 제외 — 값이 클수록 좋아서 초 단위 비교가 무의미
  assert.equal(buildCompetitionHighlights([closeField]).some((h) => h.type === 'photo_finish'), false);
});

test('HIGHLIGHT-RULE-003: sweep and multi-winner detection', () => {
  const sweep = makeEvent({
    event: '여자 마라톤 결승',
    eventType: 'marathon',
    results: [
      { rank: 1, name: '가', affiliation: '같은팀', record: '2:30:00', newRecord: '' },
      { rank: 2, name: '나', affiliation: '같은팀', record: '2:31:00', newRecord: '' },
      { rank: 3, name: '다', affiliation: '같은팀', record: '2:32:00', newRecord: '' },
    ],
  });
  const winA = makeEvent({
    event: '남자 800m 결승',
    results: [{ rank: 1, name: '홍길동', affiliation: 'C팀', record: '1:50.00', newRecord: '' }],
  });
  const winB = makeEvent({
    event: '남자 1500m 결승',
    results: [{ rank: 1, name: '홍길동', affiliation: 'C팀', record: '3:50.00', newRecord: '' }],
  });

  const highlights = buildCompetitionHighlights([sweep, winA, winB]);
  assert.equal(highlights.some((h) => h.type === 'sweep'), true);
  const multi = highlights.find((h) => h.type === 'multi_winner');
  assert.ok(multi);
  assert.match(multi.title, /2관왕/);
  assert.match(multi.detail, /홍길동/);
});

test('HIGHLIGHT-SAFE-001: masked rows, quality-hold events, combined events excluded', () => {
  const held = makeEvent({
    qualityHold: true,
    results: [{ rank: 1, name: '가', affiliation: 'A', record: '10.00', newRecord: '한국신' }],
  });
  const masked = makeEvent({
    results: [
      { rank: 1, name: '비공개 요청 처리 중', affiliation: '', record: '', newRecord: '한국신', suppressed: 'mask' },
    ],
  });
  const combinedA = makeEvent({
    event: '남자 100m(10종) 결승',
    results: [{ rank: 1, name: '가', affiliation: 'A', record: '11.00', newRecord: '' }],
  });
  const combinedB = makeEvent({
    event: '남자 400m(10종) 결승',
    results: [{ rank: 1, name: '가', affiliation: 'A', record: '50.00', newRecord: '' }],
  });

  assert.deepEqual(buildCompetitionHighlights([held]), []);
  assert.deepEqual(buildCompetitionHighlights([masked]), []);
  // 혼성경기 세부 종목 우승은 다관왕으로 집계하지 않음
  assert.equal(
    buildCompetitionHighlights([combinedA, combinedB]).some((h) => h.type === 'multi_winner'),
    false,
  );
});

test('HIGHLIGHT-SAFE-002: recordToSeconds parses times and rejects garbage', () => {
  assert.equal(recordToSeconds('10.41'), 10.41);
  assert.equal(recordToSeconds('2:05:20'), 2 * 3600 + 5 * 60 + 20);
  assert.equal(recordToSeconds('4:59.78'), 4 * 60 + 59.78);
  assert.equal(recordToSeconds('DNF'), null);
  assert.equal(recordToSeconds(''), null);
  assert.equal(recordToSeconds(null), null);
});

test('HIGHLIGHT-API-001: result events route returns highlights from visible events', () => {
  const source = readSource('card-studio/routes/resultEventsRoute.js');
  assert.match(source, /competitionHighlightsService/);
  assert.match(source, /buildCompetitionHighlights\(events\)/);
  assert.match(source, /highlights,/);
});

test('HIGHLIGHT-UI-001: results tab renders highlights card with SVG icons and fact notice', () => {
  const card = readSource('frontend/src/components/competitions/CompetitionHighlights.tsx');
  const tab = readSource('frontend/src/components/competitions/tabs/ResultsTab.tsx');
  const api = readSource('frontend/src/api/competitions.ts');

  assert.match(card, /이 대회 볼거리/);
  assert.match(card, /수집된 결과에서 찾은 사실만/);
  assert.match(card, /@heroicons\/react/);
  assert.doesNotMatch(card, /[\u{1F300}-\u{1FAFF}]/u, 'no emoji as UI icons');

  assert.match(tab, /CompetitionHighlights/);
  assert.match(tab, /resultData\.highlights/);
  assert.match(api, /CompetitionHighlight/);
});

test('HIGHLIGHT-TONE-001: highlights avoid forbidden trust words', () => {
  const files = [
    'card-studio/services/competitionHighlightsService.js',
    'frontend/src/components/competitions/CompetitionHighlights.tsx',
  ];
  for (const file of files) {
    const source = readSource(file);
    assert.doesNotMatch(source, /공식 인증|랭킹|AI 검증|예측했|평가 등급/, `${file} must avoid trust-violating words`);
  }
});
