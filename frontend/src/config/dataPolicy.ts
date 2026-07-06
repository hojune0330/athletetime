/**
 * 📜 AthleteTime — 데이터 정책 · 신뢰 카피 단일 소스(Single Source of Truth)
 *
 * 이 파일의 목적은 "패치 용이성"이다.
 * 출처 표기, 신뢰 고지 문구, 미성년/공유/비교 정책 임계값을 한곳에 모은다.
 * 컴포넌트는 여기 값을 "참조만" 하고 문구를 직접 하드코딩하지 않는다.
 * → 선생님이 문구를 바꾸거나 코덱스가 정책을 손볼 때 이 파일 하나만 고치면 전체 반영.
 *
 * ──────────────────────────────────────────────────────────────
 * 설계 배경 (2026-06-12 결정, docs/athletetime-data-strategy-master.md 참조)
 *  - 원론: "공개된 경기 결과(사실)를 모아 정리"한 서비스. 공식 기록·랭킹 기관 아님.
 *  - 출처: 연맹이 "제공"한 게 아니라, 공개된 결과를 우리가 "모아 정리"했다. (#4)
 *  - 민감정보 0: 생년월일·연락처·식별번호 미보유 (실측 확인). 이게 노출 정당성의 핵심.
 *  - 미성년: 결과 노출은 성인과 동일. 단 "능동적 증폭(공유 카드 자동생성 등)"만 절제. (#2)
 *  - 공유/비교: 본인 기록 중심. 타인 박제·확산은 보수적. (#3/#5)
 *
 * ⚠️ 금지어(신뢰): 공식/랭킹/검증/예측/평가/우열/추락/하위권 + 미래약속(곧/예정/업데이트됩니다).
 *    "준비 중"은 미래약속을 대체하는 안전 표현.
 * ──────────────────────────────────────────────────────────────
 */

/** 정책 버전 — 카피/정책을 바꿀 때마다 올린다. (패치 추적용) */
export const DATA_POLICY_VERSION = '2026-06-20';

/* ============================================================
 * 1. 서비스 정체성 (한 줄 정의 — 여러 화면에서 재사용)
 * ============================================================ */
export const SERVICE_IDENTITY = {
  /** 무엇인가 */
  what: 'AthleteTime은 전국 육상 대회의 공개 경기기록을 모아 검색하고 정리하는 서비스예요.',
  /** 무엇이 아닌가 */
  whatNot: '공식 기록이나 순위를 정하는 기관이 아니에요. 생년월일·연락처 같은 개인정보는 모으지 않아요.',
  /** 왜 (긍정 메시지 — 육상계에 기여) */
  why: '흩어져 있던 공개 기록을 한곳에서 찾고, 내 기록의 흐름을 돌아볼 수 있게 — 육상에 더 많은 관심이 모이도록 만들고 있어요.',
} as const;

export const DATA_RIGHTS_POSITIONING = {
  kind: 'public_record_index',
  short: '공개 경기기록을 모아 정리했어요. 공식 기록 서비스는 아니에요.',
  full: 'AthleteTime은 공개된 경기 기록을 색인하고 정리해 보여주는 비공식 기록 탐색 서비스입니다. 공식 기록 서비스, 공식 랭킹, 원본 DB의 대체재가 아닙니다.',
} as const;

export const SOURCE_TIERS = [
  { key: 'A', label: '공공데이터·개방 출처', use: 'allowed' },
  { key: 'B', label: '공개 웹 경기결과', use: 'conditional' },
  { key: 'C', label: '제한·비공개 출처', use: 'blocked' },
  { key: 'L', label: '레거시 보유 출처', use: 'read_only_review' },
] as const;

export const PROHIBITED_PUBLIC_CLAIMS = [
  'official_database',
  'official_ranking',
  'complete_national_database',
  'ai_authority',
  'legal_loophole',
  'person_no_storage',
] as const;

