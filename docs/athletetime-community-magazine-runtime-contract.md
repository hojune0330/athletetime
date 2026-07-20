# AthleteTime 커뮤니티 매거진 실행 계약

## 목적

이 문서는 커뮤니티 매거진 상세와 예약 발행을 구현할 때 바꾸면 안 되는 공개·운영 경계를 고정한다. 구현보다 이 계약이 우선한다.

## 공개 상세

- 사용자가 공유하는 주소는 `/community/post/:postId` 하나다.
- 매거진 정보는 `/api/editorial/magazine/by-post/:postId`에서 읽는다.
- 일반 게시글에 대한 위 요청의 `404`는 오류가 아니라 일반 게시글 fallback 신호다.
- 상세 응답은 `Cache-Control: no-store`를 사용한다.
- 관련 기록은 운영자가 입력한 `relatedUrl` 하나만 제공한다. 이름이나 소속으로 선수를 자동 연결하지 않는다.

## 공개 필드

공개 매거진 응답은 다음 값만 허용한다.

- issue: `id`, `slug`, `postId`, `status`, `title`, `content`, `summary`, `whyNow`, `discussionQuestion`, `relatedUrl`, `sectionKey`, `publishedAt`, `updatedAt`, `commentsCount`, `countsVisible`, `corrections`, `sources`
- source: `id`, `sourceUrl`, `sourceKind`, `title`, `publisher`, `capturedAt`
- correction: `revisionNumber`, `publicSummary`, `createdAt`

다음 값은 공개하지 않는다.

- `reviewNote`와 초안 본문
- actor·사용자 UUID
- 정책 fingerprint와 내부 판정 시각
- raw article, 내부 prompt, 원본 오류

기존 revision에 공개 요약이 없으면 `내용을 바로잡았어요.`만 표시한다. 내부 검토 메모로 빈칸을 채우지 않는다.

## 초기 추천 수치

- 매거진 글만 `published_at`부터 2시간 동안 추천·비추천 숫자를 숨긴다.
- 서버 UTC가 기준이며 `1:59:59`에는 숨기고 `2:00:00`부터 공개한다.
- 게시글 GET과 투표 POST 응답 모두 같은 규칙을 사용한다.
- 버튼과 댓글은 계속 사용할 수 있다.
- 일반 게시글은 기존 수치를 그대로 제공한다.

## 예약 발행

- 편집 상태에 `publish_failed`를 추가하지 않는다.
- 실행 실패는 `editorial_publish_jobs`에만 기록한다.
- 상태는 `queued`, `retrying`, `failed`, `completed` 네 가지다.
- 최대 시도는 최초 포함 3회이며 재시도 간격은 1분, 5분이다.
- raw error는 저장하지 않고 안전한 오류 코드만 저장한다.
- DB row lock과 `FOR UPDATE SKIP LOCKED`가 작업 선점의 기준이다. 메모리 타이머는 깨우기 수단일 뿐이다.
- `EDITORIAL_SCHEDULER_ENABLED` 기본값은 `false`다.
- 활성화 시 `EDITORIAL_SCHEDULER_ACTOR_ID`는 실제 관리자 UUID여야 한다. 아니면 scheduler만 fail-closed한다.

## 출시 경계

- 운영 DB 격리와 scheduler 활성화는 페이블 승인 전 수행하지 않는다.
- 알림과 지표 대시보드는 4주 Gate A 통과 전 구현하지 않는다.
