# AI Context Memory - AthleteTime Project

## 🔄 모델 전환 시 참고사항

### 현재 작업 상태 (2025-11-10)
- **Express.js 서버**: 포트 3001에서 정상 실행 중
- **페이스 계산기**: DOM 오류 해결 완료, 환경 모달 추가됨
- **트레이닝 계산기**: 정상 작동 중
- **PWA 기능**: 활성화됨

### Git 설정
- **원격 저장소**: https://github.com/hojune0330/athletetime
- **브랜치**: main
- **사용자**: hojune0330 (genspark_dev@genspark.ai)
- **토큰**: athletetime-sandbox (보안상 GitHub에서 관리)

### 주요 해결사항
1. **CSS 텍스트 노출 문제**: CSS 코드를 `<style>` 태그 안으로 이동
2. **innerHTML 오류**: 모든 DOM 조작에 null 체크 추가
3. **환경 모달 누락**: 트레이닝 계산기와 동일한 환경 선택 기능 구현
4. **포트 충돌**: PORT를 3005에서 3001로 변경

### 현재 서버 상태
```bash
# 서버 확인 명령어
cd /home/user/webapp && ps aux | grep node

# 서버 재시작 필요시
cd /home/user/webapp && node server.js
```

### 접속 URL
- **메인**: https://3001-iqmufvt9mc1w3c32i3z6r-b9b802c4.sandbox.novita.ai
- **페이스 계산기**: /pace-calculator.html
- **트레이닝 계산기**: /training-calculator.html

### 작업 재개 시 확인사항
1. 서버가 실행 중인지 확인 (포트 3001)
2. 최신 커밋이 push되었는지 확인
3. 환경 변수 (.env) 파일 상태 확인
4. 필요시冲突 방지 스크립트 실행: `./conflict-prevention.sh`

### 긴급 복구 절차
- 서버 다운 시: `node server.js` 실행
- 충돌 발생 시: `./conflict-prevention.sh` 실행
- Git 문제 시: `git fetch origin main && git rebase origin/main`

---
**작성일**: 2025-11-10  
**작성자**: Kimi K2 → Claude Sonnet 4.5 → Kimi K2  
**용도**: 모델 전환 시 작업 연속성 확보