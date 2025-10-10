// 보안 강화 구현 예시 코드

// ============================================
// 1. 비밀번호 해싱 (bcrypt)
// ============================================

const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;  // 암호화 강도 (10~12 권장)

// 게시글 작성 시 - 비밀번호 해싱
async function createPostSecure(req, res) {
  const { title, author, content, password } = req.body;
  
  try {
    // 평문 비밀번호를 해시로 변환
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // 해시된 비밀번호를 DB에 저장
    const { rows } = await pool.query(
      `INSERT INTO posts (title, author, content, password) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, author, content, hashedPassword]  // 해시 저장!
    );
    
    console.log('✅ 비밀번호가 안전하게 암호화되어 저장됨');
    // 저장된 해시 예시: $2b$10$N9qo8uLOickgx2ZMRZoMye...
  } catch (error) {
    console.error('Error:', error);
  }
}

// 게시글 삭제 시 - 비밀번호 검증
async function deletePostSecure(req, res) {
  const { id } = req.params;
  const { password: inputPassword } = req.body;
  
  try {
    // DB에서 해시된 비밀번호 가져오기
    const { rows } = await pool.query(
      'SELECT password FROM posts WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' });
    }
    
    const storedHash = rows[0].password;
    
    // 입력된 비밀번호와 저장된 해시 비교
    const isPasswordValid = await bcrypt.compare(inputPassword, storedHash);
    
    if (!isPasswordValid) {
      return res.status(403).json({ message: '비밀번호가 일치하지 않습니다' });
    }
    
    // 비밀번호가 맞으면 삭제 진행
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ success: true, message: '게시글이 삭제되었습니다' });
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================
// 2. XSS (Cross-Site Scripting) 방지
// ============================================

const DOMPurify = require('isomorphic-dompurify');

// 위험한 HTML/JavaScript 코드 제거
function sanitizeInput(dirtyInput) {
  // 악의적인 스크립트 예시
  const maliciousInput = `
    <h1>제목</h1>
    <script>alert('해킹!')</script>
    <img src="x" onerror="steal_cookies()">
    <a href="javascript:void(0)" onclick="hack()">클릭</a>
  `;
  
  // DOMPurify로 정제
  const cleanInput = DOMPurify.sanitize(maliciousInput, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
  
  console.log('원본:', maliciousInput);
  console.log('정제됨:', cleanInput);
  // 결과: <h1>제목</h1> (스크립트 제거됨)
  
  return cleanInput;
}

// 게시글 작성 시 XSS 방지
async function createPostWithXSSProtection(req, res) {
  const { title, content, author } = req.body;
  
  // 모든 입력값 정제
  const cleanTitle = DOMPurify.sanitize(title);
  const cleanContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'target']
  });
  const cleanAuthor = DOMPurify.sanitize(author);
  
  // 정제된 데이터 저장
  await pool.query(
    'INSERT INTO posts (title, content, author) VALUES ($1, $2, $3)',
    [cleanTitle, cleanContent, cleanAuthor]
  );
}

// ============================================
// 3. Rate Limiting (요청 제한)
// ============================================

const rateLimit = require('express-rate-limit');

// 기본 Rate Limiter - 15분당 100개 요청
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 100,  // 최대 요청 수
  message: '너무 많은 요청을 보내셨습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 게시글 작성 제한 - 더 엄격하게
const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 5,  // 15분당 최대 5개 게시글
  message: '게시글 작성 한도를 초과했습니다. 15분 후 다시 시도해주세요.',
  skipSuccessfulRequests: false,
});

// 로그인 시도 제한 - 무차별 대입 공격 방지
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 5,  // 15분당 최대 5번 시도
  skipFailedRequests: false,  // 실패한 요청도 카운트
});

// 조회수 증가 제한 - 조작 방지
const viewCountLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1분
  max: 3,  // 1분당 최대 3번 조회
  keyGenerator: (req) => {
    // IP + 게시글 ID 조합으로 키 생성
    return `${req.ip}_${req.params.id}`;
  }
});

// Express 앱에 적용
function applyRateLimiting(app) {
  // 전체 API에 기본 제한 적용
  app.use('/api/', generalLimiter);
  
  // 특정 엔드포인트에 개별 제한
  app.post('/api/posts', createPostLimiter);
  app.put('/api/posts/:id/views', viewCountLimiter);
  app.post('/api/login', loginLimiter);
}

// ============================================
// 4. 추가 보안 기능
// ============================================

// CSRF 토큰 생성 및 검증
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// SQL Injection 방지 (이미 적용됨)
// Parameterized queries 사용 중
async function safeQuery(userId) {
  // 위험한 방법 (절대 사용 금지!)
  // const query = `SELECT * FROM users WHERE id = ${userId}`;
  
  // 안전한 방법 (현재 사용 중)
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]  // 파라미터화된 쿼리
  );
}

// IP 기반 조회수 중복 방지
const viewedPosts = new Map(); // IP별 조회 기록

async function incrementViewWithIPCheck(req, res) {
  const postId = req.params.id;
  const userIP = req.ip;
  const key = `${userIP}_${postId}`;
  
  // 이미 조회한 기록 확인
  const lastViewed = viewedPosts.get(key);
  const now = Date.now();
  
  if (lastViewed && (now - lastViewed) < 3600000) { // 1시간 이내
    return res.json({ 
      success: false, 
      message: '이미 조회한 게시글입니다' 
    });
  }
  
  // 조회수 증가
  await pool.query(
    'UPDATE posts SET views = views + 1 WHERE id = $1',
    [postId]
  );
  
  // 조회 기록 저장
  viewedPosts.set(key, now);
  
  // 메모리 관리 - 오래된 기록 삭제
  if (viewedPosts.size > 10000) {
    const oldestKeys = Array.from(viewedPosts.keys()).slice(0, 1000);
    oldestKeys.forEach(k => viewedPosts.delete(k));
  }
}

// ============================================
// 5. 실제 적용 예시 (server-postgres.js 수정)
// ============================================

// 필요한 패키지 설치
/*
npm install bcrypt
npm install isomorphic-dompurify
npm install express-rate-limit
npm install csurf
npm install helmet  // 추가 보안 헤더
*/

// server-postgres.js 상단에 추가
const bcrypt = require('bcrypt');
const DOMPurify = require('isomorphic-dompurify');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Express 앱 설정
const app = express();

// 보안 헤더 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate Limiting 적용
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ============================================
// 6. 클라이언트 측 보안 (community.html)
// ============================================

// HTML 이스케이핑 함수 개선
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
}

// 입력 검증
function validateInput(input, type) {
  switch(type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    case 'password':
      // 최소 8자, 대소문자, 숫자, 특수문자 포함
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(input);
    case 'title':
      return input.length >= 2 && input.length <= 100;
    default:
      return true;
  }
}

module.exports = {
  createPostSecure,
  deletePostSecure,
  sanitizeInput,
  applyRateLimiting,
  incrementViewWithIPCheck
};