/* ============================================================
 * 2. 출처 표기 (#4 — "제공받았다" 금지, "모아 정리했다"로)
 *    provider 값(예: 'KAAF', '대한육상연맹')과 대회/날짜를 받아 문구를 생성한다.
 * ============================================================ */

/** provider 코드 → 사람이 읽는 출처 주체 라벨 (확장 가능) */
const PROVIDER_LABELS: Record<string, string> = {
  KAAF: '대한육상연맹 공개 경기결과',
  대한육상연맹: '대한육상연맹 공개 경기결과',
};

/** provider 코드를 사람이 읽는 라벨로. 미등록 코드는 안전한 기본값. */
export function resolveProviderLabel(provider?: string | null): string {
  if (!provider) return '공개 경기결과';
  return PROVIDER_LABELS[provider] ?? `${provider} 공개 경기결과`;
}

export interface SourceParts {
  provider?: string | null;
  competitionName?: string | null;
  date?: string | null;
}

/**
 * 화면용 출처 한 줄.
 * 예) "출처: 대한육상연맹 공개 경기결과 · 2018 서울국제마라톤대회 (2018-03-18) — AthleteTime이 모아 정리"
 * 핵심: "제공"이라는 능동 수여 동사를 쓰지 않는다. "모아 정리"로 우리가 한 일을 정확히 표기.
 */
export function formatSource(parts: SourceParts): string {
  const label = resolveProviderLabel(parts.provider);
  const comp = parts.competitionName ? ` · ${parts.competitionName}` : '';
  const date = parts.date ? ` (${parts.date})` : '';
  return `출처: ${label}${comp}${date} — AthleteTime이 모아 정리`;
}

/** 공유 카드/워터마크용 초압축 출처 (글자수 최소). */
export function formatSourceCompact(parts: SourceParts): string {
  const label = resolveProviderLabel(parts.provider);
  return `${label} 기반 · AthleteTime 정리`;
}

/* ============================================================
 * 3. 신뢰 고지 문구 (여러 컴포넌트 공통 — 한곳에서 관리)
 *    의미 단위로 키를 나눠 두면, 컴포넌트별로 필요한 것만 골라 쓸 수 있다.
 * ============================================================ */
export const TRUST_NOTICE = {
  /** 가장 기본: 무엇을 모았는지 + 공식 아님 */
  collectedPublic: DATA_RIGHTS_POSITIONING.short,
  /** 순위/평가가 아님 */
  notRanking: '순위나 평가가 아니에요.',
  /** 나란히 보기(비교) — 우열이 아님 */
  notVersus: '순위·우열을 가리는 게 아니에요.',
  /** 동명이인 가능성 */
  homonym: '같은 이름이라도 다른 선수일 수 있어요.',
  /** 빠진 대회 가능성 (분모 오인 방지) */
  partial: '모든 대회를 담고 있지 않아요. 빠진 기록이 있을 수 있어요.',
  /** 수집 시점 기준 (원출처 동기화 불가 — 정직한 고지, #7) */
  snapshot: '수집한 시점 기준이에요. 더 정확한 정보가 있으면 알려주세요.',
  /** 흐름은 사실일 뿐 평가/예측 아님 */
  flowOnly: '공개 기록의 흐름이에요. 평가나 예측은 하지 않아요.',
} as const;

/**
 * 자주 쓰는 고지 조합을 미리 묶어둔다. (컴포넌트에서 골라 쓰기 쉽게)
 * 새 조합이 필요하면 여기 추가 → 패치 한 곳.
 */
