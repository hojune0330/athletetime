# Priority 2 작업 계획 (1-2주)

**작성일**: 2025-11-04  
**상태**: 준비 중  
**목표**: Poll API/UI 구현 및 레거시 정리

---

## 📋 작업 목록

### 🎯 Phase 1: Poll 기능 구현 (5-7일)

#### 1.1 데이터베이스 마이그레이션
- [ ] `migration_v1.1.0_polls.sql` 실행
- [ ] poll_votes 테이블 생성 확인
- [ ] posts.poll JSONB 컬럼 추가 확인
- [ ] 인덱스 생성 확인

#### 1.2 백엔드 API 구현
- [ ] **POST /api/posts/:id/poll/vote** - 투표하기
  - 요청: `{ option_ids: number[] }`
  - 응답: `{ success: true, poll: {...} }`
  - 검증: 중복 투표 방지, 마감 시간 체크
  
- [ ] **GET /api/posts/:id/poll/results** - 투표 결과 조회
  - 응답: `{ success: true, results: {...} }`
  - 실시간 집계
  
- [ ] **DELETE /api/posts/:id/poll/vote** - 투표 취소
  - 요청: `{ user_id: string }`
  - 응답: `{ success: true }`

#### 1.3 백엔드 파일 구조
```
routes/
├── polls.js (새로 생성)
│   ├── POST /:postId/vote
│   ├── GET /:postId/results
│   └── DELETE /:postId/vote
└── posts.js (수정)
    └── poll 필드 포함하여 반환
```

#### 1.4 프론트엔드 타입 정의
- [ ] `types/index.ts`에 Poll 타입 추가
```typescript
export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  allow_multiple: boolean;
  ends_at: string | null;
  total_votes: number;
}

export interface Post {
  // ... 기존 필드
  poll?: Poll | null;
}
```

#### 1.5 프론트엔드 컴포넌트
- [ ] `components/poll/PollWidget.tsx` - 투표 UI
- [ ] `components/poll/PollResults.tsx` - 결과 차트
- [ ] `components/poll/PollCreator.tsx` - 투표 생성 (WritePage)

#### 1.6 프론트엔드 API 클라이언트
- [ ] `api/polls.ts` 생성
  - `votePoll(postId, optionIds)`
  - `getPollResults(postId)`
  - `cancelPollVote(postId)`

---

### 🧹 Phase 2: 레거시 서버 정리 (2-3일)

#### 2.1 Deprecated 파일 처리
- [ ] 사용하지 않는 server 파일 식별
- [ ] `archive/` 디렉토리로 이동
- [ ] README 업데이트 (deprecated 안내)

#### 2.2 보안 패치
- [ ] Helmet 미들웨어 추가
- [ ] CSRF 토큰 검토
- [ ] Rate limiting 설정 검증

#### 2.3 환경 변수 정리
- [ ] 사용하지 않는 환경 변수 제거
- [ ] `.env.example` 업데이트
- [ ] Render 환경 변수 동기화

---

### ⚡ Phase 3: Cloudflare Worker 보강 (선택적)

#### 3.1 권한 모델 추가
- [ ] JWT 검증 로직
- [ ] 역할 기반 접근 제어 (RBAC)
- [ ] Admin API 엔드포인트 보호

#### 3.2 Rate Limiting
- [ ] IP 기반 rate limit
- [ ] API 키 기반 rate limit
- [ ] 사용량 통계

---

## 🎯 우선순위별 분류

### 🔴 High Priority (필수)
1. Poll 데이터베이스 마이그레이션
2. Poll 백엔드 API 구현
3. Poll 프론트엔드 UI 구현
4. 레거시 파일 정리

### 🟡 Medium Priority (권장)
5. 보안 패치 (Helmet, CSRF)
6. 환경 변수 정리
7. 문서화 업데이트

### 🟢 Low Priority (선택)
8. Cloudflare Worker 권한 모델
9. Rate limiting 고도화
10. 모니터링 대시보드

---

## 📊 예상 일정

| 작업 | 예상 기간 | 담당 |
|-----|----------|------|
| Poll DB 마이그레이션 | 0.5일 | Backend |
| Poll 백엔드 API | 2일 | Backend |
| Poll 프론트엔드 | 3일 | Frontend |
| 레거시 정리 | 1일 | DevOps |
| 보안 패치 | 1일 | Backend |
| 문서화 | 0.5일 | All |
| **합계** | **8일** | |

---

## 🧪 테스트 계획

### Unit Tests
- [ ] Poll API 엔드포인트 테스트
- [ ] 중복 투표 방지 로직 테스트
- [ ] 마감 시간 검증 테스트

### Integration Tests
- [ ] Poll 생성 → 투표 → 결과 조회 플로우
- [ ] 여러 사용자 동시 투표 시나리오
- [ ] 투표 취소 및 재투표 시나리오

### E2E Tests
- [ ] 게시글 작성 시 투표 생성
- [ ] 투표 참여 및 결과 확인
- [ ] 마감된 투표 처리

---

## 🚀 배포 전략

### 1단계: 데이터베이스 마이그레이션
```bash
# Render 콘솔에서 실행
psql $DATABASE_URL < database/migration_v1.1.0_polls.sql
```

### 2단계: 백엔드 배포
- [ ] Poll API 코드 push
- [ ] Render 자동 배포 확인
- [ ] Health check 통과 확인

### 3단계: 프론트엔드 배포
- [ ] Vite 빌드 테스트
- [ ] Netlify 배포
- [ ] 배포본 동작 확인

---

## 🔒 보안 고려사항

1. **투표 조작 방지**
   - user_id + post_id unique constraint
   - IP 기반 추가 검증 (선택)

2. **Poll 데이터 검증**
   - option_ids 유효성 체크
   - ends_at 시간 검증
   - JSONB 스키마 검증

3. **Rate Limiting**
   - 투표 API: 10 req/min per user
   - 결과 조회: 60 req/min per user

---

## 📝 문서화 계획

- [ ] Poll API 명세서 작성
- [ ] 프론트엔드 컴포넌트 문서
- [ ] 마이그레이션 가이드
- [ ] 롤백 절차 문서

---

## ❓ 결정 필요 사항

1. **투표 익명성**
   - Q: 누가 어떤 선택지에 투표했는지 공개?
   - A: TBD

2. **투표 수정**
   - Q: 투표 후 선택 변경 가능?
   - A: TBD (현재는 취소 후 재투표)

3. **투표 마감 시간**
   - Q: 필수 설정? 선택 설정?
   - A: TBD (현재는 선택)

---

## 🎯 성공 기준

✅ **기능 완성도**
- Poll 생성, 투표, 결과 조회 모두 정상 작동
- 중복 투표 방지 100% 정확
- 마감 시간 검증 정확

✅ **성능**
- 투표 API 응답 시간 < 200ms
- 결과 조회 응답 시간 < 100ms
- 동시 100명 투표 처리 가능

✅ **UX**
- 투표 UI 직관적
- 결과 시각화 명확
- 에러 메시지 친절

---

**다음 액션**: Priority 2 작업 시작 승인 대기

**작성자**: Claude  
**검토 필요**: User
