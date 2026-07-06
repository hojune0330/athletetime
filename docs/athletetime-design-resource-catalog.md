# AthleteTime 디자인 리소스 카탈로그

> **목적:** 사용자가 공유한 6개 UX/디자인 리소스를 분석해 **AthleteTime 스택·브랜드·신뢰 톤에 맞는 활용 등급**으로 분류한다. 나중에 디자인 개선이 필요할 때 "어느 리소스를 어떻게 쓸지" 바로 결정할 수 있게 한다.
> **작성:** Claude 초안 + Codex 재검증. PR #2 / 브랜치 `codex/athletetime-product-ux-refresh`.
> **검증일:** 2026-06-21. 외부 서비스 라이선스·가격·스택은 바뀔 수 있으므로 실제 차용 전 해당 페이지를 다시 확인한다.
> **원칙:** 우리 디자인 시스템 `trainoracle`의 철학("Scientific, not sporty", 저채도, 데이터 밀도, 정직한 불확실성)과 신뢰 톤(공식/랭킹/예측/평가 금지)을 절대 우선.

---

## 0. 우리 스택·브랜드 사실(분류 기준)

| 항목 | 현재 값 | 분류에 미치는 영향 |
|---|---|---|
| CSS | **Tailwind v3.4** (+ tailwindcss-animate) | Tailwind 기반 리소스는 그대로 호환 |
| 컴포넌트 | Radix UI + CVA + clsx + tailwind-merge + lucide-react (**shadcn 스타일**) | shadcn 호환 리소스는 마찰 적음 |
| 애니메이션 | **framer-motion / motion 미설치** | 모션 의존 컴포넌트는 **새 무거운 의존성 필요** → 신중 |
| 폰트 | Pretendard + Inter + JetBrains Mono (확정, serif 금지) | 폰트는 이미 충분 — 신규 폰트는 보수적 |
| 컬러 | warm off-white `#FAFAF7` + deep teal `#0D5F5A`, **저채도** | 화려한/고채도 팔레트·이펙트는 브랜드 위반 |
| 톤 | "운동복 광고 색감 금지", 고대비, 모바일 360px | 마케팅용 파티클/네온/글로우 효과는 부적합 |
| 제품 신뢰 | 공개기록 색인, 정정/비노출, 출처 표기 | "AI가 검증", "공식", "예측", "평가"처럼 권위로 보이는 연출 금지 |

---

## 1. 활용 등급 정의

| 등급 | 의미 |
|---|---|
| 🟢 **즉시 사용 가능** | 라이선스·스택·브랜드 모두 적합. 지금 바로 차용 가능. |
| 🟡 **선별 사용** | 유용하나 조건부(저채도화/모션 의존 주의/일부만). 합의·검토 후. |
| 🔵 **참고 전용** | 코드 차용 X, 영감/벤치마크/의사결정에만. |
| 🔴 **부적합/주의** | 브랜드·신뢰 톤과 충돌하거나 라이선스 리스크. |

---

## 2. 리소스별 분석

### ① Aceternity UI — `ui.aceternity.com` — 🟡 선별 사용
- **성격:** 200+ 애니메이션 컴포넌트(copy-paste). 히어로/배경/카드.
- **스택:** React + Tailwind + **Framer Motion**.
- **라이선스:** 무료 컴포넌트/다운로드 아이템과 Pro/All-Access의 조건이 분리돼 있다. **MIT로 전제하지 말고**, 실제 차용 전 해당 컴포넌트 페이지와 Aceternity License/Terms를 재확인한다. Pro/All-Access 코드는 구매·권한 확인 전 도입 금지.
- **호환성:** Tailwind ✅ 이지만 **대부분 Framer Motion 의존** → 우리 미설치. 화려한 글로우/파티클/3D는 "Scientific, not sporty" 철학과 충돌.
- **결론:** 🟡 — **앱 내부 UI가 아니라 소개/랜딩의 정적 구조 영감**으로만 쓴다. 네온·파티클·글로우 효과는 🔴. Framer Motion 도입은 별도 의사결정 필요(번들 크기↑).
- **쓸 만한 곳:** About/서비스 소개 페이지의 bento/grid 배치, CTA 구조. `/records`, `/competitions`, 관리자 화면에는 기본 금지.
- **차용 조건:** 외부 모션 의존성 0, `prefers-reduced-motion` 대응, brand teal/off-white 토큰 재매핑, 출처·라이선스 메모.