export const TRUST_NOTICE_COMBO = {
  compareFooter: `${TRUST_NOTICE.collectedPublic} ${TRUST_NOTICE.notVersus} ${TRUST_NOTICE.homonym}`,
  badgesFooter: `AthleteTime이 모은 공개 기록 안에서의 사실이에요. ${TRUST_NOTICE.notRanking}`,
  trailFooter: `${TRUST_NOTICE.collectedPublic.replace('공식 기록 서비스가 아니에요.', '')}${TRUST_NOTICE.partial}`.trim(),
  /** 기록 흐름(발자취) 하단 — 빠진 대회 + 수집 시점 (#7) */
  trailFooterWithSnapshot: `AthleteTime이 모은 공개 기록의 흐름이에요. ${TRUST_NOTICE.partial} ${TRUST_NOTICE.snapshot}`,
  /** 익명 집계 하단 — 모은 수임을 명시 + 수집 시점 (#7/#8) */
  anonymousFooter: `개인 정보는 담지 않고, 공개 결과를 모은 수만 보여줘요. ${TRUST_NOTICE.notRanking} ${TRUST_NOTICE.snapshot}`,
} as const;

/** /records 진입 화면 신뢰 포인트 칩 */
export const TRUST_POINTS: readonly string[] = ['공개 기록 모음', '출처 함께 표시', '동명이인 확인'];

/* ============================================================
 * 3-1. 분모(모수) 오인 방지 앵커 (#8)
 *    "전국 N명 중"처럼 보이지 않도록, 항상 "우리가 모은 범위 안에서"임을 명시한다.
 *    숫자 옆/표 상단에 붙일 짧은 문구를 한곳에서 만든다.
 * ============================================================ */
export const SCOPE_ANCHOR = {
  /** 표/리스트 상단 라벨 (예: "AthleteTime이 모은 선수 1,234명 안에서") */
  prefix: 'AthleteTime이 모은',
  /** 분모 오인 방지 한 줄 */
  notice: '전국 전체가 아니라, AthleteTime이 모은 공개 기록 안에서의 수예요.',
} as const;

/**
 * "AthleteTime이 모은 선수 N명 안에서" 같은 모수 앵커 문장 생성.
 * count는 천단위 콤마로 표기. unit 기본값은 '건'.
 */
export function scopeCount(count: number, unit = '건'): string {
  const n = Number.isFinite(count) ? count.toLocaleString() : '0';
  return `${SCOPE_ANCHOR.prefix} ${n}${unit} 안에서`;
}

/* ============================================================
 * 4. 미성년 정책 (#2 — 노출은 동일, 능동적 증폭만 절제)
 *    division 텍스트로 미성년을 "추정"한다. (데이터에 부문 텍스트만 있고 나이는 없음)
 *    ⚠️ 이건 차단 스위치가 아니라 "증폭 절제" 신호용. 결과 표/검색은 영향 없음.
 * ============================================================ */

/** 미성년으로 추정하는 부문 키워드 (확장/수정 용이) */
export const MINOR_DIVISION_KEYWORDS: readonly string[] = [
  '초등', '초', '중등', '중', '고등', '고', '유소년', 'U18', 'U16', 'U14', 'U12', '학생',
];

/**
 * 부문/라벨 텍스트가 미성년 추정에 해당하는지.
 * "대학", "대학부", "U20", "일반/성인"은 제외(성인).
 * 보수적 추정이며 100% 정확하지 않다 → "차단"이 아니라 "절제 신호"로만 쓸 것.
 */
export function isLikelyMinorDivision(divisionText?: string | null): boolean {
  if (!divisionText) return false;
  const t = String(divisionText);
  // 성인 신호가 명확하면 미성년 아님
  if (/대학|일반|성인|마스터즈|실업|U20|U23/i.test(t)) return false;
  return MINOR_DIVISION_KEYWORDS.some(kw => t.includes(kw));
}

export const MINOR_POLICY = {
  /** 결과 표/검색 노출: 성인과 동일 (가리지 않는다) */
  hideResults: false,
  /**
   * 능동적 증폭(공유 카드 자동생성 등)에서만 보수적으로:
   * true이면 공유 카드 생성 시 보호자 옵트인/경고를 거치게 한다.
   * (공유 카드는 아직 미구현 — 만들 때 이 플래그를 읽어 분기)
   */
  guardShareAmplification: true,
  /** 미성년 공유 시 보여줄 안내 */
  shareGuardNotice: '미성년 선수의 기록이에요. 공유는 보호자 동의 아래 신중히 해주세요.',
} as const;

