# AthleteTime — 선수 동일인 식별(Identity Resolution) 아키텍처 설계

> 작성: Claude (신뢰/인문 도메인) · 갱신: 2026-06-07
> 상태: **설계 단계 (코드 미착수)**
> 🧭 **상위 기준 문서:** `athletetime-data-strategy-master.md` (전략 전체의 단일 기준점)
> 전제: 마스터 문서 §7 Go 조건 충족 이후에만 구현 착수
> **확정사항(2026-06-07):** person_no는 **B안(판단 후 폐기)** — 저장하지 않고 난수 canonicalId만 보유.
> 목적: "소속이 매년 바뀌어도 한 선수를 한 명으로 묶는" canonical identity 레이어를
> 기존 코드를 깨지 않고 점진적으로 얹는 방법을 설계한다.

---

## 1. 문제 재정의

현재 우리 데이터(2018~2026, 91,004행)에는 **선수 식별자가 없다.** 이름+소속 문자열뿐.
- 같은 선수가 `초→중→고→대→실업`으로 소속을 바꾸면 → **다른 사람처럼 쪼개짐**
- 동명이인이 같은 소속이면 → **다른 사람이 한 명으로 합쳐짐**

이번 데이터무결성 수정(c9ff4e7)으로 `name | normalizeTeam(team)` 키를 도입해
카드 수를 24,986 → 16,853로 정리했지만, 이건 **"같은 시즌 같은 소속"만 묶는 1차 근사**다.
소속 변경 추적은 여전히 불가능하다.

→ **유일한 해법은 외부의 영구 식별자(person_no)를 참조하는 것.** (우리가 발급하지 않는다)

---

