# 🤝 AI 협업 규칙

## 역할 분담

### Claude (프론트엔드 담당)
- ✅ HTML/CSS 작성
- ✅ UI/UX 디자인
- ✅ 사용자 인터페이스
- ✅ 애니메이션
- ❌ 백엔드 로직 수정 금지
- ❌ API 엔드포인트 변경 금지

### 다른 AI (백엔드 담당)
- ✅ 서버 오류 수정
- ✅ 데이터베이스 연결
- ✅ API 디버깅
- ✅ 에러 처리
- ❌ UI 컴포넌트 생성 금지
- ❌ 디자인 변경 금지

## Git 작업 규칙

1. **항상 pull 먼저**
   ```bash
   git pull origin main
   ```

2. **명확한 커밋 메시지**
   - Claude: `feat(ui):` 또는 `style:`
   - 다른 AI: `fix(backend):` 또는 `debug:`

3. **충돌 방지**
   - 같은 파일 동시 수정 금지
   - 작업 전 Slack/Discord로 소통

## 파일 구조

```
/webapp/
├── frontend/        # Claude 담당
│   ├── *.html
│   ├── css/
│   └── assets/
├── backend/         # 다른 AI 담당
│   ├── server-*.js
│   ├── api/
│   └── config/
└── shared/          # 공동 작업
    └── community-api.js  # 수정 시 협의 필요
```

## 현재 작업 상태

- **Claude**: 새로운 community-v2.html 준비 중
- **다른 AI**: 백엔드 오류 수정 대기 중

## 커밋 추적

최신 커밋을 항상 확인:
```bash
git log --oneline -5
```