### ② Magic UI — `magicui.design` — 🟡 선별 사용
- **성격:** 150+ 애니메이션 컴포넌트/이펙트. **오픈소스**.
- **스택:** React + TS + Tailwind + Motion + **shadcn 친화**.
- **라이선스:** GitHub `magicuidesign/magicui`는 **MIT**. Pro 상품은 별도 라이선스이므로 무료 OSS 범위와 분리.
- **호환성:** **shadcn 스타일이라 우리와 결이 맞음** ✅. 단 다수가 Motion 의존.
- **결론:** 🟡 — Aceternity보다 실무 적합도는 높지만, **Motion 의존 컴포넌트는 그대로 들이지 않는다**. 정적 shadcn-style 구조만 우리 토큰으로 재작성.
- **쓸 만한 곳:** 섹션 헤더, subtle border/shine이 아닌 정적 강조, empty-state layout, command/search shell 참고.
- **차용 조건:** MIT license 보존, Motion 미도입, 과한 count-up/shine/marquee 금지. 데이터 수치에는 `font-mono` 유지.

### ③ HyperUI — `hyperui.dev` — 🟢 즉시 사용 가능 ★최적합
- **성격:** 정적 Tailwind 컴포넌트(마케팅/웹앱/이커머스 블록).
- **스택:** **순수 Tailwind (JS 의존 없음)**, Tailwind v4까지 지원(v3도 호환).
- **라이선스:** **MIT** — 개인·상업 완전 자유. 가장 깨끗함.
- **호환성:** **모션 의존 없음 → 새 의존성 0**. 우리 Tailwind v3에 바로 붙음. 저채도 토큰으로 색만 바꾸면 브랜드 적합.
- **결론:** 🟢 — **6개 중 가장 안전하고 즉시 사용 가능.** 테이블, 폼, 빈 상태, 알림, 페이지네이션, 카드 등 **실용 컴포넌트**를 우리 토큰(`--brand`, `--ink`, `--surface`)으로 리스킨해 바로 차용.
- **쓸 만한 곳(지금 당장):** RecordsPage 시즌표/필터, CompetitionsPage 목록, 빈/오류 상태, 폼, 페이지네이션. (우리가 진행 중인 records UX 미세 개선 A3/A4와 직접 연결)
- **차용 조건:** MIT license 보존, rounded/card 느낌 제거, `bg-white`/gray scale을 `surface/bg/line/ink`로 치환, 360px 모바일 먼저 확인.

### ④ Realtime Colors — `realtimecolors.com` — 🔵 참고 전용(도구)
- **성격:** 실제 랜딩페이지에 색을 입혀 **실시간 미리보기**하는 팔레트 도구. (juxtopposed, 오픈소스)
- **라이선스:** 사이트는 무료 도구지만 GitHub 프로젝트는 **CC BY-NC-ND**로 확인됨. 즉 **도구 소스·템플릿·UI를 복제/변형 배포하지 않는다**.
- **호환성:** 코드 차용이 아니라 **색 결정 보조 도구**. 우리는 이미 teal 기반 토큰이 확정돼 있음.
- **결론:** 🔵 — **새 팔레트를 만드는 용도 아님**(브랜드 색 이미 고정). 다만 **다크모드 팔레트 설계**나 **명도 대비(접근성) 점검** 시 현재 토큰을 넣고 실시간으로 검증하는 용도로 유용.
- **쓸 만한 곳:** 다크모드 도입 검토 시, 또는 WCAG 대비 점검(고대비 원칙 검증)할 때.
- **차용 조건:** 색상 값/대비 판단만 참고. Realtime Colors의 코드, 화면 구조, 템플릿, 문구는 저장소에 복제 금지.

