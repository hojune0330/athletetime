/**
 * +=======================================================================+
 * |  AthleTime DATA POLICY & LEGAL COMPLIANCE FRAMEWORK v3.0.0           |
 * |  데이터 정책 및 법적 준수 프레임워크                                       |
 * +=======================================================================+
 * 
 * 최종 수정: 2026-03-18
 * 
 * =========================================================================
 * 1. 법적 배경 (LEGAL BACKGROUND)
 * =========================================================================
 * 
 * [저작권법 제93조 - 데이터베이스제작자의 권리]
 * - 대한육상연맹(KAAF)은 대회 일정 데이터베이스의 제작자로서,
 *   전부 또는 상당한 부분의 복제/배포/방송/전송 권리를 보유합니다.
 * - 개별 소재(각 대회의 이름, 날짜 등)는 그 자체로 보호 대상이 아니나,
 *   반복적/체계적 복제는 상당한 부분의 복제로 간주될 수 있습니다.
 *   (저작권법 제93조 제2항 단서)
 * 
 * [부정경쟁방지법 제2조 제1호 (카)목 - 데이터 부정사용]
 * - 업으로서 제공되는 데이터를 부정하게 취득/사용하는 행위는
 *   부정경쟁행위에 해당할 수 있습니다.
 * 
 * [부정경쟁방지법 제2조 제1호 (파)목 - 성과물 도용]
 * - 다만, 서울동부지법 2021카합10019 결정에 따르면,
 *   스포츠 경기의 기록은 "과거의 사실적인 정보"로서
 *   누구나 자유롭게 이용할 수 있는 공공영역(public domain)에 해당합니다.
 * - 이를 활용한 해설/강의/분석 등 새로운 창작물 제작은
 *   성과물 도용에 해당하지 않을 가능성이 높습니다.
 * 
 * [저작권법 제35조의5 - 공정한 이용]
 * - 이용 목적/성격, 저작물의 종류/용도, 이용 비중, 시장 영향을
 *   종합적으로 고려하여 공정이용 여부를 판단합니다.
 * 
 * =========================================================================
 * 2. AthleTime의 포지셔닝 (POSITIONING)
 * =========================================================================
 * 
 * AthleTime은 공식 데이터의 "재배포 플랫폼"이 아닙니다.
 * AthleteTime은 공개 경기기록을 색인하고 정리하는 비공식 기록 탐색 서비스입니다.
 * 
 * 핵심 차별화:
 * - 원본 데이터를 단순 복제/재게시하지 않습니다
 * - 카드뉴스, 인포그래픽, 프로필 카드 등 독자적 창작물을 생성합니다
 * - 원본 데이터는 창작 과정의 "참고 자료"로만 활용됩니다
 * - 최종 산출물은 원본과 본질적으로 다른 새로운 저작물입니다
 * 
 * =========================================================================
 * 3. 데이터 사용 원칙 (DATA USAGE PRINCIPLES)
 * =========================================================================
 * 
 * [원칙 1: 사실 정보의 참조]
 * 대회명, 일자, 장소 등 사실적 정보(factual information)는
 * 공공영역에 속하는 정보로서 참조합니다.
 * 
 * [원칙 2: 창작적 변환 (Transformative Use)]
 * 모든 산출물은 원본 데이터에 실질적인 창작적 가치를 추가합니다.
 * 
 * [원칙 3: 출처 존중]
 * 사실 정보의 원출처(KAAF)를 항상 명시합니다.
 * 
 * [원칙 4: 데이터 정확성]
 * 참조하는 사실 정보는 정확해야 합니다. 창작/추측/왜곡 금지.
 * 
 * [원칙 5: 최소 필요 원칙]
 * 콘텐츠 제작에 필요한 최소한의 정보만 참조합니다.
 * 
 * [원칙 6: 검증 가능성]
 * kaafUrl을 통해 원본 확인 경로를 제공합니다.
 * 
 * =========================================================================
 * 4. 금지 사항 (PROHIBITED ACTIONS)
 * =========================================================================
 * 
 * - 원본 데이터의 단순 복제/재배포
 * - KAAF 데이터베이스의 체계적 미러링
 * - 원본을 대체하는 형태의 데이터 서비스 제공
 * - 사실 정보의 창작(fabrication) 또는 왜곡
 * - 데이터 누락, 건너뛰기, 선택적 무시
 * - 원본에 없는 데이터의 임의 생성
 * - 공식 데이터를 AthleTime 자체 데이터인 것처럼 표시
 * 
 * =========================================================================
 * 5. 개인정보 보호 (PERSONAL DATA PROTECTION)
 * =========================================================================
 * 
 * [선수 기록 데이터의 성격]
 * - 선수명, 소속, 경기 기록 = 공개 대회 결과 (공적 정보)
 * - 개인정보보호법 제2조 정보주체의 동의 관련:
 *   공개된 대회 기록은 정보주체가 공개에 동의한 것으로 볼 수 있음
 * - 다만, 프로필 카드 등에서의 사진 사용은 별도 동의 필요
 * 
 * [보호 조치]
 * - 검색 API에 rate-limit 적용 (분당 30회)
 * - 대량 다운로드/자동화된 수집 방지
 * - 민감 정보 (생년월일, 연락처 등) 미수집/미저장
 * - 시스템 내부 정보 비공개 (관리자 전용)
 * 
 * =========================================================================
 */

