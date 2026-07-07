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
  normalizeSeriesName,
  formatGap,
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
  assert.equal(multi.stat, '2관왕');
  assert.match(multi.title, /홍길동/);
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

test('HIGHLIGHT-API-001: result events route returns highlights with series history context', () => {
  const source = readSource('card-studio/routes/resultEventsRoute.js');
  assert.match(source, /competitionHighlightsService/);
  assert.match(source, /buildSeriesHistory\(filename, meta, dependencies\)/);
  assert.match(source, /buildCompetitionHighlights\(events, \{ history \}\)/);
  assert.match(source, /highlights,/);
});

test('HIGHLIGHT-HISTORY-001: series comparison produces series_best / streak / vs_last', () => {
  const current = [
    makeEvent({
      event: '남자 마라톤 결승',
      eventType: 'marathon',
      results: [{ rank: 1, name: '홍길동', affiliation: 'A팀', record: '2:05:00', newRecord: '' }],
    }),
  ];
  const history = [
    {
      year: '2025',
      events: [makeEvent({
        event: '남자 마라톤 결승',
        eventType: 'marathon',
        results: [{ rank: 1, name: '홍길동', affiliation: 'A팀', record: '2:06:30', newRecord: '' }],
      })],
    },
    {
      year: '2024',
      events: [makeEvent({
        event: '남자 마라톤 결승',
        eventType: 'marathon',
        results: [{ rank: 1, name: '다른사람', affiliation: 'B팀', record: '2:07:00', newRecord: '' }],
      })],
    },
  ];

  const highlights = buildCompetitionHighlights(current, { history });

  // 역대 최고 (2개 이상 과거 회차 필요)
  const best = highlights.find((h) => h.type === 'series_best');
  assert.ok(best, 'series_best expected');
  assert.equal(best.stat, '2:05:00');
  assert.match(best.detail, /종전 최고 2:06:30 \(2025\)/);
  assert.match(best.detail, /수집된 3개 회차 기준/);

  // 직전 회차부터 연속 우승 (2025만 같은 사람 → 2회 연속)
  const streak = highlights.find((h) => h.type === 'streak');
  assert.ok(streak, 'streak expected');
  assert.equal(streak.stat, '2회 연속 우승');

  // history 없으면 비교 하이라이트 없음
  const withoutHistory = buildCompetitionHighlights(current);
  assert.equal(withoutHistory.some((h) => ['series_best', 'streak', 'vs_last'].includes(h.type)), false);
});

test('HIGHLIGHT-HISTORY-002: vs_last reports gap against previous edition', () => {
  const current = [
    makeEvent({
      event: '여자 마라톤 결승',
      eventType: 'marathon',
      results: [{ rank: 1, name: '가선수', affiliation: 'A', record: '2:29:12', newRecord: '' }],
    }),
  ];
  const history = [
    {
      year: '2024',
      events: [makeEvent({
        event: '여자 마라톤 결승',
        eventType: 'marathon',
        results: [{ rank: 1, name: '나선수', affiliation: 'B', record: '2:31:55', newRecord: '' }],
      })],
    },
  ];
  const highlights = buildCompetitionHighlights(current, { history });
  const vsLast = highlights.find((h) => h.type === 'vs_last');
  assert.ok(vsLast, 'vs_last expected');
  assert.match(vsLast.stat, /단축/);
  assert.match(vsLast.detail, /2:29:12/);
  assert.match(vsLast.detail, /2024 2:31:55/);
});

test('HIGHLIGHT-HISTORY-003: helpers normalize series names and format gaps', () => {
  assert.equal(normalizeSeriesName('제42회 코오롱구간마라톤대회(고등학교부)'), normalizeSeriesName('제41회 코오롱구간마라톤대회(고등학교부)'));
  assert.equal(normalizeSeriesName('2026 대구마라톤대회'), normalizeSeriesName('2025 대구마라톤대회'));
  assert.equal(formatGap(0.04), '0.04초');
  assert.equal(formatGap(47), '47초');
  assert.equal(formatGap(147), '2분 27초');
});

test('HIGHLIGHT-FORM-001: highlights carry stat field and record dedup groups multiple record rows', () => {
  const events = [
    makeEvent({
      event: '남자 마라톤 결승',
      eventType: 'marathon',
      results: [
        { rank: 1, name: '가', affiliation: 'A', record: '2:04:22', newRecord: '대회신' },
        { rank: 2, name: '나', affiliation: 'B', record: '2:04:23', newRecord: '대회신' },
        { rank: 3, name: '다', affiliation: 'C', record: '2:04:31', newRecord: '대회신' },
      ],
    }),
  ];
  const highlights = buildCompetitionHighlights(events);
  const records = highlights.filter((h) => h.type === 'record');
  // 같은 종목 같은 급 신기록은 한 카드로 묶음
  assert.equal(records.length, 1);
  assert.match(records[0].title, /3명/);
  assert.equal(records[0].stat, '2:04:22');
  assert.match(records[0].detail, /외 2명/);
});

test('HIGHLIGHT-FORM-002: champion cards appear only for small road meets and skip covered events', () => {
  const road = [
    makeEvent({
      event: '남자 하프마라톤 결승',
      eventType: 'marathon',
      results: [{ rank: 1, name: '가', affiliation: 'A', record: '1:04:26', newRecord: '' }],
    }),
    makeEvent({
      event: '여자 하프마라톤 결승',
      eventType: 'marathon',
      results: [{ rank: 1, name: '나', affiliation: 'B', record: '1:15:50', newRecord: '' }],
    }),
  ];
  const roadHighlights = buildCompetitionHighlights(road);
  assert.equal(roadHighlights.filter((h) => h.type === 'champion').length, 2);

  // 종목이 많은 트랙 대회에서는 champion 카드 없음 (스팸 방지)
  const bigMeet = Array.from({ length: 10 }, (_, i) => makeEvent({
    event: `남자 종목${i} 결승`,
    results: [{ rank: 1, name: '가', affiliation: 'A', record: '10.00', newRecord: '' }],
  }));
  const bigHighlights = buildCompetitionHighlights(bigMeet);
  assert.equal(bigHighlights.some((h) => h.type === 'champion'), false);
});

