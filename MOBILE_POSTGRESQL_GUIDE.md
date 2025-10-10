# 📱 모바일에서 PostgreSQL 데이터베이스 만들기

## 🔗 가장 빠른 방법: 직접 링크

아래 링크를 클릭하거나 브라우저에 복사/붙여넣기:

```
https://dashboard.render.com/new/database
```

## 📝 PostgreSQL 설정값

데이터베이스 생성 페이지에서:

### 필수 입력 항목:
- **Name**: `athletetime-db`
- **Database**: `athletetimedb` (자동 입력됨)
- **User**: `athletetime` (자동 입력됨)

### 선택 항목 (기본값 사용):
- **Region**: Singapore (또는 가장 가까운 곳)
- **PostgreSQL Version**: 15
- **Datadog API Key**: 비워두기
- **Plan**: Free

### ✅ Create Database 버튼 클릭

---

## 🔧 생성 후 설정

### 1단계: 연결 정보 복사

PostgreSQL 생성 완료되면:

1. 생성된 데이터베이스 이름 클릭
2. 스크롤 내려서 **Connection** 섹션 찾기
3. **Internal Database URL** 옆 복사 버튼 클릭
   - ⚠️ External 말고 **Internal** 복사!

URL 형태:
```
postgres://athletetime:비밀번호@dpg-xxxxx/athletetimedb
```

### 2단계: 백엔드 서비스에 연결

1. Render 대시보드로 돌아가기
2. **"운동선수 시간"** 서비스 클릭
3. **Environment** 탭 찾기 (모바일에서는 스크롤 필요)
4. **Add Environment Variable** 버튼

입력:
```
Key: DATABASE_URL
Value: [복사한 Internal URL 붙여넣기]
```

5. **Save Changes** 클릭

---

## 📱 모바일 팁

### 화면이 잘 안 보일 때:
- 두 손가락으로 확대/축소
- 가로 모드로 전환
- 데스크톱 모드 활성화

### 복사/붙여넣기 팁:
- URL 길게 누르면 전체 선택
- 복사 후 메모장에 임시 저장 추천
- 환경 변수 추가 시 정확히 붙여넣기

---

## 🚨 문제 해결

### "Create Database" 버튼이 안 보임:
- 페이지 아래로 스크롤
- 화면 확대/축소 조정
- 데스크톱 모드 전환

### 환경 변수 저장 안 됨:
- Key와 Value 모두 입력했는지 확인
- Save Changes 버튼 클릭 확인
- 페이지 새로고침 후 재시도

---

## ✅ 완료 확인

설정 성공하면:
1. 백엔드가 자동 재배포됨 (2-3분)
2. Logs에서 "데이터베이스 초기화 완료" 메시지
3. 웹사이트에서 테스트:
   - 게시글 작성 → 새로고침 → 유지되는지 확인
   - 채팅 메시지도 영구 저장 확인

---

## 💡 추가 도움

PC 접속이 가능하다면:
- PC에서 설정하는 것이 더 편합니다
- 또는 태블릿 사용 추천

모바일에서 막히면:
1. 스크린샷 찍어서 보내주세요
2. 어느 단계인지 알려주세요
3. 함께 해결해드립니다!