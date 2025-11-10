# Poll API 명세서

**Version**: 1.0.0  
**Base URL**: `https://athletetime-backend.onrender.com`  
**작성일**: 2025-11-04

---

## 📋 개요

게시글에 투표(Poll) 기능을 추가하여 사용자들이 선택지를 투표하고 결과를 조회할 수 있습니다.

### 주요 기능
- ✅ 단일 선택 / 복수 선택 투표
- ✅ 투표 마감 시간 설정
- ✅ 중복 투표 방지
- ✅ 실시간 집계
- ✅ 투표 취소 기능

---

## 🔐 인증

현재 버전은 익명 투표를 지원합니다. `user_id`는 클라이언트에서 생성한 UUID를 사용합니다.

---

## 📡 API 엔드포인트

### 1. POST /api/posts/:postId/poll/vote

투표를 제출하거나 수정합니다.

#### Request

```http
POST /api/posts/123/poll/vote
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "option_ids": [1]
}
```

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| user_id | string (UUID) | ✅ | 사용자 식별자 |
| option_ids | number[] | ✅ | 선택한 옵션 ID 배열 |

#### Response 200 OK

```json
{
  "success": true,
  "poll": {
    "question": "당신의 주종목은?",
    "options": [
      { "id": 1, "text": "단거리", "votes": 43 },
      { "id": 2, "text": "중거리", "votes": 28 },
      { "id": 3, "text": "장거리", "votes": 15 }
    ],
    "allow_multiple": false,
    "ends_at": null,
    "total_votes": 86
  },
  "message": "투표가 성공적으로 제출되었습니다."
}
```

#### Error Responses

**400 Bad Request** - 필수 입력값 누락
```json
{
  "success": false,
  "error": "필수 입력값이 누락되었습니다. (user_id, option_ids 필요)"
}
```

**400 Bad Request** - 단일 선택 위반
```json
{
  "success": false,
  "error": "이 투표는 단일 선택만 가능합니다."
}
```

**400 Bad Request** - 유효하지 않은 선택지
```json
{
  "success": false,
  "error": "유효하지 않은 선택지 ID: 99"
}
```

**403 Forbidden** - 투표 마감
```json
{
  "success": false,
  "error": "투표가 이미 마감되었습니다.",
  "ends_at": "2025-11-03T23:59:59Z"
}
```

**404 Not Found** - 게시글 없음
```json
{
  "success": false,
  "error": "게시글을 찾을 수 없습니다."
}
```

**404 Not Found** - Poll 없음
```json
{
  "success": false,
  "error": "이 게시글에는 투표가 없습니다."
}
```

---

### 2. DELETE /api/posts/:postId/poll/vote

투표를 취소합니다.

#### Request

```http
DELETE /api/posts/123/poll/vote
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| user_id | string (UUID) | ✅ | 사용자 식별자 |

#### Response 200 OK

```json
{
  "success": true,
  "poll": {
    "question": "당신의 주종목은?",
    "options": [
      { "id": 1, "text": "단거리", "votes": 42 },
      { "id": 2, "text": "중거리", "votes": 28 },
      { "id": 3, "text": "장거리", "votes": 15 }
    ],
    "allow_multiple": false,
    "ends_at": null,
    "total_votes": 85
  },
  "message": "투표가 취소되었습니다."
}
```

#### Error Responses

**400 Bad Request** - user_id 누락
```json
{
  "success": false,
  "error": "user_id가 필요합니다."
}
```

**403 Forbidden** - 마감된 투표
```json
{
  "success": false,
  "error": "마감된 투표는 취소할 수 없습니다."
}
```

**404 Not Found** - 투표 기록 없음
```json
{
  "success": false,
  "error": "투표 기록을 찾을 수 없습니다."
}
```

---

### 3. GET /api/posts/:postId/poll/results

투표 결과를 조회합니다.

#### Request

```http
GET /api/posts/123/poll/results
```

#### Response 200 OK

```json
{
  "success": true,
  "results": [
    {
      "option_id": 1,
      "option_text": "단거리 (100m, 200m)",
      "votes": 42,
      "percentage": 48.84
    },
    {
      "option_id": 2,
      "option_text": "중거리 (400m, 800m)",
      "votes": 28,
      "percentage": 32.56
    },
    {
      "option_id": 3,
      "option_text": "장거리 (1500m 이상)",
      "votes": 16,
      "percentage": 18.60
    }
  ],
  "total_votes": 86,
  "question": "당신의 주종목은?",
  "allow_multiple": false,
  "ends_at": null,
  "is_ended": false
}
```

#### Response Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| results | array | 선택지별 득표 결과 |
| results[].option_id | number | 선택지 ID |
| results[].option_text | string | 선택지 텍스트 |
| results[].votes | number | 득표수 |
| results[].percentage | number | 득표율 (소수점 2자리) |
| total_votes | number | 총 투표수 |
| question | string | 투표 질문 |
| allow_multiple | boolean | 복수 선택 허용 여부 |
| ends_at | string\|null | 마감 시간 (ISO 8601) |
| is_ended | boolean | 마감 여부 |

#### Error Responses

**404 Not Found** - 게시글 없음
```json
{
  "success": false,
  "error": "게시글을 찾을 수 없습니다."
}
```

**404 Not Found** - Poll 없음
```json
{
  "success": false,
  "error": "이 게시글에는 투표가 없습니다."
}
```

---

### 4. GET /api/posts/:postId/poll

Poll 메타 정보를 조회합니다.

#### Request

```http
GET /api/posts/123/poll
```

#### Response 200 OK

```json
{
  "success": true,
  "poll": {
    "question": "당신의 주종목은?",
    "options": [
      { "id": 1, "text": "단거리", "votes": 42 },
      { "id": 2, "text": "중거리", "votes": 28 },
      { "id": 3, "text": "장거리", "votes": 16 }
    ],
    "allow_multiple": false,
    "ends_at": null,
    "total_votes": 86
  }
}
```

---

## 📊 Poll 데이터 구조

### Poll Object

```typescript
interface Poll {
  question: string;              // 투표 질문
  options: PollOption[];         // 선택지 배열
  allow_multiple: boolean;       // 복수 선택 허용 여부
  ends_at: string | null;        // 마감 시간 (ISO 8601)
  total_votes: number;           // 총 투표수
}

