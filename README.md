# AthleTime · 애슬리트 타임

대한민국 육상 선수·기록·커뮤니티 플랫폼

> **⚠️ 작업자 필독**: 개발 플로우·저장소 역사·작업 규칙은 [`WORKFLOW.md`](./WORKFLOW.md) 참조.
> 핸드오프 저장소(`2026-first-item`)의 작업은 완료되어 **현재 프로덕션 repo는 `hojune0330/athletetime`** 이다.
> 2026-07-07부터 모든 작업자(Codex 포함)는 athletetime에 직접 커밋한다.

---

## 기술 스택

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: Express + PostgreSQL + WebSocket
- **Card Studio**: Puppeteer 기반 카드뉴스 자동 생성

## 브랜치

| 브랜치 | 용도 |
|---|---|
| `genspark_ai_developer` | 최신 작업 브랜치 (기본) |
| `main` | 안정 릴리즈 |

## 디자인 핸드오프

디자인 시안·토큰·결정 기록은 [`deliverable/`](./deliverable/) 폴더 참조:

```
deliverable/
├── README.md              ← AI 에이전트용 핸드오프 가이드
├── KNOWLEDGE.md           ← 프로젝트 지식 파일
├── DECISIONS.md           ← 디자인 결정 기록
├── DESIGN_GUIDE.md        ← 카드뉴스 디자인 원칙
├── mockups/               ← 디자인 시안 HTML 4개
└── tokens/tokens-kr.css   ← 디자인 토큰 CSS
```

## 디자인 토큰

```
Primary:  Indigo  #6366f1
Accent:   Orange  #f97316
Font:     Pretendard Variable (tabular numerals ON)
```

## 프로젝트 오너

장호준 · GitHub [@hojune0330](https://github.com/hojune0330)