/* ============================================================
 * 5. 비교(Compare) 정책 (#5 — 보수적, 본인 중심)
 * ============================================================ */
export const COMPARE_POLICY = {
  /** 함께 비교할 수 있는 최대 인원 (base 1 + 추가 3) */
  maxAthletes: 4,
  /** 비교 라인 색상 (색으로만 구분, 승자 강조 금지) */
  lineColors: ['#0D5F5A', '#B4530C', '#6B3FB0', '#1F7A3A'],
  /** 최대 초과 시 안내 */
  overCapNotice: '비교는 최대 4명까지 나란히 볼 수 있어요.',
  /**
   * 비교의 기본 권장 형태 = "과거의 나"(본인 기록의 시간 흐름). (#5)
   * 타인과의 나란히 보기보다 본인 중심을 우선 안내한다.
   */
  ownCentricDefault: true,
  /** 본인 중심 비교 유도 문구 */
  ownCentricNotice: '나란히 보기는 ‘과거의 나’를 돌아보는 데서 출발해요. 다른 선수와 견주기보다 내 기록의 흐름을 먼저 살펴봐요.',
  /** 타인과 나란히 둘 때의 보수적 고지 */
  othersNotice: '다른 선수와 나란히 두는 건 우열을 가리는 게 아니라, 공개된 기록을 함께 보는 거예요.',
} as const;

/* ============================================================
 * 6. 공유(Share) 정책 (#3 — 본인 기록 중심, 발행자 책임)
 *    공유 카드는 아직 미구현. 만들 때 이 정책을 읽어 분기한다.
 * ============================================================ */
export const SHARE_POLICY = {
  /** 현재 구현 상태 — 'preparing' | 'enabled' | 'disabled' */
  status: 'enabled' as 'preparing' | 'enabled' | 'disabled',
  /** 준비 중 라벨 (미래약속 금지어 회피 — "준비 중") */
  preparingLabel: '준비 중',
  preparingTitle: '공유 카드는 준비하고 있어요',
  /** 활성화 시 버튼 라벨 */
  enabledLabel: '공유 카드',
  /** 워터마크/출처는 제거 불가 */
  watermarkRequired: true,
  /** 본인 기록만 자유 공유, 타인 기록은 보수적 */
  ownRecordsOnly: true,
  /**
   * 공유 카드 자체가 "무엇인지"를 선언한다. (#3 — 발행=책임)
   * 카드 위에 항상 박히는 출처/성격 문구. 제거 불가.
   */
  cardBadge: '공개 기록 모음 · 공식 아님',
  cardFooterNotice: 'AthleteTime이 모은 공개 기록이에요. 순위·평가가 아니에요.',
  /** 카드 워터마크(브랜드 + 출처 성격). formatSourceCompact와 함께 노출. */
  watermark: 'AthleteTime · athletetime',
  /**
   * 공유 전 본인 확인 고지 — 발행 책임이 공유하는 사람에게도 있음을 알린다.
   * (단정/보장 동사 없이, 책임을 환기)
   */
  ownerConfirmNotice: '내 기록일 때 공유해 주세요. 다른 사람의 기록을 퍼뜨리는 용도가 아니에요.',
  /** 저장/공유 액션 라벨 */
  saveImageLabel: '이미지로 저장',
  copyTextLabel: '기록 문구 복사',
} as const;

/* ============================================================
 * 7. 정정·삭제 (#6 — 과한 약속 금지, 정직하게)
 * ============================================================ */