### ⑤ Fontshare — `fontshare.com` — 🟡 선별 사용(폰트)
- **성격:** ITF(인도 타입 파운드리)의 고품질 무료 폰트.
- **라이선스:** Fontshare 폰트는 개인·상업 무료. 단 폰트별로 ITF FFL(Closed Source) 또는 SIL OFL(Open Source)일 수 있으므로 **각 폰트 family의 EULA를 확인**한다.
- **호환성:** 우리는 이미 **Pretendard+Inter+JetBrains Mono 확정** + serif 금지. **라틴 폰트 교체 니즈 낮음**.
- **결론:** 🟡 — 기본 폰트 교체는 불필요/위험(브랜드 일관성). 단 **특정 디스플레이용(로고타입/큰 헤드라인) 라틴 폰트**가 필요해지면 안전한 후보 풀. **한글은 Fontshare에 없음**(라틴 위주) → 한글 본문엔 부적합.
- **쓸 만한 곳:** About/브랜드 페이지의 영문 디스플레이 헤드라인 한정(필요 시).
- **차용 조건:** core UI 폰트 교체 금지. 웹폰트 self-hosting/외부 CDN 사용 여부는 성능·개인정보 관점에서 별도 판단.

### ⑥ Mobbin — `mobbin.com` — 🔵 참고 전용(레퍼런스)
- **성격:** 실제 앱/웹 스크린샷과 사용자 흐름을 검색하는 UI/UX 레퍼런스 라이브러리.
- **라이선스/가격:** 유료 구독 기반. 사이트는 스크린/플로우 열람과 Figma 활용 기능을 제공하지만, **원 앱의 디자인을 그대로 복제하거나 스크린샷을 저장소/PR에 붙이는 것은 금지**한다.
- **호환성:** 코드 없음. 순수 영감/플로우 벤치마크.
- **결론:** 🔵 — **절대 디자인을 그대로 베끼지 않는다.** 검색/필터/온보딩/빈 상태 같은 **UX 패턴 벤치마크**에만. (우리는 이미 배드민톡을 무료 벤치마크로 활용 중 — Mobbin은 보조.)
- **주의:** 유료 구독 필요. 스크린샷을 PR/문서에 붙여넣지 말 것(저작권).
- **쓸 만한 곳:** 탭바·검색·기록 상세·회원가입/로그인·빈 상태 등 패턴 설계 시 사례 조사(구독 시).

---

## 3. 한눈에 요약

| # | 리소스 | 등급 | 핵심 이유 | 지금 쓸 곳 |
|---|---|---|---|---|
| ③ | **HyperUI** | 🟢 즉시 | MIT·순수 Tailwind·모션 0·우리 스택 직결 | **records/대회 표·폼·빈상태(지금)** |
| ② | Magic UI | 🟡 선별 | 오픈소스·shadcn 친화, 모션 의존 주의 | 미세 강조(저채도, 모션 절제) |
| ① | Aceternity | 🟡 선별 | Framer Motion 필요·화려 이펙트 브랜드 충돌·라이선스 재확인 필요 | 랜딩/소개 정적 레이아웃 영감만 |
| ⑤ | Fontshare | 🟡 선별 | 폰트 이미 확정, 한글 없음 | 영문 디스플레이 한정(필요시) |
| ④ | Realtime Colors | 🔵 참고 | 색 결정 도구, 소스는 NC-ND | 다크모드/대비 점검 |
| ⑥ | Mobbin | 🔵 참고 | 유료·복제금지, 영감 전용 | UX 패턴 벤치마크(구독시) |

---

## 4. 실행 규칙 — 디자인 작업 시작 전 6단계

1. **문제부터 고른다.** 예: "records 빈 상태가 죽어 있음", "대회 목록이 스캔 안 됨", "회원가입이 신뢰를 못 줌".
2. **기본 선택은 HyperUI.** 표/폼/empty state/list/page shell은 HyperUI에서 구조를 보고 우리 토큰으로 재작성한다.
3. **Magic/Aceternity는 앱 내부에 직접 쓰지 않는다.** 소개/랜딩 또는 미세 강조에만. Motion 의존성 추가가 필요하면 별도 ADR/PR에서 번들·접근성·성능을 먼저 평가한다.
4. **Mobbin은 패턴만 추출한다.** "검색 필터가 어느 순서로 나오는가", "하단 탭이 무엇을 숨기는가" 같은 원칙만 기록한다. 화면/아이콘/문구 복제 금지.
5. **Realtime Colors는 검증 도구다.** `#FAFAF7`, `#0E1412`, `#0D5F5A`, `#D9D6CE`를 넣고 대비·다크모드 후보만 확인한다.
6. **PR 설명에 출처와 변형 내용을 남긴다.** "HyperUI table 구조 참고, 색/spacing/radius는 TRAINORACLE 토큰으로 재작성"처럼 기록한다.

