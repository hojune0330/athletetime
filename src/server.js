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
const { assertRecoveryCodeEnvironment } = require('../backend/auth/recoveryCodes');

// 프로젝트 루트 (src/ 의 상위)
const ROOT = path.join(__dirname, '..');
const {
  rejectPreparingFeature,
  rejectUnavailableInteractionWrite,
  rejectPreparingWebSocket,
  requireReadOnlyLaunchFeature,
} = require(path.join(ROOT, 'backend/middleware/launchFeatureGate'));

// ============================================
// 환경 설정
// ============================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HAS_DATABASE = !!process.env.DATABASE_URL;

assertRecoveryCodeEnvironment();

// ============================================
// Express 앱 생성
// ============================================

const app = express();
const server = http.createServer(app);
const db = require(path.join(ROOT, 'backend/utils/db'));
app.locals.pool = db.pool || db;

// Trust proxy (Render, Netlify 등 프록시 환경)
app.set('trust proxy', 1);

// ============================================
// CORS 설정
// ============================================

const allowedOrigins = new Set([
  'https://athlete-time.netlify.app',
  'https://athletetime.netlify.app',
  'https://community.athletetime.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.FRONTEND_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);

// Sandbox / dev 환경에서 들어오는 모든 origin 허용
const isDevOrSandbox = NODE_ENV === 'development'
  || (process.env.SANDBOX || '').length > 0
  || process.env.E2B_SANDBOX === 'true';

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const originAllowed = typeof origin === 'string' && (allowedOrigins.has(origin) || isDevOrSandbox);

  if (originAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (origin && !originAllowed) return res.sendStatus(403);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token');
    res.header('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }

  next();
});

// ============================================
// 보안 헤더
// ============================================

const { securityHeaders } = require(path.join(ROOT, 'card-studio/middleware/security'));
const { requireCsrfForCookieAuth } = require(path.join(ROOT, 'backend/utils/authCookies'));
app.use(securityHeaders);
app.use(rejectUnavailableInteractionWrite);

const blockedLegacyCardRendererPaths = new Set([
  '/api/card-studio/profile-card/generate',
  '/api/card-studio/profile-card/generate-modular',
  '/api/card-studio/profile-card/preview-html',
  '/api/profile-card/generate',
  '/api/profile-card/generate-modular',
  '/api/profile-card/preview-html',
]);

function normalizeRendererPath(requestPath) {
  let normalizedPath = requestPath;
  try {
    normalizedPath = decodeURIComponent(requestPath);
  } catch {
    normalizedPath = requestPath;
  }
  return normalizedPath.toLowerCase().replace(/\/+$/, '');
}

app.use((req, res, next) => {
  if (blockedLegacyCardRendererPaths.has(normalizeRendererPath(req.path))) {
    return rejectPreparingFeature(req, res);
  }
  return next();
});

app.use(requireCsrfForCookieAuth);
app.use(require(path.join(ROOT, 'card-studio/middleware/requestBodyParser')).createRequestBodyParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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

if (NODE_ENV !== 'production') {
  app.use('/legacy-dashboard', express.static(path.join(ROOT, 'dashboard')));
  app.use('/css', express.static(path.join(ROOT, 'dashboard/css')));
  app.use('/js', express.static(path.join(ROOT, 'dashboard/js')));
}

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
      community: HAS_DATABASE ? 'preparing' : 'mock',
      chat: 'active',
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

// Community and marketplace stay unavailable until their member-safety rules are implemented.
// Close reads too: a preparation screen must not have a bypass through its public API.
app.use('/api/categories', rejectPreparingFeature);
app.use('/api/marketplace', rejectPreparingFeature);
app.use('/api/posts', rejectPreparingFeature);

// 채팅「자유수다」— 익명 채팅 + 신고/운영자 큐 (Mock DB에서도 check-nickname·신고 접수 동작)
const chatRouter = require(path.join(ROOT, 'backend/routes/chat'));
app.use('/api/chat', chatRouter);

if (HAS_DATABASE) {
  const competitionsRouter = require(path.join(ROOT, 'backend/routes/competitions'));
  const matchResultsRouter = require(path.join(ROOT, 'backend/routes/matchResults'));
  const uploadRouter = require(path.join(ROOT, 'backend/routes/upload'));

  app.use('/api/competitions', requireReadOnlyLaunchFeature(), competitionsRouter);
  app.use('/api/match-results', requireReadOnlyLaunchFeature(), matchResultsRouter);
  app.use('/api/upload', rejectPreparingFeature);
}

console.log('  Community API: closed until launch approval');

// ============================================
// 숏폼·트렌드·빠른 반응 API
// ============================================

// Editorial, reaction, and poll surfaces are not live yet. Do not present an
// empty successful response as if content simply happens to be unavailable.
app.use('/api/trending', rejectPreparingFeature);
app.use('/api/reactions', rejectPreparingFeature);
app.use('/api/flash-polls', rejectPreparingFeature);
app.use('/api/feed/shortform', rejectPreparingFeature);

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

// 채팅「자유수다」WebSocket (경로: /ws/chat — noServer 모드, 자기 경로만 처리)
// wsManager(/ws — 카드스튜디오)와 공존한다: wsManager는 /ws 외 upgrade를 통과시키고,
// 이 핸들러는 /ws/chat만 받아 채팅 WSS에 연결한다.
try {
  const { WebSocketServer } = require('ws');
  const { setupWebSocket } = require(path.join(ROOT, 'backend/utils/websocket'));
  const chatWss = new WebSocketServer({ noServer: true });
  setupWebSocket(chatWss);
  server.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname === '/ws/chat') {
      chatWss.handleUpgrade(req, socket, head, (ws) => {
        chatWss.emit('connection', ws, req);
      });
      return;
    }
    if (pathname === '/ws') return;
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
  });
  console.log('  WebSocket (Chat): active (/ws/chat)');
} catch (e) {
  // ws 의존성이 없거나 websocket.js 로드 실패 시 — 기존처럼 준비 중으로 닫는다.
  console.log('  WebSocket (Chat): skipped -', e.message);
  server.on('upgrade', (req, socket) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname === '/ws/chat') {
      rejectPreparingWebSocket(socket);
      return;
    }
    if (pathname === '/ws') return;
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
  });
}