export const CORRECTION_POLICY = {
  /** 정정/비노출 요청 경로 (라우트) */
  requestPath: '/data-request',
  /** 요청 안내 (단정/보장 금지) */
  notice: '내 기록이 아니거나 빼고 싶다면 정정·비노출을 요청할 수 있어요.',
  /**
   * 처리 시간 고지 (#6 — "즉시 영구삭제" 같은 과한 약속 금지).
   * 단정/보장 동사를 쓰지 않고, 검토가 필요함을 정직하게 알린다.
   */
  slaNotice: '접수된 요청은 검토 후 처리돼요. 처리에는 시간이 걸릴 수 있어요.',
  /** 비노출 우선 원칙 (기록 자체는 사실이라 보존, 검색/추천에서만 빼는 게 기본) */
  hideFirstNotice: '대부분은 기록을 지우기보다 검색·추천에서 빼는 방식으로 처리해요. 완전 삭제는 피해가 큰 예외적인 경우에 살펴봐요.',
  /** 미성년 우선 보호 */
  minorPriorityNotice: '미성년 선수(유소년·중고등부)의 요청은 더 빠르고 폭넓게 살펴봐요.',
} as const;

/* ============================================================
 * 8. 브랜드 표기 (브랜드 일관성 — 구 표기 "AthleTime"(e 하나) 통일)
 *    화면에 보이는 서비스명은 전부 이 값을 참조한다.
 * ============================================================ */
export const BRAND = {
  /** 정식 영문 표기 */
  name: 'AthleteTime',
  /** 한글 약칭 */
  nameKo: '애타',
  /** 영문+한글 병기 */
  full: 'AthleteTime(애타)',
} as const;

/* ============================================================
 * 9. PaceRise 연동 고지 (3차 가공 — "우리는 PaceRise를 이용 중")
 *    배경: 실업 LIVE 화면의 데이터는 우리가 1차로 모은 게 아니라,
 *    PaceRise(pace-rise-node.com, 한국실업육상연맹 오퍼레이터 시스템)가
 *    운영하는 결과를 우리가 다시 가져와 보여주는 "3차 가공"이다.
 *    → 출처(연맹 결과) → PaceRise(운영·집계) → AthleteTime(재가공 표시)
 *    이 사실을 명명백백히 알리고, 원본 PaceRise로 바로 갈 수 있게 한다.
 * ============================================================ */
export const PACERISE_POLICY = {
  /** 연동 대상 서비스명 */
  serviceName: 'PaceRise',
  /** 연동 대상 운영 주체 */
  operator: '한국실업육상연맹 오퍼레이터 시스템',
  /** 원본 바로가기 URL (사용자가 1차 출처로 직접 이동) */
  url: 'https://pace-rise-node.com',
  /** 바로가기 버튼 라벨 */
  linkLabel: 'PaceRise 원본 보기',
  /** 탭/섹션 배지 (한눈에 "PaceRise 연동"임을 표시) */
  badge: 'PaceRise 연동',
  /** 헤더 한 줄 — 무엇을 보고 있는지 (단정·과장 없이 사실만) */
  tagline: 'PaceRise가 운영하는 실업 대회 결과를 가져와 보여드려요.',
  /** 진행 중 대회가 있을 때만 쓰는 상태 인지형 안내 (#실시간 조건부) */
  liveNotice: '지금 진행 중인 대회의 결과를 PaceRise에서 받아 보여드려요.',
  /** 진행 중 대회가 없을 때 — 과장 없이 정직하게 */
  idleNotice: '지금은 진행 중인 대회가 없어요. 진행 중일 때 결과가 여기에 표시돼요.',
  /**
   * 3차 가공 고지. 출처 → PaceRise → AthleteTime 체인을 분명히 한다.
   * 권리 우회 표현이 아니라 "PaceRise 데이터를 다시 정리"한다는 사실을 명시.
   */
  thirdPartyNotice:
    `이 화면의 대회·결과·선수 데이터는 ${BRAND.name}이 직접 모은 게 아니라, PaceRise(${'한국실업육상연맹 오퍼레이터 시스템'})가 운영·집계하는 결과를 가져와 다시 정리해 보여드리는 자료예요. 원본은 PaceRise에서 확인할 수 있어요.`,
  /** 저작권·정확성 고지 */
  rightsNotice:
    '원본 데이터의 권리는 PaceRise와 각 원출처(연맹·협회)에 있어요. 정확한 공식 기록은 각 기관의 공식 채널에서 확인해 주세요.',
} as const;
