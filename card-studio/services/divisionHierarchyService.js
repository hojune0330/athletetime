'use strict';

const GENDER_LABELS = {
  men: '남자',
  women: '여자',
  mixed: '혼성',
  unknown: '성별 구분 없음',
};

const LEVEL_LABELS = {
  all: '전체(부 통합)',
  general: '일반부',
  high: '고등부',
  university: '대학부',
  middle: '중학부',
  elementary: '초등부',
  u20: 'U20',
  u18: 'U18',
  masters: '마스터즈',
  unspecified: '부문 통합·기타',
};

const LEVEL_ORDER = ['all', 'general', 'high', 'university', 'middle', 'elementary', 'u20', 'u18', 'masters', 'unspecified'];
const GENDER_ORDER = ['men', 'women', 'mixed', 'unknown'];
const PUBLIC_SOURCE_DIVISION_PATTERNS = [
  /^(?:남자|여자|혼성)(?:부)?$/u,
  /^(?:(?:남자|여자|혼성)\s*)?(?:일반|실업|대학|고등|고교|중학|초등|마스터즈)(?:학교)?(?:\s*[1-6]\s*학년)?(?:부)?$/u,
  /^(?:남|여)(?:일|대|고|중|초)$/u,
  /^(?:고|중|초)\s*[1-6](?:\s*학년)?(?:부)?$/u,
  /^(?:U(?:18|20)|(?:M|W)(?:A|\d{2})?)$/iu,
  /^(?:통합부|공통|전체|구분\s*미상)$/u,
];

function compact(value) {
  return String(value || '').trim().replace(/\s+/gu, ' ');
}

function normalizeCompact(value) {
  return compact(value).replace(/\s+/gu, '');
}

function toPublicSourceDivisionLabel(value) {
  if (typeof value !== 'string') return null;
  const label = compact(value);
  if (!label || label.length > 40) return null;
  const segments = label.split(/\s*[,/·]\s*/u);
  if (segments.length > 3) return null;
  return segments.every((segment) => (
    segment && PUBLIC_SOURCE_DIVISION_PATTERNS.some((pattern) => pattern.test(segment))
  )) ? label : null;
}

function inferGender(rawLabel) {
  const label = compact(rawLabel);
  const text = normalizeCompact(rawLabel);
  if (!text || /통합부|공통|전체/u.test(text)) return 'unknown';
  const hasMenMarker = /남자|남고|남중|남초|남대|남일/u.test(text);
  const hasWomenMarker = /여자|여고|여중|여초|여대|여일/u.test(text);
  if (/혼성/u.test(text) || /(^|[^a-z])mixed(?=$|[^a-z]|u?\d)/iu.test(label)) return 'mixed';
  if (hasMenMarker && hasWomenMarker) return 'unknown';
  if (/^(M|MA)\d*$/iu.test(text) || /^M\d{2}$/iu.test(text) || hasMenMarker) return 'men';
  if (/^(W|WA)\d*$/iu.test(text) || /^W\d{2}$/iu.test(text) || hasWomenMarker) return 'women';
  return 'unknown';
}

function inferLevel(rawLabel) {
  const text = normalizeCompact(rawLabel);
  if (!text) return 'unspecified';
  if (/^U20$/iu.test(text) || /U20/u.test(text)) return 'u20';
  if (/^U18$/iu.test(text) || /U18/u.test(text)) return 'u18';
  if (/^(M|W)\d{2}$/iu.test(text) || /^(MA|WA)$/iu.test(text) || /마스터즈|Masters?/iu.test(text)) return 'masters';
  if (/일반|실업/u.test(text)) return 'general';
  if (/대학|대학교|남대|여대/u.test(text)) return 'university';
  if (/고등|고교|고등학교|남고|여고|^고\d*학년부?$/u.test(text)) return 'high';
  if (/중학|중학교|남중|여중|^중\d*학년부?$/u.test(text)) return 'middle';
  if (/초등|초등학교|남초|여초|^초\d*학년부?$/u.test(text)) return 'elementary';
  return 'unspecified';
}

function detailOf(rawLabel, level) {
  const label = compact(rawLabel);
  if (!label) return null;
  if (level === 'masters' && /^(M|W)\d{2}$/iu.test(label)) return label.toUpperCase();
  if (/학년/u.test(label)) return label;
  return null;
}

function optionLabel(gender, level) {
  const genderLabel = GENDER_LABELS[gender] || GENDER_LABELS.unknown;
  const levelLabel = LEVEL_LABELS[level] || LEVEL_LABELS.unspecified;
  if (gender === 'unknown' && level === 'unspecified') return '부문 정보 없음';
  if (gender === 'unknown') return `${levelLabel} (성별 구분 없음)`;
  if (level === 'unspecified') return `${genderLabel} (세부부문 없음)`;
  return `${genderLabel} ${levelLabel}`;
}

function normalizeDivision(rawLabel) {
  const rawDivision = compact(rawLabel);
  const gender = inferGender(rawDivision);
  const divisionLevel = inferLevel(rawDivision);
  const divisionDetail = detailOf(rawDivision, divisionLevel);
  return {
    gender,
    divisionLevel,
    divisionKey: `${gender}-${divisionLevel}`,
    divisionLabel: optionLabel(gender, divisionLevel),
    divisionDetail,
    rawDivision,
  };
}

function rollupKeyForGender(gender) {
  return `${gender || 'unknown'}-all`;
}

function rollupOptionForGender(gender) {
  return {
    key: rollupKeyForGender(gender),
    label: optionLabel(gender, 'all'),
    gender,
    level: 'all',
  };
}

function optionFromMeta(meta) {
  return {
    key: meta.divisionKey,
    label: meta.divisionLabel,
    gender: meta.gender,
    level: meta.divisionLevel,
  };
}

function optionSort(a, b) {
  const genderDiff = GENDER_ORDER.indexOf(a.gender) - GENDER_ORDER.indexOf(b.gender);
  if (genderDiff !== 0) return genderDiff;
  const levelDiff = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
  if (levelDiff !== 0) return levelDiff;
  return a.label.localeCompare(b.label);
}

function buildDivisionFilters(divisionMetaByKey) {
  const present = [...divisionMetaByKey.values()];
  const genders = [...new Set(present.map((meta) => meta.gender).filter(Boolean))];
  const orderedGenders = GENDER_ORDER.filter((gender) => genders.includes(gender));
  const options = [];
  for (const gender of orderedGenders) {
    for (const level of LEVEL_ORDER.filter((item) => item !== 'all')) {
      const existing = present.find((meta) => meta.gender === gender && meta.divisionLevel === level);
      if (existing || level !== 'unspecified') {
        options.push(existing ? optionFromMeta(existing) : {
          key: `${gender}-${level}`,
          label: optionLabel(gender, level),
          gender,
          level,
        });
      }
    }
  }

  return {
    divisions: options.sort(optionSort),
    genderOptions: orderedGenders.map((gender) => ({ key: gender, label: GENDER_LABELS[gender] })),
    levelOptions: LEVEL_ORDER
      .filter((level) => level !== 'all')
      .map((level) => ({ key: level, label: LEVEL_LABELS[level] })),
  };
}

module.exports = {
  LEVEL_ORDER,
  GENDER_ORDER,
  normalizeDivision,
  toPublicSourceDivisionLabel,
  rollupKeyForGender,
  rollupOptionForGender,
  buildDivisionFilters,
};
