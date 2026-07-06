const DATA_RIGHTS_POLICY_VERSION = '2026-06-20';

const SERVICE_POSITIONING = {
  kind: 'public_record_index',
  short: '공개 경기기록을 모아 정리했어요. 공식 기록 서비스는 아니에요.',
  full: 'AthleteTime은 공개된 경기 기록을 색인하고 정리해 보여주는 비공식 기록 탐색 서비스입니다. 공식 기록 서비스, 공식 랭킹, 원본 DB의 대체재가 아닙니다.',
};

const SOURCE_TIERS = [
  { key: 'A', name: 'open_public_data', label: '공공데이터·개방 출처', use: 'allowed' },
  { key: 'B', name: 'public_web_result', label: '공개 웹 경기결과', use: 'conditional' },
  { key: 'C', name: 'restricted_private_source', label: '제한·비공개 출처', use: 'blocked' },
  { key: 'L', name: 'legacy_frozen_source', label: '레거시 보유 출처', use: 'read_only_review' },
];

const FIELD_POLICY = {
  allowed: [
    'athleteName',
    'team',
    'event',
    'record',
    'rank',
    'competitionName',
    'date',
    'venue',
    'division',
    'phase',
    'wind',
    'sourceUrl',
    'capturedAt',
    'sourceProvider',
    'sourceTier',
  ],
  restricted: [
    'person_no',
    'birthdate',
    'birthDate',
    'phone',
    'email',
    'address',
    'rawExternalId',
    'registrationIdentifier',
  ],
};

const CORRECTION = {
  requestPath: '/data-request',
  label: '정정·비노출 요청',
  notice: '내 기록이 아니거나 빼고 싶다면 정정·비노출을 요청할 수 있어요.',
};

const GENERATED_ORDER_NOTICE = 'AthleteTime이 모은 기록 안에서 빠른 순서예요. 공식 순위가 아니에요.';

const RESPONSE_NOTICE = {
  sourceScope: 'indexed_public_records',
  officialStatus: 'not_official_record_service',
  scopeNotice: SERVICE_POSITIONING.short,
  correctionUrl: CORRECTION.requestPath,
  generatedOrderNotice: GENERATED_ORDER_NOTICE,
};

const PROHIBITED_PUBLIC_CLAIMS = [
  'official_database',
  'official_ranking',
  'complete_national_database',
  'ai_authority',
  'legal_loophole',
  'person_no_storage',
];

function publicResultProvenance({ provider = 'KAAF', sourceId = '', sourceUrl = '', capturedAt = '' } = {}) {
  return {
    provider,
    sourceType: 'public_result',
    sourceTier: 'L',
    sourceId,
    sourceUrl,
    capturedAt,
    sourceLabel: provider === 'KAAF' ? '대한육상연맹 공개 경기결과' : `${provider} 공개 경기결과`,
    scopeNotice: SERVICE_POSITIONING.short,
    correctionUrl: CORRECTION.requestPath,
  };
}

module.exports = {
  DATA_RIGHTS_POLICY_VERSION,
  SERVICE_POSITIONING,
  SOURCE_TIERS,
  FIELD_POLICY,
  CORRECTION,
  GENERATED_ORDER_NOTICE,
  RESPONSE_NOTICE,
  PROHIBITED_PUBLIC_CLAIMS,
  publicResultProvenance,
};
