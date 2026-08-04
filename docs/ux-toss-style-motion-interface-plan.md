# 토스 스타일 모션·집중 인터페이스 계획

> **상태:** 초안 (v1)
> **의도:** AthleTime의 "정보 밀도가 높은 기록/대회 페이지"에서 **토스의 즉각적인 반응(motion)과 단일 작업 집중(focus)**을 결합한 UX 원칙을 정리한다.
> **상위 문서:** [ux-master-plan-final.md](./ux-master-plan-final.md) — 1단계(기반+레거시 재작성)가 이 문서의 원칙을 코드로 옮기는 첫 배포 지점.
> **디자인 시스템:** TRAINORACLE "Scientific Minimalism" (라이트 전용, 스퀘어 코너 ≤4px, ink/brand/energy 토큰) — 문서: `frontend/tailwind.config.js`, `docs/design-system-trainoracle/colors_and_type.css`.

---

## 1. 왜 토스 스타일인가 (판단의 근거)

- **데이터 페이지의 병폐:** AthleTime의 레거시 페이지는 "고정된 상태 → 로드 → 통째 렌더" 구조라 **포인트(어디를 봐야 하는지)가 흐려진다.** ↔ 토스는 화면이 바뀔 때 *어디서 무엇이 변했는지*를 명시적으로 보여준다.
- **신뢰는 "감각"에서 나온다:** 우리 커뮤니티는 공식/순위/과장 표현을 금지한다. 토스식 "작고 정확한 반응"은 광고 같지 않으면서도 **정직함을 시각화**한다 — 카피 톤과 정합.
- **경쟁 하드커버:** 네이버/카카오의 중계·기록 화면은 정보만 나열. **"누르면 반응한다"는 즉각성**이 AthleTime만의 차별 지점.

## 2. 3대 원칙 (M-F-P)

| 원칙 | 뜻 | 구현 예 |
|---|---|---|
| **M — Motion (반응)** | 사용자 입력에 화면이 *즉시* 반응한다 (80ms 이내). | `active:scale-[0.98]`, 탭 전환 `document.startViewTransition`, 스피너 대신 스켈레톤 |
| **F — Focus (집중)** | 한 화면에 하나의 주된 행동. 나머지는 보조·접이식. | 기록 상세의 "공유" 버튼 우선순위, 대회 탭 3개가 아닌 기본 탭 1개+접이식 |
| **P — Polish (정돈)** | 여백·타이포·숫자 정렬이 *계산된* 느낌. | `tabular-nums`/`font-mono` 기록 값, 스퀘어 코너, line-hair 보더 |

## 3. 토스 스타일 모션 기준 (디자인 토큰 적용)

### 3-1. 반응 속도 (transition-duration)
- 기본 120ms 미만 — `transition-duration: 80ms` (tailwind `duration-instant`). 레거시 200ms+는 전부 축소.
- 진행 표시는 스켈레톤(`animate-pulse`) 우선, 스피너(`animate-spin`)는 **로드 첫 프레임**에만.

### 3-2. View Transition (전환 효과)
- `document.startViewTransition()` — 지원 브라우저(Chromium)는 크로스페이드/슬라이드, 미지원은 폴백.
- **폴백 필수:** `useNavigateWithTransition()` (`frontend/src/lib/transition.ts`) — try/catch로 실패 시 `navigate()` 직접 호출. **절대 `startViewTransition`만 믿고 네비게이트를 빼먹지 말 것.**

### 3-3. 터치/클릭 반응
- 버튼·카드: `active:scale-[0.98]` + `hover:bg-surface-2`.
- 에너지 시스템 dot/underline(`energy.*`)은 **색 정보로만** — 배경 채우기 금지.

## 4. 집중(Focus)의 적용 — 페이지별

1. **홈** — 하루에 할 일 1개. "오늘의 기록" 카드 하나.
2. **기록 상세** — "공유"가 주 행동. 좋아요/댓글은 보조.
3. **PaceRise 실업 라이브** — "현재 진행 중 대회"가 첫 화면. 결과 필터는 접이식.
4. **ScheduleCard/Records** — 디폴트 보기 1개(위키) + 대안(달력/리스트) 접이식.

## 5. 즉각 반응 구현 체크리스트

- [ ] 탭/세그먼트 전환 → View Transition (1B 기반, PaceRise/Records/ScheduleCard 순 적용)
- [ ] 클릭 시 80ms 내 시각 피드백 (`active:scale`, `active:bg`)
- [ ] 로드 → 스켈레톤, 빈 상태 → 액션 버튼 1개
- [ ] 숫자 값은 `font-mono`/`tabular-nums` — 특히 기록·퍼센트·풍속
- [ ] 상태 배지(LIVE/진행중/종료)는 색상+라벨 동시 (색맹 배려)

## 6. 반대 의견/리스크 (솔직하게)

- **과한 모션 = 주의 산만.** 지침은 *반응*이지 *장식*이 아니다. 진입 애니메이션은 `fadeInUp 0.3s` 1회만.
- **View Transition 미지원 브라우저(Safari <18)**: 폴백 없이는 화면 이동이 안 될 수 있다 → 훅 강제.
- **스켈레톤 과용:** 데이터가 이미 캐시된 탭(경기 결과 재전환)에는 스켈레톤보다 즉시 렌더가 낫다. 조건부로.

---

*이 문서의 원칙은 마스터 플랜 1단계부터 코드로 반영된다. 이후 2·3·4단계에서도 이 문서를 기준으로 회귀 검토한다.*
