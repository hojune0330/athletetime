#!/usr/bin/env node
/**
 * identity-poc.js — S3 동일인 식별 PoC 평가기 (오프라인/무해)
 *
 * 목적(전략 마스터 §6 S3):
 *   - 외부 크롤링 없이, **기존 로컬 인덱스만**으로 동일인 매칭 알고리즘의 거동을 측정한다.
 *   - 같은 이름·다른 소속(이적/연도변화) 후보 클러스터를 탐지하고 매칭 신뢰도를 산출.
 *   - person_no(타기관 식별자)는 **판단 시점 메모리에서만** 쓰이고 결과/로그에 **절대 남지 않음**(B안)을
 *     코드 단언(assert)으로 검증한다.
 *
 * 무해성 보장:
 *   - 네트워크 호출 0. 파일 쓰기 0(기본). 표준출력 리포트만.
 *   - 실제 person_no 는 데이터에 없으므로 "가상 person_no"로 폐기 흐름만 검증.
 *
 * 실행: node tools/identity-poc.js [--limit N] [--min-confidence 0.85] [--json]
 */

const assert = require('assert');
const ra = require('../card-studio/services/recordAnalyticsService');

/* ----------------------------- 인자 파싱 ----------------------------- */
function parseArgs(argv) {
  const args = { limit: 30, minConfidence: 0.85, json: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--limit') args.limit = parseInt(argv[++i], 10) || 30;
    else if (a === '--min-confidence') args.minConfidence = parseFloat(argv[++i]) || 0.85;
    else if (a === '--json') args.json = true;
  }
  return args;
}

