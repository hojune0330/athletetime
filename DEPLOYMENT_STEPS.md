# 🚨 회원가입 시스템 배포 필수 단계

**현재 상태**: ⚠️ **배포 대기 중**

---

## 😓 현재 문제

회원가입을 시도하면 **"Cannot POST /api/auth/register"** 에러가 발생합니다.

### 원인
1. ✅ 코드는 GitHub에 푸시 완료
2. ⏳ **Render.com이 아직 배포하지 않음** (또는 배포 중)
3. ❌ **데이터베이스 마이그레이션 미실행**

---

## ✅ 해결 방법 (3단계)

### 1️⃣ Render.com 재배포 확인 (자동)

**방금 재배포를 트리거했습니다!**

1. Render.com Dashboard 접속: https://dashboard.render.com
2. `athletetime-backend` 서비스 선택
3. "Deploys" 탭에서 배포 상태 확인
4. 배포 완료까지 **약 3-5분** 소요

#### 배포 상태 확인:
```
🟡 Building  → 빌드 중
🟡 Deploying → 배포 중
🟢 Live      → 완료! ✅
```

---

### 2️⃣ 데이터베이스 마이그레이션 실행 (수동 필수!)

**이 단계를 꼭 실행해야 회원가입이 작동합니다!**

#### 방법 A: Render.com Shell 사용 (추천)

1. Render.com Dashboard → `athletetime-backend`
2. **"Shell"** 탭 클릭
3. 다음 명령어 입력:

```bash
npm run db:migrate:auth
```

4. 성공 메시지 확인:
```
✅ Authentication migration completed!
📧 Email authentication system added
🔐 JWT refresh token support added
```

#### 방법 B: 로컬에서 원격 실행

```bash
# DATABASE_URL 환경 변수 설정 필요
export DATABASE_URL="your-postgres-url"
npm run db:migrate:auth
```

---

### 3️⃣ Resend API 키 설정 (필수!)

이메일 인증 코드를 발송하려면 Resend API 키가 필요합니다.

#### Step 1: Resend 가입
1. https://resend.com 접속
2. 무료 계정 생성 (GitHub 로그인 가능)
3. Dashboard → **API Keys** → **Create API Key**
4. API 키 복사 (예: `re_xxxxxxxxxxxxxxxxx`)

#### Step 2: Render.com 환경 변수 설정
1. Render.com Dashboard → `athletetime-backend`
2. **"Environment"** 탭 클릭
3. 다음 환경 변수 추가:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
JWT_SECRET=your-super-secret-jwt-key-change-in-production
EMAIL_FROM=noreply@athletetime.com
EMAIL_FROM_NAME=애슬리트 타임
```

#### Step 3: 서비스 재시작
- 환경 변수 추가 후 자동으로 재시작됩니다
- 또는 "Manual Deploy" → "Deploy latest commit"

---

## 🧪 테스트

모든 단계를 완료한 후 테스트:

### 1. 백엔드 API 테스트
```bash
curl https://athletetime-backend.onrender.com/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test1234",
    "nickname": "테스트"
  }'
```

**기대 응답**:
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다. 이메일로 발송된 인증 코드를 입력해주세요.",
  "user": { ... },
  "requiresVerification": true
}
```

### 2. 프론트엔드 테스트
1. https://athlete-time.netlify.app/register 접속
2. 회원가입 폼 작성
3. "회원가입" 버튼 클릭
4. 이메일로 인증 코드 수신 확인
5. 인증 코드 입력
6. 로그인 성공!

---

## 📊 체크리스트

완료했는지 확인하세요:

- [ ] **1단계**: Render.com 배포 완료 확인
  - Dashboard에서 "Live" 상태 확인
  
- [ ] **2단계**: 데이터베이스 마이그레이션 실행
  - `npm run db:migrate:auth` 실행
  - 성공 메시지 확인
  
- [ ] **3단계**: Resend API 키 설정
  - API 키 발급
  - Render.com 환경 변수 추가
  - 서비스 재시작
  
- [ ] **테스트**: 회원가입 테스트
  - 프론트엔드에서 회원가입 시도
  - 이메일 수신 확인
  - 인증 완료

---

## 🔍 문제 해결

### Q: "Cannot POST /api/auth/register" 에러가 계속 나요

**A**: Render.com 배포가 완료되지 않았습니다.
1. Dashboard → Deploys 탭 확인
2. 최신 배포가 "Live" 상태인지 확인
3. 배포 로그에서 에러 확인

### Q: 회원가입은 되는데 인증 이메일이 안 와요

**A**: Resend API 키가 설정되지 않았거나 잘못되었습니다.
1. Render.com → Environment 탭 확인
2. `RESEND_API_KEY` 값 확인
3. Resend Dashboard에서 API 키 유효성 확인
4. 이메일 발송 로그 확인

### Q: 마이그레이션 실행 시 에러가 나요

**A**: DATABASE_URL이 설정되지 않았거나 잘못되었습니다.
```bash
# Render.com Shell에서 확인
echo $DATABASE_URL

# 또는 수동으로 SQL 실행
psql $DATABASE_URL < database/migration-001-add-auth.sql
```

### Q: 이메일이 스팸으로 가요

**A**: 정상입니다! 처음에는 스팸으로 갈 수 있습니다.
- Gmail: "스팸" 또는 "프로모션" 탭 확인
- 이메일을 "스팸 아님"으로 표시

---

## 📞 추가 지원

더 도움이 필요하시면:
- GitHub Issues: https://github.com/hojune0330/athletetime/issues
- 문서: `AUTH_SYSTEM_COMPLETE.md` 참고

---

## ⏱️ 예상 소요 시간

- ✅ 1단계 (Render 배포): 3-5분 (자동)
- ✅ 2단계 (DB 마이그레이션): 1분
- ✅ 3단계 (Resend 설정): 5분
- **총 시간: 약 10-15분**

---

## 🎉 완료 후

모든 단계를 완료하면:
- ✅ 회원가입 작동
- ✅ 이메일 인증 작동
- ✅ 로그인/로그아웃 작동
- ✅ 프로필 관리 작동

**Every Second Counts!** ⏱️

---

*생성일: 2025-10-30*  
*최종 업데이트: 2025-10-30 01:35 UTC*
