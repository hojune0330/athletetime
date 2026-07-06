'use strict';

const { URL } = require('url');
const { isBlockedCollectionHost } = require('../../lib/crawlPolicy');

const KAAF_ORIGIN = 'https://kaaf.or.kr';
const RECORDSPORT_PAGE = `${KAAF_ORIGIN}/ver3/info/recordsport.asp?tn=tblRecordSports`;

const ACTIONS = Object.freeze({
  BLOCKED: 'blocked',
  DOWNLOAD_FILE: 'download_file',
  FETCH_REFERENCE_TABLE: 'fetch_reference_table',
  LEGACY_RELEDGER: 'legacy_reledger',
  PUBLIC_DATA_IMPORT: 'public_data_import',
});

const REVIEW_STATUSES = Object.freeze({
  BLOCKED: 'blocked',
  CANDIDATE_REVIEW: 'candidate_review',
});

const DATA_GO_KR_DATASETS = Object.freeze([
  {
    datasetId: '15052695',
    title: '대한체육회_스포츠지원포털_선수등록정보',
    sourceUrl: 'https://www.data.go.kr/data/15052695/fileData.do',
    rowCountHint: 3495371,
    note: '선수 등록년도, 성별, 종별, 종목, 세부종목, 소속, 시도 등 거시통계 후보.',
    internalKeyPolicy: '개인번호·이름·생년월일 없음. 익명 통계 우선.',
  },
  {
    datasetId: '15052686',
    title: '대한체육회_종목별 경기운영정보(경기참가자정보)',
    sourceUrl: 'https://www.data.go.kr/data/15052686/fileData.do',
    rowCountHint: 123259,
    note: '대회연도, 대회명, 종목, 팀/시도, 성별, 종별, 학년, 시작일, 웹주소 후보.',
    internalKeyPolicy: '아이디와 키값은 고유 식별자 성격이므로 공개 식별자로 노출 금지.',
  },
  {
    datasetId: '15052687',
    title: '대한체육회_종목별_경기운영정보(경기결과및기록)',
    sourceUrl: 'https://www.data.go.kr/data/15052687/fileData.do',
    rowCountHint: 378683,
    note: '종목명, 종별명, 세부종목명, 대회명, 기간, 장소, 대회구분, 성별 등 결과/기록 후보.',
    internalKeyPolicy: '아이디는 내부용 값이며 표준화되지 않았으므로 공개 식별자로 노출 금지.',
  },
  {
    datasetId: '3072953',
    title: '대한체육회_종목별 일반개요 및 체육정보',
    sourceUrl: 'https://www.data.go.kr/data/3072953/fileData.do',
    rowCountHint: 13612,
    note: '대회 설명, 종목단체, 개최단체, 시작/종료일, 개최지, 홈페이지, 자료바로가기 후보.',
    internalKeyPolicy: '일정/자료 링크 보강용. 개인 식별 연결에 사용하지 않음.',
  },
]);

const RECORDSPORT_FILES = Object.freeze([
  '남자기록최종.xlsx',
  '여자기록최종.xlsx',
  '남자기록(0).xlsx',
  '여자기록(0).xlsx',
  '종합기록.pdf',
  '개인구간기록.xlsx',
  '종합순위.hwp',
]);

const REFERENCE_PAGES = Object.freeze([
  {
    priorityBatch: 'C',
    title: 'KAAF 부별기록',
    sourceUrl: `${KAAF_ORIGIN}/ver3/info/divisional.asp`,
    formFields: { ddlGjong: ['11', '12', '13', '14', '15', '21', '22', '23', '24', '25'] },
  },
  {
    priorityBatch: 'C',
    title: 'KAAF 한국·아시아·세계기록',
    sourceUrl: `${KAAF_ORIGIN}/ver3/info/country.asp?gubun=1`,
    formFields: { gubun: ['1', '4', '2', '3', '0', '5'] },
  },
  {
    priorityBatch: 'D',
    title: 'KAAF 부별·종별 TOP기록',
    sourceUrl: `${KAAF_ORIGIN}/ver3/info/top.asp`,
    formFields: {
      txtFromDT: '2000-01-01',
      txtToDT: 'current-date',
      ddlGjong: ['10', '11', '12', '13', '14', '15', '20', '21', '22', '23', '24', '25'],
      ddlGjmokPilot: ['11', '12', '13', '14', '16', '18', '19', '1C', '1D', '21', '23', '25', '62'],
      strQueryCnt: '10',
    },
  },
  {
    priorityBatch: 'D',
    title: 'KAAF 년도별최고기록변천사',
    sourceUrl: `${KAAF_ORIGIN}/ver3/info/year.asp`,
    formFields: { ddlGjong: ['10', '11', '12', '13', '14', '15', '20', '21', '22', '23', '24', '25'] },
  },
  {
    priorityBatch: 'D',
    title: 'KAAF 한국기록변천사',
    sourceUrl: `${KAAF_ORIGIN}/ver3/info/korea.asp`,
    formFields: { gjong: ['1', '2'], gjmok: ['단거리', '중거리', '장거리', '도약', '투척', '허들', '혼성'] },
  },
  {
    priorityBatch: 'D',
    title: 'KAAF 년도별기록현황',
    sourceUrl: `${KAAF_ORIGIN}/ver3/info/status.asp`,
    formFields: {},
  },
]);