/* --------------------------- 매칭 신뢰도 --------------------------- */
/** 이름 정규화(공백 압축, 소문자, 양끝 trim). */
function normName(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * 두 선수 레코드(같은 정규화 이름 전제)의 동일인 신뢰도.
 * 신호: 연도 연속/근접(이적 자연스러움) + 종목 일관성 + 소속 동일.
 * **이름 흔함 패널티**: 같은 이름 클러스터가 클수록(흔한 이름일수록) 오매칭 위험이 크므로
 *   강하게 감점한다. PoC 1차 측정에서 김민서 30명·김민지 29명이 0.95로 과병합된 문제를 교정.
 * 의도적으로 보수적(애매하면 낮게) — 오매칭이 신뢰를 가장 크게 해친다.
 *
 * @param {object} a, b - 후보 선수 카드
 * @param {number} clusterSize - 같은 이름 클러스터 크기(흔함 지표)
 */
function confidence(a, b, clusterSize = 2) {
  let score = 0.4; // 같은 이름 기본점(약하게)

  const yearsA = new Set(a.years || []);
  const yearsB = new Set(b.years || []);
  const allYears = [...yearsA, ...yearsB];
  if (allYears.length) {
    const span = Math.max(...allYears) - Math.min(...allYears);
    // 활동 연도가 한 사람의 커리어로 설명 가능한 범위면 가점.
    if (span <= 20) score += 0.15;
    if (span <= 10) score += 0.1;
  }

  // 종목 일관성: 공통 종목이 있으면 동일인 가능성↑(강한 신호).
  const evA = new Set(a.events || []);
  const evB = new Set(b.events || []);
  const evShared = [...evA].filter((e) => evB.has(e)).length;
  if (evShared > 0) score += 0.2;
  else score -= 0.1; // 공통 종목이 전혀 없으면 다른 사람일 가능성↑

  // 소속이 완전히 동일하면 약가점.
  const teamA = normName(a.team);
  const teamB = normName(b.team);
  if (teamA && teamA === teamB) score += 0.05;

  // 이름 흔함 패널티: 클러스터가 클수록 강하게 감점(흔한 이름은 동명이인 다수).
  //   2명: 0, 5명: -0.1, 10명: -0.2, 20명: -0.3, 30명: -0.4 (상한 -0.4)
  if (clusterSize > 2) {
    const penalty = Math.min(0.4, (clusterSize - 2) * 0.014);
    score -= penalty;
  }

  return Math.min(1, Math.max(0, Number(score.toFixed(3))));
}

/* ----------------- person_no 폐기 흐름 검증(B안) ----------------- */
/**
 * 같은 이름 후보군을 '가상 person_no'로 묶어 동일인 판단을 내린 뒤,
 * 결과 객체에는 person_no 를 절대 포함하지 않음을 단언한다.
 * (실데이터에 person_no 가 없으므로 흐름/계약만 검증)
 */
function judgeAndDiscardPersonNo(cluster) {
  // 1) 메모리에서만 가상 식별자 부여(타기관 식별자 모사)
  const withPersonNo = cluster.map((c, i) => ({
    ...c,
    __personNo: `virt_${1000 + i}`, // 메모리 전용. 절대 반환 금지.
  }));

  // 2) 동일인 그룹핑 판단(여기선 같은 이름=후보) — person_no 는 판단 보조에만 사용 가정
  const decided = {
    canonicalId: `at_${Math.random().toString(16).slice(2, 10)}`,
    displayName: cluster[0].name,
    memberAthleteKeys: withPersonNo.map((c) => c.athleteKey),
    affiliations: [...new Set(cluster.map((c) => c.team).filter(Boolean))],
    // ❌ personNo 필드 없음 (B안). matchedPersonNo 등도 금지.
  };

  // 3) 폐기 검증: 결과 어디에도 person_no 흔적이 없어야 한다.
  const serialized = JSON.stringify(decided);
  assert.ok(!/personNo|__personNo|virt_/i.test(serialized),
    'B안 위반: 결과에 person_no 흔적이 남았습니다');
  assert.ok(!('personNo' in decided) && !('__personNo' in decided),
    'B안 위반: 결과 객체에 person_no 키가 존재합니다');

  // withPersonNo 는 함수 스코프 종료와 함께 GC 대상 → 영속화 경로 없음.
  return decided;
}

/* ------------------------------ 메인 ------------------------------ */
function main() {
  const args = parseArgs(process.argv);
  const idx = ra.getIndex();
  const athletes = idx.athletes || idx;

  // 같은 정규화 이름으로 그룹핑 → 2명 이상이면 '동일인 후보 클러스터'.
  const byName = new Map();
  for (const a of athletes) {
    const k = normName(a.name);
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(a);
  }

  const clusters = [...byName.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([name, list]) => ({ name, list }))
    .sort((x, y) => y.list.length - x.list.length);

  // 메트릭 집계
  let pairTotal = 0;
  let pairAuto = 0; // 신뢰도>=임계 → 자동 병합 후보
  let pairReview = 0; // 0.5~임계 → 사람 검토
  const samples = [];
  let personNoDiscardChecks = 0;

  for (const cluster of clusters.slice(0, args.limit)) {
    const { list } = cluster;

    // 폐기 흐름 검증(클러스터마다 1회)
    judgeAndDiscardPersonNo(list);
    personNoDiscardChecks += 1;

    // 후보쌍 신뢰도
    const pairs = [];
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const conf = confidence(list[i], list[j], list.length);
        pairTotal += 1;
        if (conf >= args.minConfidence) pairAuto += 1;
        else if (conf >= 0.5) pairReview += 1;
        pairs.push({
          a: { team: list[i].team, years: list[i].years },
          b: { team: list[j].team, years: list[j].years },
          confidence: conf,
          decision: conf >= args.minConfidence ? 'auto-merge' : (conf >= 0.5 ? 'review' : 'reject'),
        });
      }
    }
    samples.push({ name: cluster.name, members: list.length, pairs });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'local-index-only (no network)',
    totalAthletes: athletes.length,
    nameCollisionClusters: clusters.length,
    evaluatedClusters: Math.min(args.limit, clusters.length),
    pairMetrics: {
      total: pairTotal,
      autoMergeCandidates: pairAuto,
      reviewCandidates: pairReview,
      autoMergeRate: pairTotal ? Number((pairAuto / pairTotal).toFixed(3)) : 0,
    },
    bPlanVerification: {
      personNoDiscardChecks,
      personNoLeaked: false, // assert 통과 시 항상 false
      note: 'person_no는 판단 메모리에서만 사용되고 결과/로그에 미포함(assert로 검증).',
    },
    minConfidence: args.minConfidence,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify({ report, samples }, null, 2) + '\n');
    return;
  }

  // 사람이 읽는 리포트
  console.log('=== AthleteTime 동일인 식별 PoC (S3) ===');
  console.log(`출처: ${report.source}`);
  console.log(`전체 선수 카드: ${report.totalAthletes.toLocaleString()}`);
  console.log(`동명 클러스터(2명 이상): ${report.nameCollisionClusters.toLocaleString()} (평가 ${report.evaluatedClusters})`);
  console.log('--- 후보쌍 메트릭 ---');
  console.log(`  총 후보쌍: ${report.pairMetrics.total}`);
  console.log(`  자동병합 후보(>=${args.minConfidence}): ${report.pairMetrics.autoMergeCandidates}`);
  console.log(`  사람검토 후보(0.5~): ${report.pairMetrics.reviewCandidates}`);
  console.log(`  자동병합 비율: ${(report.pairMetrics.autoMergeRate * 100).toFixed(1)}%`);
  console.log('--- B안 person_no 폐기 검증 ---');
  console.log(`  검증 횟수: ${report.bPlanVerification.personNoDiscardChecks}`);
  console.log(`  person_no 유출: ${report.bPlanVerification.personNoLeaked ? '❌ 있음' : '✅ 없음'}`);
  console.log('--- 표본(상위 5 클러스터) ---');
  for (const s of samples.slice(0, 5)) {
    console.log(`  [${s.name}] ${s.members}명, 후보쌍 ${s.pairs.length}`);
    for (const p of s.pairs.slice(0, 3)) {
      console.log(`    · ${p.a.team}(${(p.a.years||[]).join(',')}) ↔ ${p.b.team}(${(p.b.years||[]).join(',')}) → ${p.decision} (${p.confidence})`);
    }
  }
  console.log('\n주의: 이 PoC는 로컬 인덱스만 사용하며 외부 데이터 취득/식별을 수행하지 않습니다.');
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('PoC 실패:', e.message);
    process.exit(1);
  }
}

module.exports = { confidence, normName, judgeAndDiscardPersonNo };
