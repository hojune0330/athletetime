/**
 * 🏃 Athlete Time Community - 백엔드 서버
 * Version: 4.0.0 - Clean Architecture
 * 
 * 개선사항:
 * - ✅ 라우터 완전 분리 (posts, comments, votes, categories)
 * - ✅ 미들웨어 모듈화
 * - ✅ 유틸리티 함수 분리
 * - ✅ 에러 처리 개선
 * - ✅ 코드 가독성 향상
 * 
 * 핵심 기능:
 * 1. PostgreSQL (익명 → 회원 시스템)
 * 2. Cloudinary (이미지 CDN)
 * 3. WebSocket (실시간 알림)
 * 4. RESTful API
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Pool } = require('pg');
const WebSocket = require('ws');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// 라우터
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
const votesRouter = require('./routes/votes');
const categoriesRouter = require('./routes/categories');
const authRouter = require('./auth/routes');
const pollsRouter = require('./routes/polls');
const competitionsRouter = require('./routes/competitions');
const matchResultsRouter = require('./routes/matchResults');
const marketplaceRouter = require('./routes/marketplace');
const uploadRouter = require('./routes/upload');

// 미들웨어
const { upload, handleUploadError } = require('./middleware/upload');

// 유틸리티
const { setupWebSocket, getClientsCount, isNicknameAvailable } = require('./utils/websocket');
const { isCloudinaryConfigured } = require('./utils/cloudinary');
const {
  featureComingSoonPayload,
  isFeatureEnabled,
  requireFeature,
  sendFeatureComingSoon,
} = require('./utils/features');

// ============================================
// 환경 설정
// ============================================

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://athlete-time.netlify.app';

const configuredOrigins = (process.env.CORS_ALLOWLIST || process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const productionOrigins = [
  FRONTEND_URL,
  'https://athlete-time.netlify.app',
  'https://athletetime.netlify.app',
  'https://community.athletetime.com',
];

const developmentOrigins = [
  ...productionOrigins,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

const allowedOrigins = new Set([
  ...(NODE_ENV === 'production' ? productionOrigins : developmentOrigins),
  ...configuredOrigins,
]);

// ============================================
// 데이터베이스 연결
// ============================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL 연결 성공');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 연결 오류:', err);
});

// 자동 마이그레이션 실행
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    const migrationFiles = isFeatureEnabled('marketplace') ? ['migration-003-marketplace.sql'] : [];

    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, 'database', file);
      
      if (fs.existsSync(filePath)) {
        console.log(`🔄 실행 중: ${file}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);
        console.log(`✅ 완료: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error.message);
  }
}

// 서버 시작 시 마이그레이션 실행
runMigrations();

// ============================================
// Cloudinary 설정
// ============================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(`🖼️  Cloudinary: ${isCloudinaryConfigured() ? '✅ 설정됨' : '❌ 미설정'}`);

// ============================================
// Express 앱 생성
// ============================================

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ============================================
// 미들웨어 설정
// ============================================

// Proxy 신뢰 설정 (Render, Netlify 등 프록시 환경 대응)
app.set('trust proxy', 1);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    if (NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    const corsError = new Error(`CORS origin not allowed: ${origin}`);
    corsError.status = 403;
    return callback(corsError, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24시간
};

app.use(cors(corsOptions));

// OPTIONS 프리플라이트
app.options('*', cors(corsOptions));

// Body 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 로깅 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Pool을 app.locals에 저장 (라우터에서 접근 가능)
app.locals.pool = pool;

// ============================================
// WebSocket 설정
// ============================================

if (isFeatureEnabled('chat')) {
  setupWebSocket(wss);
} else {
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify(featureComingSoonPayload('chat')));
    ws.close(1008, 'FEATURE_COMING_SOON');
  });
}

// ============================================
// 라우터 등록
// ============================================

// 헬스체크
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      version: '4.0.0',
      database: 'connected',
      cloudinary: isCloudinaryConfigured() ? 'configured' : 'not_configured',
      websocket: `${getClientsCount()} clients`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message 
    });
  }
});

// 채팅 닉네임 중복 체크 API
app.get('/api/chat/check-nickname', (req, res) => {
  if (!isFeatureEnabled('chat')) {
    return sendFeatureComingSoon(res, 'chat');
  }

  const { nickname } = req.query;
  
  if (!nickname) {
    return res.status(400).json({
      success: false,
      error: '닉네임을 입력해주세요.'
    });
  }
  
  if (nickname.length < 2 || nickname.length > 10) {
    return res.status(400).json({
      success: false,
      available: false,
      error: '닉네임은 2~10자 사이여야 합니다.'
    });
  }
  
  const available = isNicknameAvailable(nickname);
  
  res.json({
    success: true,
    available,
    message: available ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.'
  });
});

// API 라우터
app.use('/api/auth', authRouter);
app.use('/api/categories', requireFeature('community'), categoriesRouter);
app.use('/api/posts', requireFeature('community'), upload.array('images', 5), handleUploadError, postsRouter);
app.use('/api/posts/:postId/comments', requireFeature('community'), commentsRouter);
app.use('/api/posts/:postId/vote', requireFeature('community'), votesRouter);
app.use('/api/posts/:postId/poll', requireFeature('community'), pollsRouter);
app.use('/api/competitions', competitionsRouter);
app.use('/api/match-results', matchResultsRouter);
app.use('/api/marketplace', requireFeature('marketplace'), marketplaceRouter);
app.use('/api/upload', requireFeature('community'), uploadRouter);

console.log('✅ 모든 API 라우터 등록 완료 (/api/upload 포함)');

// 정적 파일 서빙 (HTML, CSS, JS, 이미지 등)
app.use(express.static(__dirname));

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '존재하지 않는 엔드포인트입니다.',
    path: req.path
  });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('❌ 서버 에러:', err);

  if (err.status === 403 && err.message?.startsWith('CORS origin not allowed')) {
    return res.status(403).json({
      success: false,
      error: '허용되지 않은 요청 출처입니다.',
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: NODE_ENV === 'production' 
      ? '서버 오류가 발생했습니다.' 
      : err.message,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// 서버 시작
// ============================================

server.listen(PORT, () => {
  console.log('');
  console.log('🏃 =======================================');
  console.log('   Athlete Time Community Server v4.0.0');
  console.log('🏃 =======================================');
  console.log('');
  console.log(`🚀 서버 시작: http://localhost:${PORT}`);
  console.log(`🌍 환경: ${NODE_ENV}`);
  console.log(`📦 데이터베이스: PostgreSQL`);
  console.log(`🖼️  이미지 CDN: Cloudinary`);
  console.log(`🔌 WebSocket: ${isFeatureEnabled('chat') ? '활성화' : '오픈 전 점검'}`);
  console.log('');
  console.log('📡 엔드포인트:');
  console.log(`   GET  /health                      - 헬스체크`);
  console.log(`   GET  /api/competitions            - 대회 목록`);
  console.log(`   GET  /api/match-results           - 경기 결과`);
  console.log(`   /api/posts, /api/categories       - ${isFeatureEnabled('community') ? '활성화' : '오픈 전 점검'}`);
  console.log(`   /api/marketplace                  - ${isFeatureEnabled('marketplace') ? '활성화' : '오픈 전 점검'}`);
  console.log(`   /api/chat/*                       - ${isFeatureEnabled('chat') ? '활성화' : '오픈 전 점검'}`);
  console.log('');
  console.log('✅ 서버 준비 완료!');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM 신호 수신, 서버 종료 중...');
  
  server.close(() => {
    console.log('✅ HTTP 서버 종료');
  });
  
  wss.close(() => {
    console.log('✅ WebSocket 서버 종료');
  });
  
  await pool.end();
  console.log('✅ 데이터베이스 연결 종료');
  
  process.exit(0);
});

module.exports = { app, server, pool };