function extensionOf(filename) {
  const match = String(filename).match(/\.([^.]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

function dataCandidate(dataset) {
  return {
    inventoryId: `data-go-kr-${dataset.datasetId}`,
    provider: '공공데이터포털',
    sourceClass: 'public_data_file',
    collectionAction: ACTIONS.PUBLIC_DATA_IMPORT,
    reviewStatus: REVIEW_STATUSES.CANDIDATE_REVIEW,
    priorityBatch: 'A',
    licenseGuess: '이용허락범위 제한 없음',
    robotsPosture: 'official_distribution',
    downloaded: false,
    privacyPosture: { exposesInternalKeysPublicly: false, policy: dataset.internalKeyPolicy },
    ...dataset,
  };
}

function recordsportCandidate(filename) {
  const downloadUrl = new URL(`/DATA/recordsport/${filename}`, KAAF_ORIGIN).toString();
  return {
    inventoryId: `kaaf-recordsport-${Buffer.from(filename).toString('base64url')}`,
    provider: '대한육상연맹',
    sourceClass: 'public_official_attachment',
    collectionAction: ACTIONS.DOWNLOAD_FILE,
    reviewStatus: REVIEW_STATUSES.CANDIDATE_REVIEW,
    priorityBatch: 'B',
    title: `생활체육기록 첨부파일 - ${filename}`,
    sourceUrl: RECORDSPORT_PAGE,
    downloadUrl,
    originalFilename: filename,
    extension: extensionOf(filename),
    licenseGuess: 'unknown_kaaf_public_attachment',
    robotsPosture: 'allowed_public_path',
    downloaded: false,
    inclusionReason: 'KAAF 공개 기록조회 페이지에 게시된 원본 첨부파일 후보.',
  };
}

function referenceCandidate(page) {
  return {
    inventoryId: `kaaf-reference-${page.sourceUrl.split('/').pop().replace(/[^a-z0-9]+/gi, '-')}`,
    provider: '대한육상연맹',
    sourceClass: 'public_reference_table',
    collectionAction: ACTIONS.FETCH_REFERENCE_TABLE,
    reviewStatus: REVIEW_STATUSES.CANDIDATE_REVIEW,
    licenseGuess: 'unknown_kaaf_public_reference',
    robotsPosture: 'allowed_public_path',
    downloaded: false,
    usePosture: 'reference_and_quality_check_only',
    ...page,
  };
}

function blockedCandidate(rawUrl, blockReason = 'ROBOTS_DISALLOW_ALL') {
  return {
    inventoryId: `blocked-${Buffer.from(String(rawUrl)).toString('base64url')}`,
    provider: '대한육상연맹',
    sourceClass: 'blocked_source',
    collectionAction: ACTIONS.BLOCKED,
    reviewStatus: REVIEW_STATUSES.BLOCKED,
    sourceUrl: String(rawUrl),
    blockReason,
    robotsPosture: 'disallow_all',
    downloaded: false,
  };
}

function candidateForUrl(rawUrl) {
  if (isBlockedCollectionHost(rawUrl)) return blockedCandidate(rawUrl);
  return {
    inventoryId: `candidate-${Buffer.from(String(rawUrl)).toString('base64url')}`,
    provider: new URL(String(rawUrl)).hostname,
    sourceClass: 'candidate_source',
    collectionAction: 'candidate_review',
    reviewStatus: REVIEW_STATUSES.CANDIDATE_REVIEW,
    sourceUrl: String(rawUrl),
    robotsPosture: 'not_blocked_by_static_policy',
    downloaded: false,
  };
}

function allCandidates() {
  return [
    ...DATA_GO_KR_DATASETS.map(dataCandidate),
    ...RECORDSPORT_FILES.map(recordsportCandidate),
    ...REFERENCE_PAGES.map(referenceCandidate),
  ];
}

function buildSourceInventory(options = {}) {
  const requestedBatch = options.batch ? String(options.batch).toUpperCase() : null;
  const candidates = options.url
    ? [candidateForUrl(options.url)]
    : allCandidates().filter((candidate) => !requestedBatch || candidate.priorityBatch === requestedBatch);

  return {
    generatedAt: new Date().toISOString(),
    batch: requestedBatch || 'ALL',
    downloaded: candidates.filter((candidate) => candidate.downloaded).length,
    candidates,
  };
}

module.exports = {
  ACTIONS,
  DATA_GO_KR_DATASETS,
  RECORDSPORT_FILES,
  REFERENCE_PAGES,
  REVIEW_STATUSES,
  buildSourceInventory,
  candidateForUrl,
};