interface PollOption {
  id: number;                    // 선택지 ID
  text: string;                  // 선택지 텍스트
  votes: number;                 // 득표수
}
```

---

## 🧪 테스트 예제

### cURL 예제

#### 1. 투표 제출

```bash
curl -X POST https://athletetime-backend.onrender.com/api/posts/1/poll/vote \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "option_ids": [1]
  }'
```

#### 2. 투표 취소

```bash
curl -X DELETE https://athletetime-backend.onrender.com/api/posts/1/poll/vote \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

#### 3. 결과 조회

```bash
curl https://athletetime-backend.onrender.com/api/posts/1/poll/results
```

### JavaScript (Fetch API) 예제

```javascript
// 투표 제출
async function votePoll(postId, userId, optionIds) {
  const response = await fetch(
    `https://athletetime-backend.onrender.com/api/posts/${postId}/poll/vote`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, option_ids: optionIds })
    }
  );
  return await response.json();
}

// 결과 조회
async function getPollResults(postId) {
  const response = await fetch(
    `https://athletetime-backend.onrender.com/api/posts/${postId}/poll/results`
  );
  return await response.json();
}

// 투표 취소
async function cancelVote(postId, userId) {
  const response = await fetch(
    `https://athletetime-backend.onrender.com/api/posts/${postId}/poll/vote`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    }
  );
  return await response.json();
}
```

---

## 🔒 비즈니스 로직

### 투표 규칙

1. **중복 투표 방지**: 한 사용자는 하나의 투표에 한 번만 참여 가능
2. **투표 수정**: 이미 투표한 경우, 다시 투표하면 기존 선택이 변경됨
3. **단일/복수 선택**: `allow_multiple` 플래그에 따라 제한
4. **마감 시간**: `ends_at`이 지나면 투표/취소 불가
5. **원자성**: 모든 투표 처리는 트랜잭션으로 보장

### 데이터베이스 함수

- `vote_poll(post_id, user_id, option_ids)`: 투표 처리 및 집계
- `get_poll_results(post_id)`: 실시간 결과 조회

---

## 🐛 에러 코드

| HTTP 상태 | 에러 메시지 | 설명 |
|-----------|------------|------|
| 400 | 필수 입력값이 누락되었습니다 | user_id 또는 option_ids 없음 |
| 400 | 중복된 선택지는 제출할 수 없습니다 | option_ids에 중복 ID |
| 400 | 이 투표는 단일 선택만 가능합니다 | allow_multiple=false인데 2개 이상 선택 |
| 400 | 유효하지 않은 선택지 ID | 존재하지 않는 option ID |
| 403 | 투표가 이미 마감되었습니다 | ends_at 지남 |
| 403 | 마감된 투표는 취소할 수 없습니다 | ends_at 지남 (취소 시) |
| 404 | 게시글을 찾을 수 없습니다 | 유효하지 않은 postId |
| 404 | 이 게시글에는 투표가 없습니다 | Poll 미설정 |
| 404 | 투표 기록을 찾을 수 없습니다 | 취소할 투표 없음 |
| 409 | 이미 투표하셨습니다 | 중복 투표 (DB 제약) |
| 500 | 투표 처리 중 오류가 발생했습니다 | 서버 내부 오류 |

---

## 📝 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2025-11-04 | Poll API 최초 릴리스 |

---

**작성자**: Claude  
**검토 완료**: 2025-11-04  
**문의**: GitHub Issues
