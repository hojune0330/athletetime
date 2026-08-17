# AthleteTime — 선수 동일인 식별(Identity Resolution) 아키텍처 설계

> 작성: Claude (신뢰/인문 도메인) · 갱신: 2026-07-29
> 상태: **안전 게이트 구현, 매핑 데이터 0건**
>
> 현재 production fallback은 성별+부문 층위별로 분리한다. 레거시 별칭은
> 유일할 때만 canonicalize하고, 모호하면 `multiple_candidates`를 명시하며
> `*-all` identity rollup은 사용하지 않는다.
> 🧭 **상위 기준 문서:** `athletetime-data-strategy-master.md` (전략 전체의 단일 기준점)
> 전제: 실제 매핑 투입은 마스터 문서 §7 Go 조건과 별도 승인을 모두 충족한 뒤 진행
> **확정사항(2026-06-07):** person_no는 **B안(판단 후 폐기)** — 저장하지 않고 난수 canonicalId만 보유.
> 목적: 수동 검증된 일부 공개 기록 묶음에만 canonical 레이어를 적용하되,
> 기존 공개 키와 동명이인 분리 원칙을 깨지 않는 방법을 정의한다.

---

## 1. 문제 재정의

현재 우리 데이터(2018~2026, 91,004행)에는 **선수 식별자가 없다.** 이름+소속 문자열뿐.
- 같은 선수가 `초→중→고→대→실업`으로 소속을 바꾸면 → **다른 사람처럼 쪼개짐**
- 동명이인이 같은 소속이면 → **다른 사람이 한 명으로 합쳐짐**

이번 데이터무결성 수정(c9ff4e7)으로 `name | normalizeTeam(team)` 키를 도입해
카드 수를 24,986 → 16,853로 정리했지만, 이건 **"같은 정규화 이름·소속"을 묶는 1차 근사**다.
소속 변경 추적은 여전히 불가능하다.

외부 영구 식별자를 판단 시점에만 참고하는 것은 수동 검증 방법 중 하나다.
전체 선수를 일괄 정제하거나 이름·소속만으로 자동 병합하는 방식은 사용하지 않는다.

---