## 2. 3계층 식별 모델

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 3 : canonicalAthleteId  (영구 식별 — 최종 목표)        │
│            = 무작위 난수 canonicalId (우리 발급)              │
│            person_no는 판단 시점에만 일시 참조 후 즉시 폐기   │
│            (저장 안 함). 소속 바뀌어도 canonicalId 불변.      │
├─────────────────────────────────────────────────────────────┤
│ Layer 2 : athleteKey  (현행 — c9ff4e7)                        │
│            = stableId(name | normalizeTeam(team))             │
│            "같은 시즌·같은 소속" 묶음. 외부데이터 없이 동작.  │
├─────────────────────────────────────────────────────────────┤
│ Layer 1 : raw row  (원천 — data/results/*.json)              │
│            name, affiliation, record, ... (식별자 없음)       │
└─────────────────────────────────────────────────────────────┘
```

핵심 설계 원칙: **Layer 2는 그대로 둔다.** Layer 3는 *추가 레이어*로 얹고,
person_no가 없거나 미매칭이면 자동으로 Layer 2로 graceful fallback 한다.
→ 외부 데이터 연동이 실패/지연/부분적이어도 서비스는 멀쩡히 돌아간다.

---

## 3. 데이터 모델 (제안)

### 3.1 매핑 테이블 (신규) — ⚠️ B안: person_no 저장 안 함
`data/identity/athlete-map.json` (예시 스키마, 실구현은 DB 전환 가능)
```jsonc
{
  "version": 1,
  "source": "kaaf-public",          // 출처 명시 (정도 원칙)
  "fetchedAt": "2026-06-07",
  "entries": [
    {
      "canonicalId": "at_a8f3e1b9",  // 우리 발급 난수. person_no와 수학적 무관(역추적 불가)
      // ❌ personNo 필드 없음 — 판단 후 폐기(B안). DB에 타기관 식별자 보유 안 함
      "displayName": "홍길동",
      // ❌ birthYearHint도 기본 미저장. 동명이인 구분 불가피할 때만 2자리, 그 외 제외
      "sourceUrl": "https://www.kaaf.or.kr/ver3/run/player.asp?...", // 출처링크(사실 인용 근거)
      "affiliations": [              // 연도별 소속 스냅샷 (공개 사실)
        { "year": 2022, "team": "○○고등학교" },
        { "year": 2024, "team": "△△대학교" }
      ],
      "matchConfidence": 0.0,        // 우리 athleteKey와의 매칭 신뢰도
      "matchedAthleteKeys": ["<athleteKey1>", "<athleteKey2>"]
    }
  ]
}
```

### 3.2 매칭 규칙 (동일인 판단 — person_no는 일시 보조 신호, 저장 안 함)
> 아래 신호들은 **판단 시점 메모리에서만** 평가하고, 판단이 끝나면 person_no·생년 등 원본 신호는 폐기한다. 결과로는 무작위 canonicalId만 남는다.

| 신호 | 가중치 | 비고 |
|---|---|---|
| 이름 완전일치 | 필수 | 정규화(공백/한자 제거) 후 |
| 연도+소속 일치 | 높음 | (일시 참조) person_no.affiliations[year].team ≈ normalizeTeam(우리 team) |
| 종목 일치 | 중간 | 동명이인 분리에 결정적 |
| 생년 힌트 일치 | 중간 | (일시 참조) 판단에만 사용 후 폐기 — 저장 안 함 |
| 기록값 근접 | 보조 | 같은 대회·종목 기록이 일치하면 강한 신호 |

- `matchConfidence ≥ 0.85` → 자동 병합 (canonicalId 부여)
- `0.6 ≤ confidence < 0.85` → "추정" 표기, 자동병합 보류 (R6 명예훼손 방지)
- `< 0.6` → 미매칭, Layer 2 유지

---

## 4. 기존 코드 통합 지점 (최소 침습)

`recordAnalyticsService.js` 현행:
```js
// 현재 (c9ff4e7)
const athleteKey = stableId(`${name}|${normalizeTeam(team)}`);
```
제안 (Layer 3 lookup 추가, fallback 보존):
```js
// 제안 — identityResolver는 외부데이터 없으면 null 반환
const athleteKey = stableId(`${name}|${normalizeTeam(team)}`);  // Layer2 그대로
const canonicalId = identityResolver.resolve({ name, team, year, event }) // Layer3
  || athleteKey;  // graceful fallback
```
- `identityResolver`는 **신규 모듈**(별도 파일). 매핑 테이블만 읽음. 외부 호출 없음(런타임 안전).
- 집계/검색은 `canonicalId` 기준으로 묶되, 매핑 없으면 `athleteKey`와 동일하게 동작.
- **DO-NOT-MODIFY(프론트/Codex 소유) 파일은 건드리지 않음.** API 응답 형태 유지.

---

## 5. 화면 노출 정책 (R3·R4·R7 반영)

| 데이터 | 화면 노출 | 근거 |
|---|---|---|
| 이름·소속·기록·대회 | ✅ 노출 | 이미 공개된 경기결과 |
| **person_no** | ❌ **미저장(B안)** | 판단 후 폐기 — DB에 존재하지 않음 |
| **canonicalId(난수)** | ❌ **비노출** | 내부 식별 전용, 역추적 불가 |
| 생년(2자리) | △ 동명이인 구분시 최소 | R3 최소화 |
| 소속이력(연도별) | ✅ 노출 가능 | 공개 경기참가 사실 |
| 출처 링크 | ✅ **의무 노출** | R7 — "우리는 색인자" 증거 |
| 미성년(초·중등) | △ 보수적/옵트아웃 | R4 |

> **확정 원칙(B안):** person_no는 **저장하지 않는다.** 동일인 판단이 필요한 순간에만 메모리에서 일시 보조 신호로 사용하고, 판단 직후 즉시 폐기한다. DB·로그·화면 어디에도 person_no는 존재하지 않으며, 내부 식별키 역할은 person_no와 수학적으로 무관한 **무작위 canonicalId**가 대신한다.
> 이 전제가 위 표 전체의 기둥이다.

---

## 6. 점진적 롤아웃 단계

1. **identityResolver 스켈레톤** — 매핑 테이블 없으면 항상 null(=현행과 동일). 무해.
2. **PoC 매핑 주입** — 소수(30~50명) 수동/저속수집 매핑으로 resolve 동작 검증.
3. **소속이력 UI** — canonicalId 묶음을 "한 선수의 커리어 타임라인"으로 표현(출처링크 포함).
4. **전면 색인** — Go 조건 + 협조요청 회신 후에만. robots·저속·미성년정책 준수.

각 단계는 독립적으로 롤백 가능. 1단계는 외부데이터 0건이어도 서비스 무영향.

---

## 7. 미해결·확인 필요
- 매핑 테이블을 JSON 파일로 둘지 DB로 둘지 → 규모(수만 건) 보고 결정. PoC는 JSON으로 시작.
- person_no의 안정성(KAAF가 재발급/병합하는 경우) → PoC에서 동일선수 재조회로 검증.
- 매칭 신뢰도 임계값(0.85/0.6)은 PoC 측정치로 보정 필요.
- 소속이력 노출이 미성년에게 미치는 영향 → §5 R4 정책과 함께 재검토.

---

*이 문서는 설계만 담는다. `identityResolver` 등 실제 코드는
법적 검토서 §5.2 Go 조건 충족 및 선생님 승인 이후 착수한다.*
