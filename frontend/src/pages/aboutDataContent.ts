type CollectionMethod = {
  readonly title: string;
  readonly badge: string;
  readonly body: string;
  readonly examples: readonly string[];
};

type ProcessingStep = {
  readonly title: string;
  readonly body: string;
};

type LedgerField = {
  readonly label: string;
  readonly body: string;
};

type LicenseType = {
  readonly type: string;
  readonly condition: string;
  readonly serviceUse: string;
};

type Boundary = {
  readonly title: string;
  readonly body: string;
};

export const COLLECTION_METHODS: readonly CollectionMethod[] = [
  {
    title: '공식 제공 파일',
    badge: 'PDF·엑셀·첨부파일',
    body: '대회 결과표처럼 기관이나 대회 운영자가 공개로 올린 파일을 내려받고, 원본 파일 자체가 아니라 경기 사실만 추출해 정리합니다.',
    examples: ['대회 결과 PDF', '대회별 엑셀 결과표', '공지 첨부파일'],
  },
  {
    title: '공공데이터',
    badge: 'data.go.kr',
    body: '공공데이터포털처럼 이용조건이 명시된 데이터는 라이선스를 확인한 뒤 통계와 검증용 자료로 사용합니다.',
    examples: ['선수등록 익명 통계', '연도·시도·종목별 분포', '소속/종별 거시통계'],
  },
  {
    title: '공개 웹 자료',
    badge: '허용 구역만',
    body: '공개 페이지는 robots.txt와 이용조건을 확인하고, 차단·로그인·관리자 영역은 수집하지 않습니다.',
    examples: ['공개 대회 일정', '공개 보도자료', '공개 기록조회 화면의 항목명'],
  },
  {
    title: '보유 기록 재정리',
    badge: '사실 재구성',
    body: '이미 보유한 경기 결과는 원본 페이지를 복제하지 않고, 선수명·소속·기록·대회명 같은 경기 사실 중심으로 다시 정리합니다.',
    examples: ['종목명 정규화', '기록값 변환', '부별 최고기록 재계산'],
  },
] as const;

export const DATA_PROCESSING_STEPS: readonly ProcessingStep[] = [
  { title: '1. 원출처 기록', body: '기관명, 파일명, 다운로드 주소, 게시일, 수집일, 이용조건을 먼저 남깁니다.' },
  { title: '2. 경기 사실 추출', body: '대회명, 일자, 장소, 부별, 종목, 선수명, 소속, 기록, 풍속, 순위처럼 결과를 설명하는 필드만 추출합니다.' },
  { title: '3. 정규화', body: '남고부·남자고등학교부·13 코드처럼 다르게 적힌 표현을 내부 기준으로 맞춥니다.' },
  { title: '4. 파생 집계', body: '원자료를 기준으로 부별 최고기록, 시즌 최고기록, 종목별 기록 흐름을 다시 계산합니다.' },
  { title: '5. 대조와 보정', body: '공식 집계표가 있으면 그대로 베끼지 않고, 우리 계산 결과와 차이를 확인하는 기준으로 씁니다.' },
  { title: '6. 출처와 함께 표시', body: '화면에는 “공식 공개자료 기반 · AthleteTime 정리”처럼 원출처와 가공 주체를 함께 표시합니다.' },
] as const;

export const SOURCE_LEDGER_FIELDS: readonly LedgerField[] = [
  { label: '기관명', body: '자료를 공개한 기관이나 대회 운영 주체' },
  { label: '자료명', body: '공지 제목, 대회명, 결과표 제목' },
  { label: '파일명', body: '내려받은 PDF·엑셀·CSV 원본 파일명' },
  { label: '다운로드 주소', body: '원본을 확인할 수 있는 URL 또는 게시글 주소' },
  { label: '게시일', body: '원출처에 표시된 게시·작성일' },
  { label: '수집일', body: 'AthleteTime이 내려받거나 확인한 날짜' },
  { label: '이용조건', body: '공공누리 유형, 공공데이터 이용허락범위, 별도 고지' },
  { label: '해시', body: '나중에 같은 파일인지 확인하기 위한 원본 파일 지문' },
  { label: '추출 필드', body: '대회명, 종목, 부별, 선수명, 소속, 기록 등 실제 사용한 항목' },
] as const;

export const KOGL_LICENSE_TYPES: readonly LicenseType[] = [
  { type: '제1유형', condition: '출처표시', serviceUse: '상업적 이용과 2차 가공이 가능해 서비스 활용에 가장 적합합니다.' },
  { type: '제2유형', condition: '출처표시 + 상업적 이용금지', serviceUse: '비영리 안내나 내부 참고 중심으로 사용하고, 영리 화면 적용은 피합니다.' },
  { type: '제3유형', condition: '출처표시 + 변경금지', serviceUse: '원문을 바꾸지 않는 링크·인용 중심으로 다룹니다. 재가공 자료의 근거로 쓰기 어렵습니다.' },
  {
    type: '공공누리 4유형',
    condition: '출처표시 + 상업적 이용금지 + 변경금지',
    serviceUse: '가장 제한적입니다. 원본 재배포나 가공 데이터화는 피하고, 사실 확인용 근거와 원문 링크 중심으로만 다룹니다.',
  },
] as const;

export const DATA_USE_BOUNDARIES: readonly Boundary[] = [
  { title: '원본 파일을 대신 배포하지 않아요', body: '원본 PDF·엑셀은 출처 확인용으로 기록하고, 서비스 화면에는 추출·정규화한 경기 사실만 보여줍니다.' },
  { title: '공식 인증처럼 보이지 않게 해요', body: '표현은 “공식 공개자료 기반”과 “AthleteTime 정리”를 함께 씁니다.' },
  { title: '제한 출처는 수집하지 않아요', body: 'robots 차단, 로그인, 관리자, 유료·제한 구역은 공개 자료 수집 범위에서 제외합니다.' },
  { title: '정정·비노출 요청을 열어둬요', body: '원자료에 있더라도 당사자 요청이나 오류 제보가 있으면 접수번호 기반으로 검토합니다.' },
] as const;