## 5. 권고 — 지금 당장 디자인 개선을 도울 수 있는 것

1. **HyperUI(🟢)를 records/대회 UX 미세 개선에 바로 연결.**
   진행 중인 A3(시즌표 sticky)·A4(빈 상태) 다음 단계로, HyperUI의 **테이블/빈 상태/폼/페이지네이션** 블록을 **우리 토큰으로 리스킨**해 차용하면 빠르게 품질↑. 모션·신규 의존성 0이라 안전.
2. **회원가입/로그인 신뢰 UX는 HyperUI + Mobbin 패턴 조사 조합.**
   실제 코드는 HyperUI의 form/error/empty pattern을 재작성하고, Mobbin은 금융/커뮤니티 앱의 회원가입 순서·보안 안내 위치를 참고한다. 스크린샷은 저장하지 않는다.
3. **모션 라이브러리(Aceternity/Magic UI 풀 활용)는 보류.**
   Framer Motion 도입은 번들·성능·"Scientific, not sporty" 철학에 영향 → 도입 전 Codex와 별도 의사결정(번들 예산). 당장은 `tailwindcss-animate`로 충분한 미세 전환만.
4. **Realtime Colors는 다크모드 검토 시 활용.**
   현재 토큰을 넣고 대비(접근성)·다크 팔레트를 실시간 검증. 새 팔레트 생성 용도 아님.
5. **Fontshare는 폰트 교체 트리거가 생기기 전엔 건드리지 않음**(브랜드 일관성).

## 6. PR 체크리스트

외부 디자인 리소스를 참고한 PR은 아래를 본문에 적는다.

- **Resource:** HyperUI / Magic UI / Aceternity / Realtime Colors / Fontshare / Mobbin 중 무엇을 참고했는가.
- **Use type:** 코드 차용 / 구조 참고 / 패턴 참고 / 색 검증 / 폰트 검토 중 무엇인가.
- **License note:** MIT 보존, Pro 미사용, screenshot 미첨부, NC-ND 소스 미차용 등.
- **Transformation:** 색, radius, typography, spacing을 TRAINORACLE 토큰으로 어떻게 바꿨는가.
- **Safety:** 360px 모바일, keyboard/focus, `prefers-reduced-motion`, bundle dependency, console error를 확인했는가.
- **Trust tone:** 공식/랭킹/AI검증/예측/평가처럼 오해될 표현이 없는가.

## 7. 가드레일(공통)
- 차용 시 **반드시 우리 토큰/저채도로 리스킨**. 원본의 고채도·네온·글로우는 제거.
- **신뢰 톤 유지:** 과한 연출(카운트업·반짝임)은 데이터 신뢰감을 해치면 지양.
- **데이터 값 `font-mono` 유지**, 브랜드 `ATHLETE TIME` 유지.
- **라이선스 표기 보존:** MIT 소스 차용 시 원 저작권/라이선스 고지를 보존한다.
- **Mobbin 스크린샷·Aceternity Pro 코드·Realtime Colors 소스/템플릿**은 저장소에 넣지 않는다.
- **새 UI 의존성 추가 금지 기본값:** `motion`, `framer-motion`, 새 폰트 CDN 등은 별도 합의 없이는 추가하지 않는다.

## 8. 출처 메모(재검증용)

| 리소스 | 확인한 공개 근거 |
|---|---|
| Aceternity UI | `ui.aceternity.com`, `/components`, `/licence`, `/terms`, `/pricing` |
| Magic UI | `magicui.design`, `github.com/magicuidesign/magicui` MIT license |
| HyperUI | `hyperui.dev`, `github.com/markmead/hyperui` MIT license |
| Realtime Colors | `realtimecolors.com`, `github.com/juxtopposed/realtimecolors` CC BY-NC-ND |
| Fontshare | `fontshare.com`, `/licenses/itf-ffl`, `/licenses/sil-ofl` |
| Mobbin | `mobbin.com`, `/pricing`, explore pages |