// Data Policy version - increment when policy changes
const DATA_POLICY_VERSION = '3.0.0';
const DATA_POLICY_DATE = '2026-03-18';

/**
 * 데이터 사용 유형 분류
 */
const DATA_USAGE_TYPE = {
  // 사실 정보 참조 (공공영역) - 허용
  FACTUAL_REFERENCE: 'factual_reference',
  
  // 창작적 변환 (카드뉴스, 인포그래픽 등) - 허용 & 권장
  TRANSFORMATIVE_CREATION: 'transformative_creation',
  
  // 단순 복제/재배포 - 금지
  DIRECT_REPRODUCTION: 'direct_reproduction',
  
  // 체계적 미러링 - 금지  
  SYSTEMATIC_MIRRORING: 'systematic_mirroring',
};

/**
 * 콘텐츠 유형별 법적 위험도
 */
const CONTENT_RISK_LEVEL = {
  LOW: 'low',       // 독자적 디자인의 카드뉴스, 프로필 카드 등
  MEDIUM: 'medium', // 사실 정보를 포함한 일정표, 결과표
  HIGH: 'high',     // 원본 데이터의 대규모 노출, 데이터베이스 구조 복제
};

/**
 * 접근 제어 정책
 */
const ACCESS_CONTROL = {
  // 공개 기능 (누구나 접근 가능)
  PUBLIC: {
    pages: ['profile-card-wizard.html', 'profile-card-modular.html', 'profile-card-v2.html'],
    apis: [
      'GET /api/search',
      'GET /api/search/competitions',
      'GET /api/profile-card/search',
      'POST /api/profile-card/generate',
      'GET /api/profile-card/templates',
      'GET /api/profile-card/layouts',
      'GET /api/profile-card/presets',
      'GET /api/profile-card/presets/:id/options',
      'POST /api/profile-card/generate-modular',
      'POST /api/profile-card/preview-html',
      'GET /api/competitions',
      'GET /api/competitions/current',
      'GET /api/competitions/calendar',
      'GET /api/competitions/:id',
      'GET /api/data-policy',
    ],
    rateLimits: {
      search: '30/min',
      generate: '5/min',
      competition: '60/min',
      general: '60/min',
    },
    description: '프로필 카드 제작, 모듈러 빌더, 대회 정보 조회, 검색',
  },
  
  // 관리자 전용 (인증 필요)
  ADMIN: {
    pages: ['index.html', 'admin.html'],
    apis: [
      'GET /api/status',
      'GET /api/system/info',
      'GET /api/gallery',
      'DELETE /api/gallery/:filename',
      'POST /api/pipeline/run',
      'GET /api/pipeline/status',
      'GET /api/pipeline/history',
      'POST /api/watcher/start',
      'POST /api/watcher/stop',
      // ... (32개 전체)
    ],
    rateLimits: null, // 관리자는 무제한
    description: '대시보드, 창작 콘텐츠 제작, 시스템 관리, 히스토리',
  },
};

/**
 * 면책 조항 텍스트
 */
