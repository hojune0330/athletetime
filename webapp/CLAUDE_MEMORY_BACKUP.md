# Claude 기억용 UI/UX 재설계 백업 문서
## 🚨 절대 잊지 마세요: 이 문서는 Claude가 항상 까먹는 것들을 상기시키기 위한 것입니다

---

## 📋 Claude가 항상 까먹는 치명적 실수들

### 1. **테이블 구조 파괴 - 가장 중요함**
```css
/* ❌ Claude가 항상 하는 실수 */
.pace-table { 
  display: block;  /* 이 한 줄로 모든 것이 망가짐 */
}

/* ✅ 올바른 방법 */
.pace-table { 
  display: table; /* 테이블은 테이블로 유지 */
}
```
**Claude, 기억하세요**: 테이블에 `display: block`을 적용하면 테이블 구조가 완전히 파괴됩니다. 이것은 pace-calculator.html의 가장 심각한 문제입니다.

### 2. **모바일 퍼스트 vs 데스크톱 퍼스트**
```css
/* ❌ Claude가 항상 하는 실수 */
@media (max-width: 768px) { /* 데스크톱 우선 - 모바일 아님 */
  /* 모바일 스타일 */
}

/* ✅ 올바른 방법 */
/* 기본: 모바일 스타일 */
.card { padding: 1rem; }

@media (min-width: 768px) { /* 모바일 퍼스트 */
  .card { padding: 1.5rem; }
}
```
**Claude, 기억하세요**: `max-width`는 모바일 퍼스트가 아닙니다. 기본을 모바일로 하고 `min-width`로 태블릿/데스크톱을 추가하세요.

### 3. **터치 타겟 크기**
```css
/* ❌ Claude가 항상 하는 실수 */
.slider-thumb {
  width: 20px;  /* iOS 권장 44px의 절반 */
  height: 20px;
}

/* ✅ 올바른 방법 */
.slider-thumb {
  width: 44px;  /* iOS 최소 터치 타겟 */
  height: 44px;
}
```
**Claude, 기억하세요**: 44px는 iOS의 최소 터치 타겟 크기입니다. 20px는 조작할 수 없습니다.

### 4. **글꼴 크기**
```css
/* ❌ Claude가 항상 하는 실수 */
.table-text {
  font-size: 11px;  /* iOS 자동 확대 트리거 */
}

/* ✅ 올바른 방법 */
.table-text {
  font-size: 16px;  /* iOS 자동 확대 방지 */
}
```
**Claude, 기억하세요**: iOS Safari는 16px 미만 글꼴을 자동으로 확대합니다. 이것은 사용자 경험을 망칩니다.

---

## 🎯 매번 확인해야 할 사항들

### 구현 시작 전 절대 잊지 마세요:
1. **현재 파일 백업**: 작업 전에 원본 파일을 백업하세요
2. **브라우저 개발자 도구 열기**: 실시간으로 모바일 뷰 확인
3. **Lighthouse 실행**: 성능 및 접근성 벤치마크 확인
4. **터치 테스트**: 실제 모바일 기기에서 테스트

### CSS 작성 시 절대 규칙:
1. **min-width만 사용**: max-width는 금지
2. **44px 최소**: 모든 인터랙티브 요소는 44px 이상
3. **16px 글꼴**: 16px 미만 금지
4. **display: table 유지**: 테이블 구조 보존

### JavaScript 작성 시 절대 규칙:
1. **safeAddEventListener 사용**: 직접 addEventListener 금지
2. **try-catch 항상 추가**: 모든 함수에 에러 처리
3. **requestAnimationFrame 사용**: 스크롤 이벤트에 사용
4. **메모리 누수 방지**: 이벤트 리스너 제거

---

## 🚀 구현 단계별 체크포인트

### Phase 1: 기초 구조
- [ ] 모든 CSS를 min-width로 변경
- [ ] 테이블 display: block 제거
- [ ] 터치 타겟 44px로 증가
- [ ] 글꼴 크기 16px로 통일

### Phase 2: 카드 기반 레이아웃
- [ ] createPerfectCard 함수 구현
- [ ] convertTableToCards 함수 구현
- [ ] 테이블 데이터를 카드로 변환
- [ ] 카드 스와이프 컨테이너 추가

### Phase 3: 모바일 최적화
- [ ] 가상 스크롤링 구현
- [ ] Intersection Observer 지원
- [ ] 키보드 네비게이션 추가
- [ ] 고대비 모드 지원

### Phase 4: 성능 최적화
- [ ] 하드웨어 가속 적용
- [ ] 지연 로딩 구현
- [ ] 코드 분할 적용
- [ ] 브라우저 캐싱 설정

### Phase 5: 테스트 및 검증
- [ ] 브라우저 호환성 테스트
- [ ] 접근성 검사 (WCAG 2.1 AA)
- [ ] 성능 테스트 (Lighthouse 90+)
- [ ] 실제 기기 테스트

---

## 🆘 비상시 즉시 연락

### 치명적 오류 발견 시:
1. **즉시 중단**하고 현재 작업 저장
2. **이 문서 열어서** 문제 확인
3. **CLAUDE_UIUX_REDESIGN_INSTRUCTIONS_VERIFIED.md** 참조
4. **현재 문제점 분석 보고서** 확인

### 즉시 수정해야 할 경우:
```css
/* 만약 이 코드를 발견하면 즉시 수정 */
.any-table { display: block; }  /* ← 즉시 삭제 */
@media (max-width: 768px) { }  /* ← min-width로 변경 */
font-size: 11px;  /* ← 16px로 변경 */
width: 20px; height: 20px;  /* ← 44px로 변경 */
```

---

## 📚 참고 자료

### 필수 문서:
1. **CLAUDE_UIUX_REDESIGN_INSTRUCTIONS_VERIFIED.md** - 주요 지침서
2. **CURRENT_UIUX_ISSUES_ANALYSIS.md** - 현재 문제점 분석

### 온라인 리소스:
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Mobile First Design](https://www.uxpin.com/studio/blog/a-hands-on-guide-to-mobile-first-design/)

---

## 📝 마지막 메모

**Claude, 이것만은 꼭 기억하세요:**

1. **테이블은 테이블로**: 절대 `display: block` 하지 마세요
2. **모바일 퍼스트**: 항상 `min-width`를 사용하세요  
3. **터치 크기**: 44px는 절대로 작게 하지 마세요
4. **글꼴 크기**: 16px 미만은 iOS가 확대합니다
5. **안전한 코딩**: 항상 에러 처리를 하세요

**이 문서는 Claude가 실수하지 않도록 하는 최후의 안전장치입니다. 작업할 때 항상 옆에 두고 참조하세요.**

**현재 날짜**: 2025-01-12  
**다음 확인 날짜**: 작업 시작 시마다  
**문서 버전**: 1.0 (Claude를 위한 안전장치)