test('HIGHLIGHT-INTL-001: domestic champion card appears only when a foreign athlete wins a mixed field', () => {
  // 외국 선수(소속=국가명) 우승 + 국내 선수 혼재 → 국내부 1위 카드
  const mixedField = makeEvent({
    event: '남자 마라톤 결승',
    eventType: 'marathon',
    results: [
      { rank: 1, name: '외국우승자', affiliation: '케냐', record: '2:05:00', newRecord: '' },
      { rank: 2, name: '외국선수', affiliation: '에티오피아', record: '2:05:30', newRecord: '' },
      { rank: 3, name: '국내선수', affiliation: '국군체육부대', record: '2:11:00', newRecord: '' },
    ],
  });
  const mixedHighlights = buildCompetitionHighlights([mixedField]);
  const domestic = mixedHighlights.find((h) => h.type === 'domestic_champion');
  assert.ok(domestic, 'mixed international field must yield domestic champion card');
  assert.match(domestic.title, /국내선수/);
  assert.equal(domestic.stat, '2:11:00');
  assert.match(domestic.detail, /국내부 1위/);
  assert.match(domestic.detail, /전체 3위/);

  // 국내 선수가 전체 우승 → 국내부 카드 없음 (중복 방지)
  const domesticWin = makeEvent({
    event: '남자 마라톤 결승',
    eventType: 'marathon',
    results: [
      { rank: 1, name: '국내우승자', affiliation: '삼성전자(주)', record: '2:08:00', newRecord: '' },
      { rank: 2, name: '외국선수', affiliation: '케냐', record: '2:08:30', newRecord: '' },
    ],
  });
  assert.equal(
    buildCompetitionHighlights([domesticWin]).some((h) => h.type === 'domestic_champion'),
    false,
  );

  // 전원 국내 선수 → 국제 필드가 아니므로 국내부 카드 없음
  const allDomestic = makeEvent({
    event: '남자 마라톤 결승',
    eventType: 'marathon',
    results: [
      { rank: 1, name: '가', affiliation: '청주시청', record: '2:12:00', newRecord: '' },
      { rank: 2, name: '나', affiliation: '충남도청', record: '2:12:30', newRecord: '' },
    ],
  });
  assert.equal(
    buildCompetitionHighlights([allDomestic]).some((h) => h.type === 'domestic_champion'),
    false,
  );

  // "케냐-코오롱" 같은 혼합 표기도 국제부로 판별
  const { isInternationalRow } = require(path.join(ROOT, 'card-studio/services/competitionHighlightsService'));
  assert.equal(isInternationalRow({ affiliation: '케냐-코오롱' }), true);
  assert.equal(isInternationalRow({ affiliation: '코오롱' }), false);
  assert.equal(isInternationalRow({ affiliation: '한국전력공사' }), false);
});

test('HIGHLIGHT-INTL-002: history comparison runs separately for domestic scope on mixed fields', () => {
  const current = makeEvent({
    event: '남자 마라톤 결승',
    eventType: 'marathon',
    results: [
      { rank: 1, name: '외국우승자', affiliation: '케냐', record: '2:05:00', newRecord: '' },
      { rank: 5, name: '국내선수', affiliation: '국군체육부대', record: '2:10:00', newRecord: '' },
    ],
  });
  const past = (year, intlRecord, domesticRecord) => ({
    year,
    events: [
      makeEvent({
        event: '남자 마라톤 결승',
        eventType: 'marathon',
        results: [
          { rank: 1, name: '옛외국우승자', affiliation: '에티오피아', record: intlRecord, newRecord: '' },
          { rank: 6, name: '옛국내선수', affiliation: '충남도청', record: domesticRecord, newRecord: '' },
        ],
      }),
    ],
  });
  const history = [past('2025', '2:05:30', '2:12:00'), past('2024', '2:06:00', '2:13:00')];
  const highlights = buildCompetitionHighlights([current], { history });

  // 전체 기준 series_best (2:05:00 < 2:05:30, 2:06:00)
  const overallBest = highlights.find((h) => h.type === 'series_best' && !/국내부/.test(h.detail));
  assert.ok(overallBest, 'overall series_best expected');

  // 국내부 기준 series_best (2:10:00 < 2:12:00, 2:13:00) — 별도 카드
  const domesticBest = highlights.find((h) => h.type === 'series_best' && /국내부/.test(h.detail));
  assert.ok(domesticBest, 'domestic-scope series_best expected');
  assert.equal(domesticBest.stat, '2:10:00');
  assert.match(domesticBest.detail, /수집된 3개 회차 기준/);
});

test('HIGHLIGHT-UI-001: results tab renders highlights card with SVG icons and fact notice', () => {
  const card = readSource('frontend/src/components/competitions/CompetitionHighlights.tsx');
  const tab = readSource('frontend/src/components/competitions/tabs/ResultsTab.tsx');
  const api = readSource('frontend/src/api/competitions.ts');

  assert.match(card, /이 대회 볼거리/);
  assert.match(card, /수집된 결과에서 찾은 사실만/);
  assert.match(card, /highlight\.stat/);
  assert.match(card, /series_best/);
  assert.match(card, /vs_last/);
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
