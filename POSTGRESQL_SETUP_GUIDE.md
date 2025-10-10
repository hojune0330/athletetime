# PostgreSQL 데이터베이스 설정 가이드

## 1단계: PostgreSQL 데이터베이스 생성

### Render 대시보드에서:

1. **New +** 버튼 클릭 (화면 상단 오른쪽)
2. **PostgreSQL** 선택

### 데이터베이스 설정:

```
Name: athletetime-db
Database: athletetimedb  
User: athletetime
Region: Singapore (또는 가까운 지역)
PostgreSQL Version: 15 (또는 최신)
Plan: Free (또는 Starter)
```

3. **Create Database** 클릭

## 2단계: 데이터베이스 연결 정보 확인

생성 완료 후:

1. 생성된 PostgreSQL 데이터베이스 클릭
2. **Connect** 섹션에서 **Internal Database URL** 복사
   - 형식: `postgres://user:password@host:5432/database`

## 3단계: 백엔드 서비스에 DATABASE_URL 추가

### "운동선수 시간" 서비스로 이동:

1. 대시보드에서 **"운동선수 시간"** 서비스 클릭
2. 왼쪽 메뉴에서 **Environment** 클릭
3. **Add Environment Variable** 클릭

### 환경 변수 추가:

```
Key: DATABASE_URL
Value: [복사한 Internal Database URL 붙여넣기]
```

4. **Save Changes** 클릭

## 4단계: package.json 업데이트 확인

현재 `package.json`이 이미 PostgreSQL을 사용하도록 설정되어 있습니다:

```json
{
  "main": "server-postgres.js",
  "dependencies": {
    "pg": "^8.11.0",
    ...
  }
}
```

## 5단계: 서비스 재배포

환경 변수 추가 후 자동으로 재배포됩니다.

### 재배포 상태 확인:
1. **Logs** 탭에서 확인
2. "✅ 데이터베이스 테이블 초기화 완료" 메시지 확인
3. "서버가 포트 XXXX에서 실행 중" 메시지 확인

## ✅ 설정 완료 확인

성공적으로 설정되면:
- 모든 게시글과 댓글이 PostgreSQL에 저장됨
- 채팅 메시지도 영구 저장됨  
- 서버 재시작/재배포해도 데이터 유지
- 더 이상 데이터가 사라지지 않음!

## 🚨 문제 해결

### "DATABASE_URL is not defined" 에러:
- Environment 변수 설정 확인
- Internal Database URL 사용 (External 아님)

### 연결 실패:
- PostgreSQL 서비스가 Active 상태인지 확인
- Region이 백엔드 서비스와 같은지 확인

### 데이터 마이그레이션:
기존 JSON 파일 데이터가 있다면 자동으로 마이그레이션됩니다.

## 📝 참고사항

- **Free PostgreSQL**: 90일 후 삭제될 수 있음
- **Starter PostgreSQL**: 영구 사용 가능, 더 나은 성능
- **백업**: Render 대시보드에서 수동 백업 가능

---

## 다음 단계

1. 위 가이드대로 PostgreSQL 생성
2. DATABASE_URL 환경 변수 추가
3. 서비스 자동 재배포 대기
4. 웹사이트에서 테스트
   - 게시글 작성 → 새로고침 → 유지 확인
   - 채팅 메시지 → 재접속 → 히스토리 확인

완료되면 더 이상 데이터가 사라지지 않습니다! 🎉