/**
 * AthleTime 통합 서버
 * 
 * 커뮤니티(AthleTime) + 카드 스튜디오(Card Studio) 통합
 * 
 * ═══════════════════════════════════════════════════════════════
 * 아키텍처
 * ═══════════════════════════════════════════════════════════════
 * 
 * /api/auth/*           → AthleTime 인증 (JWT + bcrypt + 이메일)
 * /api/card-studio/*    → 카드 스튜디오 공개 API (프로필 카드, 검색, 대회)
 * /api/card-studio/*    → 카드 스튜디오 관리자 API (파이프라인, 갤러리, 콘텐츠 제작)
 * /api/categories       → 커뮤니티 카테고리
 * /api/posts/*          → 커뮤니티 게시판
 * /health               → 헬스체크
 * /                     → 카드 스튜디오 대시보드
 * /admin.html           → 관리자 대시보드
 * 
 * Standalone 모드:
 *   DATABASE_URL 미설정 시 메모리 Mock DB로 동작
 *   RESEND_API_KEY 미설정 시 이메일 콘솔 출력
 *   
 * Production 모드:
 *   PostgreSQL + Cloudinary + Resend 연결
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { requestLogPath } = require('./requestLogPath');

// 프로젝트 루트 (src/ 의 상위)
const ROOT = path.join(__dirname, '..');

// ============================================
// 환경 설정
// ============================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HAS_DATABASE = !!process.env.DATABASE_URL;

// ============================================
// Express 앱 생성
// ============================================

const app = express();
const server = http.createServer(app);
const db = require(path.join(ROOT, 'backend/utils/db'));
app.locals.pool = db.pool || db;
const { createEditorialScheduler } = require(path.join(ROOT, 'card-studio/services/editorialScheduler'));
const editorialScheduler = createEditorialScheduler({
  pool: HAS_DATABASE ? app.locals.pool : null,
  environment: process.env,
});
app.locals.editorialScheduler = editorialScheduler;

// Trust proxy (Render, Netlify 등 프록시 환경)
app.set('trust proxy', 1);

// Body 파싱
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ============================================
// CORS 설정
// ============================================

const allowedOrigins = [
  'https://athlete-time.netlify.app',
  'https://athletetime.netlify.app',
  'https://community.athletetime.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Sandbox / dev 환경에서 들어오는 모든 origin 허용
const isDevOrSandbox = NODE_ENV === 'development'
  || (process.env.SANDBOX || '').length > 0
  || process.env.E2B_SANDBOX === 'true';

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin) || isDevOrSandbox) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ============================================
// 보안 헤더
// ============================================

const { securityHeaders } = require(path.join(ROOT, 'card-studio/middleware/security'));
const { requireCsrfForCookieAuth } = require(path.join(ROOT, 'backend/utils/authCookies'));
app.use(securityHeaders);
app.use(requireCsrfForCookieAuth);

// ============================================
// 로깅
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health' && !req.path.startsWith('/fonts')) {
      console.log(`${req.method} ${requestLogPath(req)} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ============================================
// 정적 파일 서빙
// ============================================

// 템플릿 파일
app.use('/templates', express.static(path.join(ROOT, 'templates')));

// 폰트 파일
app.use('/fonts', express.static(path.join(ROOT, 'fonts')));

// Favicon (대시보드/admin.html 등에서 사용)
app.get('/favicon.svg', (req, res) => {
  res.sendFile(path.join(ROOT, 'dashboard', 'favicon.svg'));
});

// 레거시 대시보드 (바닐라 HTML — /legacy-dashboard/ 에서 접근)
app.use('/legacy-dashboard', express.static(path.join(ROOT, 'dashboard')));

// 대시보드 CSS/JS 리소스
app.use('/css', express.static(path.join(ROOT, 'dashboard/css')));
app.use('/js', express.static(path.join(ROOT, 'dashboard/js')));

// ============================================
// React SPA 정적 파일 (통합 프론트엔드)
// ============================================

const SPA_DIR = path.join(ROOT, 'community');
app.use(express.static(SPA_DIR));

// ============================================
// 헬스체크
// ============================================

// /api/health 별칭: Render Blueprint(render.yaml)의 healthCheckPath가
// /api/health로 지정된 이력이 있어 두 경로 모두 응답한다.
app.get(['/health', '/api/health'], async (req, res) => {
  const health = {
    status: 'healthy',
    version: '4.0.0',
    mode: HAS_DATABASE ? 'production' : 'standalone',
    services: {
      cardStudio: 'active',
      community: HAS_DATABASE ? 'active' : 'mock',
      auth: 'active',
      database: HAS_DATABASE ? 'connected' : 'mock-memory',
      email: process.env.RESEND_API_KEY ? 'configured' : 'console-only',
      externalData: 'active',
    },
    timestamp: new Date().toISOString(),
  };

  if (HAS_DATABASE) {
    try {
      const db = require(path.join(ROOT, 'backend/utils/db'));
      await db.query('SELECT 1');
      health.services.database = 'connected';
    } catch (e) {
      health.services.database = 'error';
      health.status = 'degraded';
    }
  }

  const rights = dataRequestService.readiness();
  health.services.dataRights = rights.ready ? 'ready' : 'unavailable';
  if (!rights.ready) health.status = 'degraded';
  health.services.editorialScheduler = editorialScheduler.readiness();

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// ============================================
// 외부 데이터 연동 API (커뮤니티 SPA에서 대회 정보 조회용)
// 관리자 데이터 수집: /api/admin/data-sync/status, /api/admin/data-sync/import
// ============================================

const paceriseRouter = require(path.join(ROOT, 'src/pacerise-routes'));
app.use('/api/pacerise', paceriseRouter);

// ============================================
// 인증 API (AthleTime)
// ============================================

const authRouter = require(path.join(ROOT, 'backend/auth/routes'));
app.use('/api/auth', authRouter);

// ============================================
// 카드 스튜디오 API
// ============================================

const cardStudioPublic = require(path.join(ROOT, 'card-studio/routes/publicRoutes'));
const cardStudioAdmin = require(path.join(ROOT, 'card-studio/routes/adminRoutes'));
const recordAnalyticsService = require(path.join(ROOT, 'card-studio/services/recordAnalyticsService'));
const dataRequestService = require(path.join(ROOT, 'card-studio/services/dataRequestService'));
const { authenticateToken, requireAdmin: jwtRequireAdmin } = require(path.join(ROOT, 'backend/middleware/auth'));

// 카드 스튜디오 공개 API (인증 불필요)
const { searchLimiter, generateLimiter, competitionLimiter, publicLimiter } = require(path.join(ROOT, 'card-studio/middleware/rateLimiter'));
app.use('/api/card-studio', cardStudioPublic);

// 카드 스튜디오 관리자 API (JWT 인증 필요)
app.use('/api/card-studio/admin', authenticateToken, jwtRequireAdmin, cardStudioAdmin);

// 공공데이터 거시통계 공개 API (Claude 소유, 인증 불필요, 익명 통계)
const publicDataRouter = require(path.join(ROOT, 'card-studio/routes/publicDataRoutes'));
app.use('/api/public-data', publicLimiter, publicDataRouter);

// ============================================
// 커뮤니티 API (AthleTime) — DB 있을 때만 활성
// 중요: 레거시 /api 라우트보다 먼저 등록해야 함
// ============================================

const categoriesRouter = require(path.join(ROOT, 'backend/routes/categories'));
const marketplaceRouter = require(path.join(ROOT, 'backend/routes/marketplace'));

app.use('/api/categories', categoriesRouter);
app.use('/api/marketplace', marketplaceRouter);

// 채팅 닉네임 중복 체크 API (레거시 계약 유지 — DB 불필요, 메모리 기반)
const { isNicknameAvailable: chatNicknameAvailable } = require(path.join(ROOT, 'backend/utils/websocket'));
app.get('/api/chat/check-nickname', (req, res) => {
  const { nickname } = req.query;

  if (!nickname) {
    return res.status(400).json({
      success: false,
      error: '닉네임을 입력해주세요.',
    });
  }

  if (nickname.length < 2 || nickname.length > 10) {
    return res.status(400).json({
      success: false,
      available: false,
      error: '닉네임은 2~10자 사이여야 합니다.',
    });
  }

  const available = chatNicknameAvailable(nickname);

  res.json({
    success: true,
    available,
    message: available ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.',
  });
});

if (HAS_DATABASE) {
  const postsRouter = require(path.join(ROOT, 'backend/routes/posts'));
  const commentsRouter = require(path.join(ROOT, 'backend/routes/comments'));
  const votesRouter = require(path.join(ROOT, 'backend/routes/votes'));
  const pollsRouter = require(path.join(ROOT, 'backend/routes/polls'));
  const competitionsRouter = require(path.join(ROOT, 'backend/routes/competitions'));
  const matchResultsRouter = require(path.join(ROOT, 'backend/routes/matchResults'));
  const uploadRouter = require(path.join(ROOT, 'backend/routes/upload'));
  const { createEditorialAdminRouter, createEditorialPublicRouter } = require(path.join(ROOT, 'backend/routes/editorialAdmin'));
  const { PostgresEditorialRepository } = require(path.join(ROOT, 'card-studio/repositories/postgresEditorialRepository'));
  const { EditorialIssueService } = require(path.join(ROOT, 'card-studio/services/editorialIssueService'));
  const editorialService = new EditorialIssueService(new PostgresEditorialRepository(app.locals.pool));

  // multer upload middleware
  const { upload, handleUploadError } = require(path.join(ROOT, 'backend/middleware/upload'));

  app.use('/api/posts', upload.array('images', 5), handleUploadError, postsRouter);
  app.use('/api/posts/:postId/comments', commentsRouter);
  app.use('/api/posts/:postId/vote', votesRouter);
  app.use('/api/posts/:postId/poll', pollsRouter);
  app.use('/api/competitions', competitionsRouter);
  app.use('/api/match-results', matchResultsRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/editorial', createEditorialPublicRouter({ service: editorialService }));
  app.use(
    '/api/admin/editorial',
    authenticateToken,
    jwtRequireAdmin,
    createEditorialAdminRouter({ service: editorialService }),
  );

  console.log('  Community API: active (PostgreSQL)');
} else {
  // Standalone 모드: DB 미연결 — 커뮤니티 API 미활성
  // 실제 데이터는 PostgreSQL 연결 시에만 제공
  app.get('/api/posts', (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    res.json({
      success: true,
      posts: [],
      count: 0,
      page,
      limit,
    });
  });

  app.post('/api/posts', (req, res) => {
    res.status(503).json({
      success: false,
      error: '커뮤니티 글쓰기는 데이터베이스 연결 후 사용할 수 있습니다.',
    });
  });

  console.log('  Community API: public read routes active, write routes disabled (no DATABASE_URL configured)');
}

// ============================================
// 숏폼·트렌드·빠른 반응 API
// ============================================

app.get('/api/trending/topics', (req, res) => {
  res.json({ topics: [], updatedAt: new Date(0).toISOString() });
});

app.get('/api/trending/hot-records', (req, res) => {
  res.json({ records: [], total: 0 });
});

app.post('/api/reactions', (req, res) => {
  res.json({ reactions: {} });
});

app.get('/api/reactions/:targetType/:targetId', (req, res) => {
  res.json({ reactions: {} });
});

app.get('/api/flash-polls', (req, res) => {
  res.json({ polls: [] });
});

app.post('/api/flash-polls/:pollId/vote', (req, res) => {
  res.json({ poll: null });
});

app.get('/api/feed/shortform', (req, res) => {
  res.json({ items: [], total: 0, updatedAt: new Date(0).toISOString() });
});

// ============================================
// 레거시 /api/* 라우트 (카드 스튜디오 하위 호환)
// 커뮤니티 API 라우트 이후에 등록 (우선순위: 커뮤니티 > 레거시)
// ============================================
app.use('/api', cardStudioPublic);
app.use('/api', authenticateToken, jwtRequireAdmin, cardStudioAdmin);

// ============================================
// WebSocket 설정
// ============================================

// 카드 스튜디오 WebSocket (경로: /ws — noServer 모드, 자기 경로만 처리)
try {
  const wsManager = require(path.join(ROOT, 'card-studio/websocket/wsManager'));
  wsManager.attach(server);
  console.log('  WebSocket (Card Studio): active (/ws)');
} catch (e) {
  console.log('  WebSocket (Card Studio): skipped -', e.message);
}

// 커뮤니티 실시간 채팅 WebSocket (경로: /ws/chat — 레거시 rooms: main/training/race/injury)
try {
  const WebSocket = require('ws');
  const { setupWebSocket } = require(path.join(ROOT, 'backend/utils/websocket'));

  const chatWss = new WebSocket.Server({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname !== '/ws/chat') return; // 다른 WSS(/ws 등)의 몫
    chatWss.handleUpgrade(req, socket, head, (ws) => {
      chatWss.emit('connection', ws, req);
    });
  });
  setupWebSocket(chatWss);

  console.log('  WebSocket (Chat): active (/ws/chat)');
} catch (e) {
  console.log('  WebSocket (Chat): skipped -', e.message);
}

// 정의되지 않은 경로의 업그레이드 요청 정리 (소켓 hang 방지)
server.on('upgrade', (req, socket) => {
  const pathname = (req.url || '').split('?')[0];
  if (pathname === '/ws' || pathname === '/ws/chat') return;
  socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
  socket.destroy();
});

// ============================================
// SPA Fallback (React Router — HTML5 History API)
// ============================================

// 프로필 카드 빌더 HTML 파일 직접 서빙
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(ROOT, 'dashboard', 'admin.html'));
});

// SPA catch-all: API와 정적 파일이 아닌 모든 GET → React SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/legacy-dashboard')) return next();
  // 파일 확장자가 있는 요청은 정적 파일로 넘김
  if (path.extname(req.path) && !req.path.endsWith('.html')) return next();
  
  const spaIndex = path.join(ROOT, 'community', 'index.html');
  const fs = require('fs');
  if (fs.existsSync(spaIndex)) {
    res.sendFile(spaIndex);
  } else {
    // SPA 빌드 안 된 경우 레거시 대시보드로 폴백
    res.sendFile(path.join(ROOT, 'dashboard', 'index.html'));
  }
});

// ============================================
// 에러 처리
// ============================================

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '존재하지 않는 엔드포인트입니다.',
    path: req.path,
  });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const safeError = {
    name: err.name,
    message: err.message,
    status,
    type: err.type,
    path: req.path,
  };

  console.error('Server error:', safeError);
  res.status(err.status || 500).json({
    success: false,
    error: NODE_ENV === 'production' ? '서버 오류가 발생했습니다.' : err.message,
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// 서버 시작
// ============================================

async function startServer() {
  await dataRequestService.initialize();
  await editorialScheduler.start();
  const stats = recordAnalyticsService.warmup();
  console.log(`  Record analytics warmup: ${stats.records} records, ${stats.athletes} athletes (${stats.ms}ms)`);

  return new Promise((resolve, reject) => {
    const onStartupError = (error) => reject(error);
    server.once('error', onStartupError);
    server.listen(PORT, '0.0.0.0', () => {
      server.removeListener('error', onStartupError);
      console.log('');
      console.log('🏃 ═══════════════════════════════════════════');
      console.log('   AthleTime 통합 서버 v4.0.0');
      console.log('🏃 ═══════════════════════════════════════════');
      console.log('');
      console.log(`  Mode: ${HAS_DATABASE ? 'Production (PostgreSQL)' : 'Standalone (no DB)'}`);
      console.log(`  Port: ${PORT}`);
      console.log(`  Env:  ${NODE_ENV}`);
      console.log('');
      console.log('  Endpoints:');
      console.log(`    Dashboard:   http://localhost:${PORT}/`);
      console.log(`    Auth API:    http://localhost:${PORT}/api/auth/`);
      console.log(`    Card Studio: http://localhost:${PORT}/api/card-studio/`);
      console.log(`    Legacy API:  http://localhost:${PORT}/api/ (하위 호환)`);
      console.log(`    Health:      http://localhost:${PORT}/health`);
      if (HAS_DATABASE) {
        console.log(`    Community:   http://localhost:${PORT}/api/posts`);
        console.log(`    Categories:  http://localhost:${PORT}/api/categories`);
      }
      console.log('');
      console.log('  Auth: JWT (이메일 로그인 + is_admin 관리자 구분)');
      console.log('  Admin: JWT authenticateToken + requireAdmin');
      console.log('');
      console.log('🏃 서버 준비 완료!');
      console.log('');
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server startup failed:', { name: error.name, code: error.code, message: error.message });
    process.exitCode = 1;
  });
}

let shutdownPromise = null;

function shutdownServer() {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    await editorialScheduler.stop();
    await dataRequestService.shutdown().catch((error) => {
      console.error('Data-rights shutdown failed:', error.message);
    });
    if (!server.listening) return;
    await new Promise((resolve) => server.close(resolve));
  })();
  return shutdownPromise;
}

async function handleShutdown(signal) {
  console.log(`${signal} 수신, 서버 종료 중...`);
  await shutdownServer();
  process.exit(0);
}

process.on('SIGTERM', () => { void handleShutdown('SIGTERM'); });
process.on('SIGINT', () => { void handleShutdown('SIGINT'); });

module.exports = {
  app,
  editorialScheduler,
  server,
  shutdownServer,
  startServer,
};
