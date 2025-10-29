# 📊 Render Starter 데이터 저장 해결 방안

## 🔍 현재 문제점

**Render Starter 플랜의 한계**:
- 파일 시스템은 **임시 저장소**입니다
- 서버 재배포 시 모든 파일이 초기화됩니다
- 이는 Starter 플랜도 마찬가지입니다

## ✅ 해결 방안

### 방안 1: PostgreSQL 사용 (추천) 🎯
Render에서 **무료 PostgreSQL** 제공!

**장점**:
- 완전 무료 (90일마다 갱신 필요)
- 영구 저장 보장
- SQL 쿼리로 데이터 관리 용이

**설정 방법**:
1. Render 대시보드 → New → PostgreSQL
2. Free 플랜 선택
3. 생성된 Database URL 복사
4. 서버 코드에 PostgreSQL 연결

**필요한 코드 변경**:
```javascript
// npm install pg
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

### 방안 2: Redis 사용 🚀
**Upstash Redis** (무료 티어)

**장점**:
- 빠른 읽기/쓰기
- 10,000 명령/일 무료
- 간단한 key-value 저장

**설정 방법**:
1. upstash.com 가입
2. Redis 데이터베이스 생성
3. 연결 정보 복사
4. 서버에 연결

### 방안 3: MongoDB Atlas 🍃
**MongoDB 클라우드** (무료 티어)

**장점**:
- 512MB 무료 저장소
- NoSQL (JSON 형태)
- 쉬운 데이터 구조

**설정 방법**:
1. cloud.mongodb.com 가입
2. 무료 클러스터 생성
3. 연결 문자열 복사
4. mongoose로 연결

### 방안 4: GitHub as Database 💡
**GitHub API로 JSON 저장**

**장점**:
- 완전 무료
- 버전 관리 자동
- 백업 걱정 없음

**단점**:
- API 제한 (시간당 60회)
- 느린 속도

**구현 방법**:
```javascript
// GitHub API로 data.json 파일 업데이트
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// 파일 읽기/쓰기
await octokit.repos.getContent({...});
await octokit.repos.createOrUpdateFileContents({...});
```

## 🎯 즉시 적용 가능한 임시 해결책

### 현재 서버 코드 (server.js)
- 메모리에 데이터 저장
- 서버 실행 중에는 데이터 유지
- 5분마다 파일 백업
- 재시작 시 백업 파일 복원 시도

### 사용자 안내사항
```html
⚠️ 중요 안내
현재 베타 서비스 중이며, 서버 업데이트 시 
데이터가 초기화될 수 있습니다.
중요한 내용은 별도로 보관해주세요.
```

## 🚀 추천 우선순위

1. **단기 (지금)**: 현재 메모리 기반 운영 + 사용자 안내
2. **중기 (1주일 내)**: PostgreSQL 연동
3. **장기 (안정화 후)**: 전체 백엔드 리팩토링

## 📝 PostgreSQL 연동 코드 예시

```javascript
// 1. 패키지 설치
// npm install pg

// 2. 데이터베이스 연결
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 3. 테이블 생성
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      author VARCHAR(100),
      content TEXT,
      category VARCHAR(50),
      password VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      views INTEGER DEFAULT 0,
      likes TEXT[],
      dislikes TEXT[]
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts(id),
      author VARCHAR(100),
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// 4. CRUD 작업
async function createPost(postData) {
  const { title, author, content, category, password } = postData;
  const result = await pool.query(
    'INSERT INTO posts (title, author, content, category, password) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [title, author, content, category, password]
  );
  return result.rows[0];
}

async function getPosts() {
  const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
  return result.rows;
}

async function deletePost(id, password) {
  const result = await pool.query(
    'DELETE FROM posts WHERE id = $1 AND (password = $2 OR $2 = $3)',
    [id, password, 'admin']
  );
  return result.rowCount > 0;
}
```

## 💡 결론

**Render Starter**에서 영구 저장을 원한다면:
1. **PostgreSQL** (Render 무료 제공) - 가장 추천
2. **외부 데이터베이스** 서비스 사용
3. **GitHub API** 활용 (간단한 경우)

현재 메모리 기반 저장은 **임시 해결책**이며,
프로덕션 환경에서는 **데이터베이스 연동이 필수**입니다.