// ============================================
// SPA Fallback (React Router — HTML5 History API)
// ============================================

app.get('/admin.html', (req, res) => {
  if (NODE_ENV === 'production') return res.sendStatus(404);
  res.sendFile(path.join(ROOT, 'dashboard', 'admin.html'));
});

// SPA catch-all: API와 정적 파일이 아닌 모든 GET → React SPA
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/legacy-dashboard')) return next();
  // 파일 확장자가 있는 요청은 정적 파일로 넘김
  if (path.extname(req.path) && !req.path.endsWith('.html')) return next();
  
  const spaIndex = path.join(ROOT, 'community', 'index.html');
  const fs = require('fs');
  if (fs.existsSync(spaIndex)) {
    return res.sendFile(spaIndex);
  }
  res.status(503).send('서비스 화면을 준비하지 못했습니다.');
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
      console.log(`    Health:      http://localhost:${PORT}/health`);
      if (HAS_DATABASE) {
        // These routes are deliberately closed until the verified-member release is approved.
        console.log('    Community:   preparing (closed)');
        console.log('    Categories:  preparing (closed)');
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM 수신, 서버 종료 중...');
  await dataRequestService.shutdown().catch((error) => {
    console.error('Data-rights shutdown failed:', error.message);
  });
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('SIGINT 수신, 서버 종료 중...');
  await dataRequestService.shutdown().catch((error) => {
    console.error('Data-rights shutdown failed:', error.message);
  });
  server.close(() => process.exit(0));
});

module.exports = { app, server, startServer };