const DISCLAIMER = {
  short: 'AthleTime은 육상 콘텐츠 창작 도구입니다. 공식 정보는 kaaf.or.kr에서 확인하세요.',
  
  full: `AthleTime은 육상 경기 정보를 기반으로 창작 콘텐츠(카드뉴스, 인포그래픽, 프로필 카드 등)를 
제작하는 도구입니다. 대회 일정 등 사실 정보는 대한육상연맹(KAAF) 공식 웹사이트(kaaf.or.kr)를 
참고하였으며, AthleTime이 제작하는 시각 콘텐츠는 독자적 창작물입니다. 
공식 정보 확인은 kaaf.or.kr을 이용해 주시기 바랍니다.`,
  
  legal: `본 서비스는 대한육상연맹(KAAF)의 공식 서비스가 아니며, 연맹과 제휴/협력 관계에 있지 않습니다.
대회명/일자/장소 등 사실적 정보(factual information)는 공공영역에 속하는 정보로서 참고 목적으로 
활용하며, 본 서비스에서 생성되는 카드뉴스/인포그래픽/프로필 카드 등 시각 콘텐츠는 
원본 데이터에 창작적 가치를 추가한 독자적 저작물입니다.
정확한 대회 정보는 대한육상연맹 공식 웹사이트(https://www.kaaf.or.kr)에서 확인하시기 바랍니다.`,

  // 생성 이미지에 표시되는 크레딧
  imageCredit: 'Created by AthleTime | Data ref: KAAF (kaaf.or.kr)',
  
  // API 응답에 포함되는 데이터 출처 고지
  apiNotice: '이 데이터는 공개 경기기록 탐색 워크플로우를 위한 참고 자료입니다. 공식 기록 서비스가 아닙니다.',
};

/**
 * 관련 법령 참조
 */
const LEGAL_REFERENCES = [
  {
    law: '저작권법 제93조',
    title: '데이터베이스제작자의 권리',
    summary: '데이터베이스의 전부 또는 상당한 부분의 복제등에 대한 권리',
    relevance: '대회 목록 전체의 체계적 복제 시 해당 가능'
  },
  {
    law: '저작권법 제93조 제2항 단서',
    title: '반복적/체계적 복제',
    summary: '소량이라도 반복적/체계적으로 하면 상당한 부분 복제로 간주',
    relevance: '자동화된 데이터 수집의 반복적 수행 시 위험'
  },
  {
    law: '저작권법 제93조 제4항',
    title: '소재 자체 비보호',
    summary: '데이터베이스의 구성부분이 되는 소재 그 자체에는 보호가 미치지 않음',
    relevance: '개별 대회의 이름/날짜/장소는 사실 정보로서 자유 이용 가능'
  },
  {
    law: '저작권법 제35조의5',
    title: '저작물의 공정한 이용',
    summary: '이용 목적/성격, 저작물 종류/용도, 비중, 시장 영향 종합 고려',
    relevance: '창작 콘텐츠 제작 목적은 공정이용 해당 가능성 높음'
  },
  {
    law: '부정경쟁방지법 제2조 제1호 (파)목',
    title: '성과물 도용',
    summary: '타인의 성과를 부정하게 사용하는 행위',
    relevance: '서울동부지법 2021카합10019: 스포츠 기록은 공공영역'
  },
  {
    law: '대법원 2024.4.16. 2023도17354',
    title: '데이터베이스 무단 복제 형사 판결',
    summary: '양적/질적으로 상당한 부분 복제 시 저작권법 위반',
    relevance: '전체 대회 목록의 무단 복제/배포는 위험'
  },
  {
    law: '개인정보보호법 제2조',
    title: '개인정보의 정의 및 보호',
    summary: '살아 있는 개인에 관한 정보로서 개인을 알아볼 수 있는 정보',
    relevance: '선수명+소속+기록은 공개 대회 결과이나, 프로필 사진 등은 별도 동의 필요'
  }
];

module.exports = {
  DATA_POLICY_VERSION,
  DATA_POLICY_DATE,
  DATA_USAGE_TYPE,
  CONTENT_RISK_LEVEL,
  ACCESS_CONTROL,
  DISCLAIMER,
  LEGAL_REFERENCES,
};
