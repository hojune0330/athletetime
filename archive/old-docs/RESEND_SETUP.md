# Resend API 키 설정 가이드

## ✅ 완료된 작업
- [x] Resend 가입
- [x] API 키 발급: `re_DSJAhUSQ_3it8EJDUL6Gwn9ffLGAhiiqv`
- [x] 로컬 .env 파일에 추가

## 🚀 Render.com 배포 설정

### Step 1: Render.com 대시보드 접속
https://dashboard.render.com

### Step 2: 백엔드 서비스 선택
"athletetime-backend" 서비스 클릭

### Step 3: Environment 탭으로 이동
좌측 메뉴에서 **Environment** 클릭

### Step 4: 환경 변수 추가
**"Add Environment Variable"** 버튼 클릭 후:

```
Key:   RESEND_API_KEY
Value: re_DSJAhUSQ_3it8EJDUL6Gwn9ffLGAhiiqv
```

### Step 5: 저장 및 재배포
- **Save Changes** 클릭
- 자동으로 재배포 시작 (2-3분 소요)

### Step 6: 배포 확인
"Logs" 탭에서 다음 메시지 확인:
```
✅ 서버: http://localhost:3005
📊 PostgreSQL: 연결됨
🌥️  Cloudinary: dedmfxtpa
📡 WebSocket: 활성화
```

⚠️ 이전에 나타났던 "RESEND_API_KEY가 설정되지 않았습니다" 경고가 **사라져야** 합니다!

## 🧪 테스트 방법

### 프론트엔드에서 테스트:
1. https://athlete-time.netlify.app/community/register 접속
2. 이메일, 비밀번호, 닉네임 입력
3. **회원가입** 버튼 클릭
4. 📧 이메일에서 6자리 인증 코드 확인
5. 코드 입력하여 인증 완료

## 📧 Resend 대시보드
- 발송된 이메일 확인: https://resend.com/emails
- API 키 관리: https://resend.com/api-keys

## 💡 참고사항

### 이메일 발신자 주소
현재 설정: `onboarding@resend.dev` (Resend 테스트 도메인)

**나중에 커스텀 도메인 사용하려면:**
1. Resend에서 도메인 추가 (예: athletetime.com)
2. DNS 레코드 설정
3. `.env` 파일의 `EMAIL_FROM` 변경

### 무료 플랜 제한
- 월 3,000통
- 테스트 도메인 사용 시 일부 이메일 서비스에서 스팸 처리 가능
- 프로덕션에서는 커스텀 도메인 권장

---

작성일: 2025-10-30
