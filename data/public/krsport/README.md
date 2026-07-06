# 공공데이터 — 대한체육회 선수등록정보 (data.go.kr/15052695)

이 디렉토리는 **공공데이터포털 "대한체육회_선수등록정보"** 데이터셋의 ingestion 위치입니다.

## 출처

- **제공기관**: 대한체육회
- **포털**: 공공데이터포털 (data.go.kr)
- **데이터셋 ID**: 15052695
- **URL**: https://www.data.go.kr/data/15052695/fileData.do
- **라이선스**: 이용허락범위 제한 없음 (영리 이용 가능)
- **갱신주기**: 연 1회
- **행수**: 약 3,495,371

## 필드 (컬럼)

| 한글 컬럼 | 내부 키 | 비고 |
|---|---|---|
| 등록년도 | year | |
| 성별 | gender | |
| 종별 | category | |
| 종목 | sport | |
| 세부종목 | event | |
| 소속 | team | |
| 소속구분 | teamType | |
| 소속세부구분 | teamSubType | |
| 시도 | region | |

> **중요**: 이 데이터셋에는 개인식별정보(이름·개인번호·생년월일)가 **없습니다**.
> 따라서 동일인 식별이 아니라 **익명 거시통계**(연도별/시도별/종목별 분포) 전용입니다.
> 공란은 "미집계"로 처리됩니다.

## ingestion 방법 (키 불필요 — CSV 우선)

1. 위 URL 접속 → **다운로드(CSV, ZIP)** 클릭 (무로그인 가능).
2. ZIP 압축 해제.
3. 추출된 CSV 파일을 이 디렉토리에 **`athlete-registry.csv`** 이름으로 배치.
   ```
   data/public/krsport/athlete-registry.csv
   ```
4. 인코딩이 CP949(EUC-KR)면 UTF-8 로 변환 후 배치:
   ```bash
   iconv -f CP949 -t UTF-8 원본.csv > athlete-registry.csv
   ```
   (헤더 매핑이 0개로 나오면 인코딩 문제일 가능성이 큼 → `publicDataService.getStatus()` 의 `reason: 'header_unmatched'` 확인.)

## Open API (선택 — 활용신청 키 필요)

Open API(XML/JSON) 정식 연동은 data.go.kr 활용신청으로 **인증키**를 받아야 하며,
별도 단계(S4 이후)에서 추가합니다. 현재 골격(S1)은 **키 없이 CSV 만으로** 동작합니다.

## 동작 보장

- CSV 파일이 없으면 `publicDataService` 는 `available:false` 와 ingestion 안내를 반환하며,
  **예외를 던지지 않습니다**(graceful fallback). 기존 서비스에 영향이 없습니다.
