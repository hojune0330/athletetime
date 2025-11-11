# 🏃‍♀️ 익명 게시판 & 메인 페이지 사용 안내 (중학생도 OK!)

## 1. 이 문서가 뭔가요?
- 이 문서는 **AthleteTime 커뮤니티 앱**에서 새로 연결된 익명 게시판 기능을 쉽게 설명한 가이드예요.
- "앞단"(화면)과 "뒷단"(서버)을 이어 주는 다리를 만들고, 실제 데이터를 가져오도록 완성한 내용을 담았어요.

## 2. 지금 구조 한눈에 보기
```
[사용자] ↔ [React 화면] ↔ [API 다리] ↔ [백엔드 서버]
```
- **React 화면**: 우리가 보는 웹페이지
- **API 다리**: `src/api/` + `src/hooks/` 폴더 (axios + React Query)
- **백엔드 서버**: https://athletetime-backend.onrender.com (실제 글이 저장되는 곳)

## 3. 필요한 준비물
| 항목 | 설명 |
| --- | --- |
| Node 18+ | `npm` 명령을 사용하기 위해 필요해요 |
| `.env` 파일 (선택) | Vite에서 서버 주소를 바꾸고 싶으면 `VITE_BACKEND_URL` 값 지정 |

`.env` 예시:
```bash
VITE_BACKEND_URL=https://athletetime-backend.onrender.com
```
> 값을 지정하지 않으면 위 주소를 자동으로 사용합니다.

## 4. 코드에서 기억해야 할 폴더
```
community-new/
├── src/
│   ├── api/            # axios로 서버와 대화하는 전화기
│   │   └── posts.ts
│   ├── hooks/          # React Query로 데이터 쉽게 쓰는 낚시대
│   │   └── usePosts.ts
│   ├── components/
│   │   └── post/
│   │       ├── AnonymousPostList.tsx  # 메인(홈)에 나오는 익명 글 목록
│   │       └── PostListReal.tsx       # 게시판 전용 글 목록 뷰
│   ├── pages/
│   │   ├── HomePage.tsx       # 메인 페이지
│   │   ├── BoardPage.tsx      # 게시판 페이지
│   │   ├── PostDetailPage.tsx # 글 상세 페이지
│   │   └── WritePage.tsx      # 글쓰기 페이지
│   └── main.tsx         # React Query Provider 등록
└── ANONYMOUS_BOARD_GUIDE.md  # 지금 보고 있는 안내서
```

## 5. 각 화면이 어떻게 바뀌었나요?
### 5-1. 홈 화면 (익명 게시판) – `HomePage.tsx`
- 진짜 서버 글을 불러와요 (`usePosts`).
- "최신", "인기", "댓글" 순서로 정렬할 수 있어요.
- 빠른 글쓰기 폼에서 **내용 + 비밀번호**만 있으면 바로 서버에 저장돼요.
- 글쓰기 성공 시 상단에 초록색 안내 문구가 뜨고 목록이 새로고침돼요.

### 5-2. 게시판 화면 – `BoardPage.tsx`
- 기존에 쓰던 가짜 데이터 대신 `PostListReal` 컴포넌트를 연결했어요.
- 언제 들어가도 서버에 있는 실제 글이 보여요.

### 5-3. 글 상세 화면 – `PostDetailPage.tsx`
- 서버에서 글 내용을 가져와 보여줘요.
- 좋아요/싫어요 버튼은 내 브라우저에 저장된 임시 ID로 동작해요.
- 댓글을 작성하면 즉시 서버에 저장되고 화면도 새로고침돼요.

### 5-4. 글쓰기 화면 – `WritePage.tsx`
- 작성자 닉네임(선택) + 삭제용 비밀번호(필수)를 받도록 바뀌었어요.
- 저장이 끝나면 1초 이내에 홈으로 돌아가요.

## 6. 개발자용 핵심 코드 요약
### 6-1. API 클라이언트 – `src/api/client.ts`
```ts
import axios from 'axios'

const baseURL = import.meta.env.VITE_BACKEND_URL ?? 'https://athletetime-backend.onrender.com'

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})
```

### 6-2. 게시글 API – `src/api/posts.ts`
```ts
export const postsApi = {
  getPosts,     // GET /api/posts
  getPost,      // GET /api/posts/:id (없으면 목록에서 찾아서 반환)
  createPost,   // POST /api/posts
  deletePost,   // DELETE /api/posts/:id
  votePost,     // POST /api/posts/:id/vote
  createComment // POST /api/posts/:id/comments
}
```

### 6-3. React Query 훅 – `src/hooks/usePosts.ts`
```ts
export function usePosts()     // 목록 조회
export function usePost(id)    // 단일 글 조회
export function useCreatePost()
export function useDeletePost()
export function useVotePost()
export function useCreateComment()
```
이 훅들을 쓰면 각 페이지에서 `data`, `isLoading`, `isError` 같은 상태를 편하게 사용할 수 있어요.

### 6-4. React Query 환경 설정 – `src/main.tsx`
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

## 7. 실행 & 확인 방법
```bash
cd /home/user/webapp/community-new
npm install        # 처음 한 번만
npm run dev        # 개발 서버 실행 (기본 포트 5173)
```
브라우저에서 http://localhost:5173 접속 → 글 목록, 작성, 상세, 댓글 기능을 직접 확인해보세요.

## 8. 자주 묻는 질문 (FAQ)
| 질문 | 답 |
| --- | --- |
| 글이 안 보일 때는? | 네트워크 탭에서 `/api/posts` 요청이 성공했는지 확인해 보세요. |
| 비밀번호를 왜 받아요? | 나중에 글을 삭제할 때 본인 확인용으로 쓰기 때문이에요. |
| 좋아요/싫어요는 어떻게 저장돼요? | 브라우저마다 임시 ID를 만들어서 서버에 넘깁니다. 같은 브라우저에서 다시 누르면 취소돼요. |
| 서버 주소를 바꾸고 싶으면요? | `.env`에 `VITE_BACKEND_URL`을 넣고 `npm run dev` 또는 `npm run build`를 다시 실행하면 돼요. |

## 9. 마무리 요약 (3줄)
1. 이제 **홈/게시판/상세/글쓰기** 모두 실제 서버와 연결돼요.
2. React Query 덕분에 데이터 로딩, 에러, 새로고침이 자동으로 처리돼요.
3. `ANONYMOUS_BOARD_GUIDE.md`만 읽으면 중학생도 구조를 이해하고 바로 사용할 수 있어요!

필요한 내용이 더 있으면 언제든지 알려주세요. 😊
