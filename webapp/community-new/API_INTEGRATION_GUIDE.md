# 🔗 React 앱 백엔드 API 통합 가이드

**작성자**: Claude Sonnet 4.5  
**작성일**: 2025-10-24  
**상태**: ✅ 완료

---

## 📋 목차

1. [개요](#개요)
2. [구현된 기능](#구현된-기능)
3. [파일 구조](#파일-구조)
4. [사용 방법](#사용-방법)
5. [환경 설정](#환경-설정)
6. [다음 단계](#다음-단계)

---

## 개요

React 앱과 백엔드 서버(https://athlete-time-backend.onrender.com)를 연동하는 API 클라이언트를 구현했습니다.

### 구현 내용

- ✅ Axios 기반 API 클라이언트
- ✅ TypeScript 타입 정의
- ✅ React Query 훅
- ✅ 에러 처리
- ✅ 로딩 상태 관리
- ✅ 캐시 관리

---

## 구현된 기능

### 1. API 클라이언트 (`src/api/client.ts`)

```typescript
import { apiClient } from './api/client';

// 환경별 URL 자동 설정
// - 개발: http://localhost:3000
// - 프로덕션: https://athlete-time-backend.onrender.com

// 요청/응답 인터셉터
// - 로깅
// - 에러 처리
```

### 2. 타입 정의 (`src/types/post.ts`)

```typescript
export interface Post {
  id: number;
  category: string;
  title: string;
  author: string;
  content: string;
  date: string;
  views: number;
  likes: string[];
  dislikes: string[];
  comments: Comment[];
  // ...
}
```

### 3. API 서비스 (`src/api/posts.ts`)

```typescript
// 게시글 CRUD
export async function getPosts(): Promise<Post[]>
export async function getPost(id: number): Promise<Post | null>
export async function createPost(data: CreatePostRequest): Promise<Post>
export async function updatePost(id: number, data: UpdatePostRequest): Promise<Post>
export async function deletePost(id: number, password: string): Promise<void>

// 댓글 & 투표
export async function createComment(postId: number, data: CreateCommentRequest): Promise<Post>
export async function votePost(postId: number, data: VoteRequest): Promise<Post>
```

### 4. React Query 훅 (`src/hooks/usePosts.ts`)

```typescript
// 조회
export function usePosts()
export function usePost(id: number)

// 변경
export function useCreatePost()
export function useUpdatePost()
export function useDeletePost()
export function useCreateComment()
export function useVotePost()
```

### 5. 실제 API 연동 컴포넌트 (`src/components/post/PostListReal.tsx`)

```typescript
import { usePosts } from '../../hooks/usePosts';

export default function PostListReal() {
  const { data: posts, isLoading, isError, error } = usePosts();
  
  // 로딩, 에러, 데이터 렌더링 처리
}
```

---

## 파일 구조

```
community-new/
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios 클라이언트 설정
│   │   ├── posts.ts           # 게시글 API 함수
│   │   └── index.ts           # Export 통합
│   ├── types/
│   │   └── post.ts            # 타입 정의
│   ├── hooks/
│   │   └── usePosts.ts        # React Query 훅
│   ├── components/
│   │   └── post/
│   │       ├── PostList.tsx        # 샘플 데이터 (기존)
│   │       └── PostListReal.tsx    # 실제 API 연동 (신규)
│   └── main.tsx               # React Query Provider 설정
└── .env.example               # 환경 변수 예시
```

---

## 사용 방법

### 1. 기본 사용 - 게시글 목록 조회

```typescript
import { usePosts } from '../hooks/usePosts';

function MyComponent() {
  const { data: posts, isLoading, isError } = usePosts();
  
  if (isLoading) return <div>로딩 중...</div>;
  if (isError) return <div>에러 발생</div>;
  
  return (
    <div>
      {posts?.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### 2. 게시글 작성

```typescript
import { useCreatePost } from '../hooks/usePosts';
import { useState } from 'react';

function WritePost() {
  const createPost = useCreatePost();
  const [formData, setFormData] = useState({
    category: '자유',
    title: '',
    author: '',
    content: '',
    password: '',
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createPost.mutateAsync(formData);
      alert('게시글이 작성되었습니다!');
      // 페이지 이동 등
    } catch (error) {
      alert('게시글 작성에 실패했습니다.');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드들 */}
    </form>
  );
}
```

### 3. 게시글 상세 조회

```typescript
import { usePost } from '../hooks/usePosts';
import { useParams } from 'react-router-dom';

function PostDetail() {
  const { postId } = useParams();
  const { data: post, isLoading } = usePost(Number(postId));
  
  if (isLoading) return <div>로딩 중...</div>;
  if (!post) return <div>게시글을 찾을 수 없습니다.</div>;
  
  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  );
}
```

### 4. 투표 (좋아요/싫어요)

```typescript
import { useVotePost } from '../hooks/usePosts';

function VoteButtons({ postId }: { postId: number }) {
  const votePost = useVotePost();
  const userId = 'user_' + Date.now(); // 실제로는 로그인한 사용자 ID
  
  const handleVote = async (type: 'like' | 'dislike') => {
    try {
      await votePost.mutateAsync({
        postId,
        data: { userId, type },
      });
    } catch (error) {
      alert('투표에 실패했습니다.');
    }
  };
  
  return (
    <div>
      <button onClick={() => handleVote('like')}>👍 좋아요</button>
      <button onClick={() => handleVote('dislike')}>👎 싫어요</button>
    </div>
  );
}
```

### 5. 댓글 작성

```typescript
import { useCreateComment } from '../hooks/usePosts';

function CommentForm({ postId }: { postId: number }) {
  const createComment = useCreateComment();
  const [formData, setFormData] = useState({
    author: '',
    content: '',
    password: '',
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createComment.mutateAsync({
        postId,
        data: formData,
      });
      alert('댓글이 작성되었습니다!');
      setFormData({ author: '', content: '', password: '' });
    } catch (error) {
      alert('댓글 작성에 실패했습니다.');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드들 */}
    </form>
  );
}
```

---

## 환경 설정

### 1. 환경 변수 설정 (선택사항)

```bash
# .env 파일 생성 (개발 환경용)
cp .env.example .env

# 내용 (필요시 수정)
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

**참고**: 환경 변수를 설정하지 않아도 자동으로 감지합니다.
- 개발 환경: `http://localhost:3000`
- 프로덕션 환경: `https://athlete-time-backend.onrender.com`

### 2. React Query Provider 확인

`main.tsx`에 이미 설정되어 있습니다:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5분
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

---

## 다음 단계

### 1. 기존 컴포넌트 교체

#### 교체할 컴포넌트
- `src/components/post/PostList.tsx` → `PostListReal.tsx` 사용
- `src/pages/HomePage.tsx` - PostListReal 임포트로 변경
- `src/pages/BoardPage.tsx` - PostListReal 임포트로 변경

#### 예시

```typescript
// Before
import PostList from '../components/post/PostList';

// After
import PostListReal from '../components/post/PostListReal';

// 사용
<PostListReal />
```

### 2. 나머지 페이지 구현

#### WritePage.tsx - 글쓰기 페이지
```typescript
import { useCreatePost } from '../hooks/usePosts';

export default function WritePage() {
  const createPost = useCreatePost();
  
  // 폼 처리 로직
}
```

#### PostDetailPage.tsx - 게시글 상세 페이지
```typescript
import { usePost, useVotePost, useCreateComment } from '../hooks/usePosts';

export default function PostDetailPage() {
  const { postId } = useParams();
  const { data: post } = usePost(Number(postId));
  
  // 상세 보기, 투표, 댓글 기능
}
```

### 3. 테스트

```bash
# 개발 서버 실행
cd community-new
npm run dev

# 백엔드 서버 확인
# https://athlete-time-backend.onrender.com 접속하여 상태 확인

# 테스트 항목
# 1. 게시글 목록 조회
# 2. 게시글 작성
# 3. 게시글 상세 보기
# 4. 댓글 작성
# 5. 투표 (좋아요/싫어요)
```

### 4. 배포

```bash
# 빌드
npm run build

# Netlify 배포
# - Build command: cd community-new && npm run build
# - Publish directory: community-new/dist
# - 환경 변수는 자동으로 설정됨 (PROD 모드에서 자동 감지)
```

---

## 🐛 문제 해결

### 1. CORS 에러

백엔드 서버(`server.js`)에서 CORS가 이미 설정되어 있습니다:

```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 2. 네트워크 에러

- 백엔드 서버 상태 확인: https://athlete-time-backend.onrender.com
- Render 대시보드에서 로그 확인
- 브라우저 개발자 도구 Network 탭 확인

### 3. 타입 에러

TypeScript 컴파일 오류가 발생하면:

```bash
npm run type-check
```

### 4. 캐시 문제

React Query 캐시를 초기화하려면:

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.clear(); // 모든 캐시 클리어
```

---

## 📚 참고 자료

- [Axios 문서](https://axios-http.com/docs/intro)
- [React Query 문서](https://tanstack.com/query/latest)
- [TypeScript 문서](https://www.typescriptlang.org/docs/)
- [백엔드 통합 문서](../BACKEND-INTEGRATION.md)

---

## 📞 문의

- GitHub Issues: https://github.com/hojune0330/athletetime/issues
- 프로젝트 오너: @hojune0330

---

**작성자**: Claude Sonnet 4.5  
**최종 수정**: 2025-10-24  
**버전**: 1.0.0