## 2. 3계층 식별 모델

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 3 : canonicalAthleteId  (수동 검토 묶음 — 제한 적용)    │
│            = 무작위 난수 canonicalId (우리 발급)              │
│            person_no는 판단 시점에만 일시 참조 후 즉시 폐기   │
│            (저장 안 함). 승인된 공개 키에만 canonicalId 적용. │
├─────────────────────────────────────────────────────────────┤
│ Layer 2 : athleteKey  (현행 — c9ff4e7)                        │
│            = stableId(name | normalizeTeam(team))             │
│            "같은 정규화 이름·소속" 묶음. 외부데이터 없이 동작.│
├─────────────────────────────────────────────────────────────┤
│ Layer 1 : raw row  (원천 — data/results/*.json)              │
│            name, affiliation, record, ... (식별자 없음)       │
└─────────────────────────────────────────────────────────────┘
```

핵심 설계 원칙: **Layer 2는 그대로 둔다.** Layer 3는 *추가 레이어*로 얹고,
승인된 매핑이 없거나 엔트리가 안전 게이트를 통과하지 못하면 Layer 2로
graceful fallback 한다.
→ 외부 데이터 연동이 실패/지연/부분적이어도 서비스는 멀쩡히 돌아간다.

---

## 3. 데이터 모델

### 3.0 현재 production fallback과 레거시 별칭

- 매핑이 없으면 legacyAthleteKey를 별칭으로만 보존하고, 실제 athleteKey는
  성별+부문 층위별로 분리한 안정 키로 만든다.
- 유일한 레거시 별칭만 canonicalize한다. 후보가 둘 이상이면
  `ambiguity: "multiple_candidates"`와 후보 목록을 반환하고 자동 선택하지 않는다.
- `*-all` identity rollup은 만들지 않는다.

### 3.1 매핑 테이블 — B안: person_no 저장 안 함
`data/identity/athlete-map.json` (현재 런타임 스키마)
```jsonc
{
  "version": 2,
  "entries": [
    {
      "canonicalId": "at_a8f3e1b9",
      "matchConfidence": 0.95,
      "decisionBasis": "manual_verified",
      "sourceRefs": ["ledger:manual-review-001"],
      "matchedAthleteKeys": ["<athleteKey1>", "<athleteKey2>"]
    }
  ]
}
```

`displayName`, `affiliations`, `person_no`, 생년월일, 이름·소속 `matchKeys`는
매핑 파일에 저장하지 않는다. `sourceRefs`는 공개 원본 자체가 아니라 내부
출처 원장의 `ledger:` 참조값만 1~10개 둔다. `matchedAthleteKeys`는
현재 Layer 2가 발급하는 16자리 16진수 키만 1~100개 허용한다.

### 3.2 매핑 허용 규칙

- `matchConfidence`는 유한한 0.85~1 값이어야 하지만, 이 숫자만으로 병합하지 않는다.
- `decisionBasis`는 현재 `manual_verified`만 허용한다.
- `sourceRefs`와 검토된 `matchedAthleteKeys`가 모두 허용 형식이어야 한다.
- 엔트리는 `canonicalId`, `matchConfidence`, `decisionBasis`, `sourceRefs`,
  `matchedAthleteKeys` 외 필드를 가지면 안 된다.
- 이름·소속 문자열 `matchKeys`는 런타임 병합에 사용하지 않는다.
- 하나의 `athleteKey`가 둘 이상의 그룹에 속하거나 `canonicalId`가 중복되면
  관련 엔트리를 모두 거부한다.
- 조건을 하나라도 충족하지 못하면 Layer 2를 그대로 사용한다.
- person_no·생년 등 보조 신호를 사용했다면 판단 직후 폐기하고 파일·DB·로그에 남기지 않는다.

---

## 4. 기존 코드 통합 지점 (최소 침습)

`recordAnalyticsService.js` 현행:
```js
// 현재 (c9ff4e7)
const athleteKey = stableId(`${name}|${normalizeTeam(team)}`);
```
현행 (verified mapping then segmented fallback):
```js
// 제안 — identityResolver는 외부데이터 없으면 null 반환
const legacyAthleteKey = stableId(nameTeamAlias);
const athleteKey = identityResolver.resolve({ athleteKey: legacyAthleteKey }) || segmentedFallback;
```
- `identityResolver`는 매핑 테이블만 읽고 외부 호출을 하지 않는다.
- 집계/검색은 `canonicalId` 기준으로 묶되, 매핑 없으면 `athleteKey`와 동일하게 동작.
- 이름·소속 보조 문자열을 전달해도 resolver는 이를 병합 근거로 사용하지 않는다.
- 진단 상태는 활성 여부와 승인·거부 건수만 제공하고 출처 참조·공개 키·선수 라벨을 반환하지 않는다.

---

## 5. 화면 노출 정책 (R3·R4·R7 반영)

| 데이터 | 화면 노출 | 근거 |
|---|---|---|
| 이름·소속·기록·대회 | ✅ 노출 | 이미 공개된 경기결과 |
| **person_no** | ❌ **미저장(B안)** | 판단 후 폐기 — DB에 존재하지 않음 |
| **canonicalId(난수)** | △ 공개 가명 키로 사용 가능 | 익명·비밀·본인확인 수단 아님 |
| 생년 | ❌ 미저장·미노출 | 판단 후 폐기 |
| 소속이력(연도별) | ✅ 노출 가능 | 공개 경기참가 사실 |
| 출처 링크 | ✅ **의무 노출** | R7 — "우리는 색인자" 증거 |
| 미성년(초·중등) | △ 보수적/옵트아웃 | R4 |

> **확정 원칙(B안):** person_no는 **저장하지 않는다.** 동일인 판단이 필요한 순간에만 메모리에서 일시 보조 신호로 사용하고, 판단 직후 즉시 폐기한다. DB·로그·화면 어디에도 person_no는 존재하지 않으며, 공개 기록 묶음에는 person_no와 수학적으로 무관한 **무작위 canonicalId**를 가명 키로 사용한다.
> 이 전제가 위 표 전체의 기둥이다.

---

## 6. 점진적 롤아웃 단계

1. **identityResolver 안전 게이트** — 완료. 빈 매핑이면 항상 Layer 2를 유지한다.
2. **소수 수동 검증 PoC** — 별도 승인 후 공개 출처 원장과 함께 제한적으로 검증한다.
3. **사용자 확인 화면** — `공식 신원`이 아니라 `수동 검토한 공개 기록 묶음`으로 표현한다.
4. **확대 여부 재심사** — 오매칭률·권리요청·미성년 영향 검토 전에는 확대하지 않는다.

각 단계는 독립적으로 롤백 가능. 1단계는 외부데이터 0건이어도 서비스 무영향.

---

## 7. 미해결·확인 필요
- 매핑 테이블을 JSON 파일로 둘지 DB로 둘지 → 승인된 소수 PoC 결과를 보고 결정.
- person_no의 안정성(KAAF가 재발급/병합하는 경우) → PoC에서 동일선수 재조회로 검증.
- 신뢰도 0.85는 허용 최저선이며, PoC 결과에 따라 낮추지 않고 더 엄격하게 조정할 수 있다.
- 소속이력 노출이 미성년에게 미치는 영향 → §5 R4 정책과 함께 재검토.

---

*현재 코드는 안전 게이트까지만 구현되어 있으며 실제 canonical 매핑은 0건이다.*

## Current production contract (2026-08-18)

Fallback identity is segmented by gender+division level. Unique legacy aliases
canonicalize; ambiguous aliases return `multiple_candidates` explicitly, with no
silent selection and no `*-all` identity rollup.
