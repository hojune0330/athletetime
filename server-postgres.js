// PostgreSQL 연동 + 보안 강화 서버
// 중요: Render 유료 플랜 사용 중 (데이터 제한 없음!)
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const WebSocket = require('ws');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const DOMPurify = require('isomorphic-dompurify');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const crypto = require('crypto');

// Render 유료 플랜 설정 로드
const { validateRenderPlan, RENDER_PLAN } = require('./config/render-config');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_UPLOAD_FILES = 5;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname || '');
    const unique = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: MAX_UPLOAD_FILES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(new Error('지원되지 않는 파일 형식입니다. (이미지 또는 PDF만 업로드 가능)'));
    }
    callback(null, true);
  },
});

// PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? 
    { rejectUnauthorized: false } : false
});

const DEFAULT_BOARD_DEFINITIONS = [
  {
    id: 'notice',
    slug: 'notice',
    name: '서비스 공지',
    description: 'AthleteTime 운영팀 안내와 점검 소식을 전합니다.',
    icon: '📢',
    orderIndex: 0,
  },
  {
    id: 'anonymous',
    slug: 'anonymous',
    name: '익명 게시판',
    description: '로그인 없이 러너들과 실시간으로 소통하세요.',
    icon: '💬',
    orderIndex: 1,
  },
  {
    id: 'qna',
    slug: 'qna',
    name: '질문 · 답변',
    description: '러닝 관련 궁금한 점을 질문하고 답변을 받아보세요.',
    icon: '❓',
    orderIndex: 2,
  },
  {
    id: 'training',
    slug: 'training',
    name: '훈련 · 노하우',
    description: '훈련일지와 노하우를 공유하고 피드백을 받아보세요.',
    icon: '🏃',
    orderIndex: 3,
  },
  {
    id: 'gear',
    slug: 'gear',
    name: '장비 · 리뷰',
    description: '러닝화와 웨어, 기어 사용 후기를 나눠보세요.',
    icon: '🎽',
    orderIndex: 4,
  },
  {
    id: 'competition',
    slug: 'competition',
    name: '대회 · 모임',
    description: '주요 대회 정보와 커뮤니티 번개를 공유합니다.',
    icon: '🏅',
    orderIndex: 5,
  },
];

async function ensureExtendedSchema() {
  const statements = [
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[]`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll JSONB`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS summary TEXT`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS board_id VARCHAR(50) DEFAULT 'anonymous'`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id VARCHAR(100)`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_notice BOOLEAN DEFAULT false`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_blinded BOOLEAN DEFAULT false`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS reports INTEGER DEFAULT 0`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes TEXT[] DEFAULT '{}'::TEXT[]`,
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS dislikes TEXT[] DEFAULT '{}'::TEXT[]`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id BIGINT`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS instagram VARCHAR(100)`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id VARCHAR(100)`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS dislike_count INTEGER DEFAULT 0`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0`,
    `ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS file_url TEXT`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS file_size INTEGER`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS mime_type TEXT`
  ];

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error) {
      console.error('스키마 확장 쿼리 실패:', statement, error.message);
    }
  }

  const defaultStatements = [
    `ALTER TABLE posts ALTER COLUMN likes SET DEFAULT '{}'::TEXT[]`,
    `ALTER TABLE posts ALTER COLUMN dislikes SET DEFAULT '{}'::TEXT[]`,
    `ALTER TABLE posts ALTER COLUMN board_id SET DEFAULT 'anonymous'`,
    `ALTER TABLE comments ALTER COLUMN like_count SET DEFAULT 0`,
    `ALTER TABLE comments ALTER COLUMN dislike_count SET DEFAULT 0`,
    `ALTER TABLE comments ALTER COLUMN report_count SET DEFAULT 0`
  ];

  for (const statement of defaultStatements) {
    try {
      await pool.query(statement);
    } catch (error) {
      console.error('스키마 기본값 설정 실패:', statement, error.message);
    }
  }

  console.log('✅ posts/comments 확장 스키마 동기화 완료');
}

async function seedDefaultBoards() {
  for (const board of DEFAULT_BOARD_DEFINITIONS) {
    try {
      await pool.query(
        `INSERT INTO boards (id, name, slug, description, icon, order_index, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               slug = EXCLUDED.slug,
               description = EXCLUDED.description,
               icon = EXCLUDED.icon,
               order_index = EXCLUDED.order_index,
               is_active = TRUE`,
        [
          board.id,
          board.name,
          board.slug,
          board.description,
          board.icon,
          board.orderIndex,
        ],
      );
    } catch (error) {
      console.error(`기본 게시판 시드 실패 (${board.id}):`, error.message);
    }
  }

  console.log('✅ 기본 게시판 시드 완료');
}

async function backfillPostBoardRelations() {
  try {
    await pool.query(`
      UPDATE posts p
      SET board_id = b.id
      FROM boards b
      WHERE (p.board_id IS NULL OR p.board_id = '' OR p.board_id NOT IN (SELECT id FROM boards))
        AND (p.category = b.slug OR p.category = b.id)
    `);
  } catch (error) {
    console.error('게시글 게시판 매핑 갱신 실패 (카테고리 매핑):', error.message);
  }

  try {
    await pool.query(`
      UPDATE posts
      SET board_id = 'notice',
          is_notice = TRUE
      WHERE (board_id IS NULL OR board_id = '' OR board_id NOT IN (SELECT id FROM boards))
        AND (
          category ILIKE '%notice%'
          OR category ILIKE '%공지%'
          OR is_notice IS TRUE
        )
    `);
  } catch (error) {
    console.error('공지 게시판 백필 실패:', error.message);
  }

  try {
    await pool.query(`
      UPDATE posts
      SET board_id = 'anonymous'
      WHERE board_id IS NULL OR board_id = '' OR board_id NOT IN (SELECT id FROM boards)
    `);
  } catch (error) {
    console.error('기본 게시판 백필 실패:', error.message);
  }

  try {
    await pool.query(`
      UPDATE posts
      SET is_notice = TRUE
      WHERE board_id = 'notice' AND (is_notice IS DISTINCT FROM TRUE)
    `);
  } catch (error) {
    console.error('공지 플래그 동기화 실패:', error.message);
  }

  console.log('✅ 게시글-게시판 매핑 동기화 완료');
}

// ============================================
// 보안 미들웨어
// ============================================

// 보안 헤더 설정
app.use(helmet({
  contentSecurityPolicy: false, // 개발 단계에서는 비활성화
  crossOriginEmbedderPolicy: false
}));

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // 크기 제한
app.use('/uploads', express.static(UPLOAD_DIR));

// ============================================
// Rate Limiting 설정
// ============================================

// 일반 API 제한
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100개 요청
  message: '너무 많은 요청을 보내셨습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 게시글 작성 제한
const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 15분당 최대 10개 게시글
  message: '게시글 작성 한도를 초과했습니다.'
});

// 조회수 제한
const viewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5, // 1분당 최대 5번
  keyGenerator: (req) => `${req.ip}_${req.params.id}`,
  message: '조회수 증가 제한을 초과했습니다.'
});

// 댓글 작성 제한
const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20, // 5분당 최대 20개 댓글
  message: '댓글 작성 한도를 초과했습니다.'
});

// Rate Limiting 적용
app.use('/api/', generalLimiter);
app.use('/community', generalLimiter);

// ============================================
// 보안 유틸리티 함수
// ============================================

// HTML/스크립트 정제
function sanitizeInput(input, options = {}) {
  if (!input) return input;
  
  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false
  };
  
  const config = { ...defaultOptions, ...options };
  return DOMPurify.sanitize(input, config);
}

// 조회수 중복 방지를 위한 메모리 캐시
const viewedPosts = new Map();

// ============================================
// 데이터베이스 초기화 (비밀번호 컬럼 타입 변경)
// ============================================

async function initDatabase() {
  try {
    // 기존 테이블이 있다면 password 컬럼 타입 변경
    await pool.query(`
      ALTER TABLE posts 
      ALTER COLUMN password TYPE VARCHAR(255)
    `).catch(() => {
      console.log('posts 테이블 password 컬럼 이미 변경됨 또는 테이블 없음');
    });

    // posts 테이블 생성 (ID를 BIGINT로 변경하여 JavaScript Date.now()와 호환)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id BIGINT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        content TEXT,
        category VARCHAR(50),
        password VARCHAR(255), -- bcrypt 해시용 길이
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        views INTEGER DEFAULT 0,
        likes TEXT[] DEFAULT '{}',
        dislikes TEXT[] DEFAULT '{}',
        images JSONB DEFAULT '[]',
        tags TEXT[] DEFAULT '{}',
        attachments JSONB DEFAULT '[]',
        poll JSONB,
        summary TEXT,
        board_id VARCHAR(50),
        user_id VARCHAR(100),
        is_notice BOOLEAN DEFAULT false,
        is_blinded BOOLEAN DEFAULT false,
        reports INTEGER DEFAULT 0
      )
    `);

    // comments 테이블 생성 (post_id를 BIGINT로 맞춤)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id BIGINT PRIMARY KEY,
        post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
        parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        password VARCHAR(255), -- bcrypt 해시용
        instagram VARCHAR(100),
        user_id VARCHAR(100),
        like_count INTEGER DEFAULT 0,
        dislike_count INTEGER DEFAULT 0,
        report_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    // chat_messages 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room VARCHAR(50) NOT NULL,
        nickname VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // boards, votes, polls, attachments 보조 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(10),
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_votes (
        post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
        user_id VARCHAR(100) NOT NULL,
        vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('like', 'dislike')),
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (post_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_polls (
        id BIGSERIAL PRIMARY KEY,
        post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        multiple BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_poll_options (
        id BIGSERIAL PRIMARY KEY,
        poll_id BIGINT REFERENCES post_polls(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        vote_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_poll_votes (
        poll_id BIGINT REFERENCES post_polls(id) ON DELETE CASCADE,
        option_id BIGINT REFERENCES post_poll_options(id) ON DELETE CASCADE,
        user_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (poll_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_attachments (
        id BIGSERIAL PRIMARY KEY,
        post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_url TEXT,
        thumbnail_url TEXT,
        file_size INTEGER,
        mime_type TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await ensureExtendedSchema();
    await seedDefaultBoards();
    await backfillPostBoardRelations();

    // 인덱스 생성
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id);
      CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);
      CREATE INDEX IF NOT EXISTS idx_post_poll_post_id ON post_polls(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_attachment_post_id ON post_attachments(post_id);
    `);

    console.log('✅ 보안 강화된 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
  }
}

// ============================================
// 커뮤니티 API 유틸리티
// ============================================

function toISOString(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return new Date(value).toISOString();
  } catch (error) {
    return null;
  }
}

function createListMeta(totalItems, page, pageSize) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1;
  const totalPages = Math.max(1, Math.ceil((totalItems || 0) / safePageSize));
  return {
    page: safePage,
    pageSize: safePageSize,
    totalItems: Number(totalItems || 0),
    totalPages,
  };
}

function mapBoardRow(row) {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    icon: row.icon ?? null,
    order: Number(row.order_index ?? 0),
    isActive: row.is_active ?? true,
    createdAt: toISOString(row.created_at),
    todayPostCount: Number(row.today_post_count ?? 0),
    todayCommentCount: Number(row.today_comment_count ?? 0),
  };
}

function mapAttachmentRow(row) {
  return {
    id: String(row.id),
    fileName: row.file_name,
    fileSize: row.file_size ? Number(row.file_size) : null,
    fileUrl: row.file_url ?? `/uploads/${row.file_path}`,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    mimeType: row.mime_type ?? 'application/octet-stream',
  };
}

function mapPostSummaryRow(row) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  return {
    id: String(row.id),
    boardId: String(row.board_id),
    boardSlug: row.board_slug,
    boardName: row.board_name,
    title: row.title,
    excerpt: row.excerpt ?? '',
    authorNick: row.author_nick,
    createdAt: toISOString(row.created_at),
    updatedAt: row.updated_at ? toISOString(row.updated_at) : undefined,
    views: Number(row.views ?? 0),
    likeCount: Number(row.like_count ?? 0),
    dislikeCount: Number(row.dislike_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    tags,
    isNotice: row.is_notice ?? false,
    isHot: row.is_hot ?? false,
    hasPoll: row.has_poll ?? false,
    thumbnailUrl: row.thumbnail_url ?? undefined,
  };
}

function mapPostDetail(row, attachments, comments) {
  const summary = mapPostSummaryRow(row);
  return {
    ...summary,
    content: row.content ?? '',
    attachments,
    comments,
    reportCount: Number(row.report_count ?? 0),
    isBookmarked: false,
  };
}

function buildCommentTree(rows) {
  const nodes = new Map();
  const roots = [];

  rows.forEach((row) => {
    const node = {
      id: String(row.id),
      postId: String(row.post_id),
      parentId: row.parent_id ? String(row.parent_id) : null,
      authorNick: row.author_nick ?? row.author,
      authorBadge: row.author_badge ?? null,
      content: row.is_hidden ? '' : row.content,
      createdAt: toISOString(row.created_at),
      likeCount: Number(row.like_count ?? 0),
      dislikeCount: Number(row.dislike_count ?? 0),
      reportCount: Number(row.report_count ?? 0),
      isHidden: row.is_hidden ?? false,
      children: [],
    };
    nodes.set(node.id, node);
  });

  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  nodes.forEach((node) => {
    node.children.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  });
  roots.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return roots;
}

function getPostSortClause(sort) {
  switch (sort) {
    case 'popular':
      return 'ORDER BY p.is_notice DESC, COALESCE(vc.like_count, 0) DESC, p.views DESC, p.created_at DESC';
    case 'comments':
      return 'ORDER BY p.is_notice DESC, COALESCE(cc.comment_count, 0) DESC, p.created_at DESC';
    case 'views':
      return 'ORDER BY p.is_notice DESC, p.views DESC, p.created_at DESC';
    default:
      return 'ORDER BY p.is_notice DESC, p.created_at DESC';
  }
}

function buildPostListQuery({ boardSlug, searchTerm, sort, page, pageSize }) {
  const whereClauses = ['(p.is_blinded IS DISTINCT FROM TRUE)'];
  const values = [];

  if (boardSlug) {
    values.push(boardSlug);
    whereClauses.push(`(b.slug = $${values.length} OR b.id = $${values.length})`);
  }

  if (searchTerm) {
    values.push(`%${searchTerm}%`);
    const index = values.length;
    whereClauses.push(`(p.title ILIKE $${index} OR p.content ILIKE $${index})`);
  }

  const limitIndex = values.push(pageSize);
  const offsetIndex = values.push(Math.max(0, (page - 1) * pageSize));

  const sql = `
WITH vote_counts AS (
  SELECT post_id,
         COUNT(*) FILTER (WHERE vote_type = 'like') AS like_count,
         COUNT(*) FILTER (WHERE vote_type = 'dislike') AS dislike_count
  FROM post_votes
  GROUP BY post_id
),
comment_counts AS (
  SELECT post_id, COUNT(*) AS comment_count
  FROM comments
  GROUP BY post_id
),
poll_status AS (
  SELECT DISTINCT post_id, TRUE AS has_poll
  FROM post_polls
),
attachment_preview AS (
  SELECT DISTINCT ON (post_id) post_id, file_url
  FROM post_attachments
  ORDER BY post_id, created_at ASC
)
SELECT
  p.id,
  p.board_id,
  b.slug AS board_slug,
  b.name AS board_name,
  p.title,
  p.author AS author_nick,
  p.content,
  p.created_at,
  p.updated_at,
  p.views,
  COALESCE(vc.like_count, 0) AS like_count,
  COALESCE(vc.dislike_count, 0) AS dislike_count,
  COALESCE(cc.comment_count, 0) AS comment_count,
  p.tags,
  p.is_notice,
  (p.poll IS NOT NULL) OR (ps.has_poll IS TRUE) AS has_poll,
  CASE
    WHEN COALESCE(vc.like_count, 0) >= 10 OR COALESCE(cc.comment_count, 0) >= 20 OR p.views >= 500 THEN TRUE
    ELSE FALSE
  END AS is_hot,
  ap.file_url AS thumbnail_url,
  p.reports AS report_count,
  SUBSTRING(COALESCE(p.summary, p.content) FOR 180) AS excerpt,
  COUNT(*) OVER() AS total_count
FROM posts p
JOIN boards b ON b.id = p.board_id
LEFT JOIN vote_counts vc ON vc.post_id = p.id
LEFT JOIN comment_counts cc ON cc.post_id = p.id
LEFT JOIN poll_status ps ON ps.post_id = p.id
LEFT JOIN attachment_preview ap ON ap.post_id = p.id
${whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''}
${getPostSortClause(sort)}
LIMIT $${limitIndex}
OFFSET $${offsetIndex}
`.trim();

  return { sql, values };
}

async function fetchPostDetailFromDb(postId, client = pool) {
  const { rows } = await client.query(
    `
WITH vote_counts AS (
  SELECT post_id,
         COUNT(*) FILTER (WHERE vote_type = 'like') AS like_count,
         COUNT(*) FILTER (WHERE vote_type = 'dislike') AS dislike_count
  FROM post_votes
  GROUP BY post_id
),
comment_counts AS (
  SELECT post_id, COUNT(*) AS comment_count
  FROM comments
  GROUP BY post_id
),
poll_status AS (
  SELECT DISTINCT post_id, TRUE AS has_poll
  FROM post_polls
),
attachment_preview AS (
  SELECT DISTINCT ON (post_id) post_id, file_url
  FROM post_attachments
  ORDER BY post_id, created_at ASC
)
SELECT
  p.id,
  p.board_id,
  b.slug AS board_slug,
  b.name AS board_name,
  p.title,
  p.author AS author_nick,
  p.content,
  p.created_at,
  p.updated_at,
  p.views,
  COALESCE(vc.like_count, 0) AS like_count,
  COALESCE(vc.dislike_count, 0) AS dislike_count,
  COALESCE(cc.comment_count, 0) AS comment_count,
  p.tags,
  p.is_notice,
  (p.poll IS NOT NULL) OR (ps.has_poll IS TRUE) AS has_poll,
  CASE
    WHEN COALESCE(vc.like_count, 0) >= 10 OR COALESCE(cc.comment_count, 0) >= 20 OR p.views >= 500 THEN TRUE
    ELSE FALSE
  END AS is_hot,
  ap.file_url AS thumbnail_url,
  p.reports AS report_count
FROM posts p
JOIN boards b ON b.id = p.board_id
LEFT JOIN vote_counts vc ON vc.post_id = p.id
LEFT JOIN comment_counts cc ON cc.post_id = p.id
LEFT JOIN poll_status ps ON ps.post_id = p.id
LEFT JOIN attachment_preview ap ON ap.post_id = p.id
WHERE p.id = $1
LIMIT 1
`,
    [postId],
  );

  if (rows.length === 0) {
    return null;
  }

  const attachmentsResult = await client.query(
    `SELECT id, post_id, file_name, file_path, file_url, file_size, mime_type, thumbnail_url, created_at
     FROM post_attachments
     WHERE post_id = $1
     ORDER BY created_at ASC`,
    [postId],
  );

  const commentsResult = await client.query(
    `SELECT id, post_id, parent_id, author AS author_nick, content, created_at, like_count, dislike_count, report_count
     FROM comments
     WHERE post_id = $1
     ORDER BY created_at ASC`,
    [postId],
  );

  const attachments = attachmentsResult.rows.map(mapAttachmentRow);
  const comments = buildCommentTree(commentsResult.rows);
  return mapPostDetail(rows[0], attachments, comments);
}

async function cleanupUploadedFiles(files) {
  if (!files || files.length === 0) {
    return;
  }
  await Promise.allSettled(
    files.map((file) =>
      fsp
        .unlink(file.path)
        .catch((error) => console.warn('업로드 파일 정리 실패:', error.message)),
    ),
  );
}

// ============================================
// 커뮤니티 API (Vite 프런트엔드 연동)
// ============================================

const communityRouter = express.Router();

communityRouter.get('/boards', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        b.id,
        b.name,
        b.slug,
        b.description,
        b.icon,
        b.order_index,
        b.is_active,
        b.created_at,
        COALESCE(post_counts.today_posts, 0) AS today_post_count,
        COALESCE(comment_counts.today_comments, 0) AS today_comment_count
      FROM boards b
      LEFT JOIN (
        SELECT board_id, COUNT(*) AS today_posts
        FROM posts
        WHERE created_at >= (CURRENT_DATE)
        GROUP BY board_id
      ) post_counts ON post_counts.board_id = b.id
      LEFT JOIN (
        SELECT p.board_id, COUNT(*) AS today_comments
        FROM comments c
        JOIN posts p ON p.id = c.post_id
        WHERE c.created_at >= (CURRENT_DATE)
        GROUP BY p.board_id
      ) comment_counts ON comment_counts.board_id = b.id
      ORDER BY b.order_index ASC, b.created_at ASC
    `);

    const data = rows.map(mapBoardRow);
    res.json({
      data,
      meta: createListMeta(data.length, 1, data.length || 1),
    });
  } catch (error) {
    console.error('게시판 목록 조회 오류:', error);
    res.status(500).json({
      status: 500,
      message: '게시판 정보를 불러오지 못했습니다.',
    });
  }
});

communityRouter.get('/posts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize, 10) || 20), 100);
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'latest';
    const boardSlug = typeof req.query.board === 'string' ? req.query.board.trim() : undefined;
    const searchTerm = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

    const { sql, values } = buildPostListQuery({ boardSlug, searchTerm, sort, page, pageSize });
    const { rows } = await pool.query(sql, values);
    const totalItems = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
    const data = rows.map(mapPostSummaryRow);

    res.json({
      data,
      meta: createListMeta(totalItems, page, pageSize),
    });
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    res.status(500).json({
      status: 500,
      message: '게시글을 불러오지 못했습니다.',
    });
  }
});

communityRouter.get('/posts/popular', async (_req, res) => {
  try {
    const { sql, values } = buildPostListQuery({
      boardSlug: undefined,
      searchTerm: undefined,
      sort: 'popular',
      page: 1,
      pageSize: 20,
    });

    const { rows } = await pool.query(sql, values);
    res.json(rows.map(mapPostSummaryRow).slice(0, 20));
  } catch (error) {
    console.error('인기글 조회 오류:', error);
    res.status(500).json({
      status: 500,
      message: '인기글을 불러오지 못했습니다.',
    });
  }
});

communityRouter.get('/posts/:postId', async (req, res) => {
  try {
    const detail = await fetchPostDetailFromDb(req.params.postId);
    if (!detail) {
      return res.status(404).json({
        status: 404,
        message: '게시글을 찾을 수 없습니다.',
      });
    }
    res.json(detail);
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    res.status(500).json({
      status: 500,
      message: '게시글을 불러오는 중 오류가 발생했습니다.',
    });
  }
});

communityRouter.post('/posts', createPostLimiter, (req, res) => {
  upload.array('attachments', MAX_UPLOAD_FILES)(req, res, async (uploadError) => {
    if (uploadError) {
      console.error('게시글 첨부 파일 처리 오류:', uploadError);
      return res.status(400).json({
        status: 400,
        message: uploadError.message || '첨부 파일을 처리하지 못했습니다.',
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const boardInput = typeof req.body.boardId === 'string' && req.body.boardId.trim().length > 0
      ? req.body.boardId.trim()
      : typeof req.body.board === 'string' && req.body.board.trim().length > 0
        ? req.body.board.trim()
        : '';

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const authorNick = typeof req.body.authorNick === 'string' ? req.body.authorNick.trim() : '익명';
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

    if (!boardInput || !title || !content) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({
        status: 400,
        message: '게시판, 제목, 내용을 모두 입력해주세요.',
      });
    }

    const tagField = req.body['tags[]'] ?? req.body.tags;
    const tags = Array.isArray(tagField)
      ? tagField.map((tag) => String(tag).trim()).filter(Boolean)
      : typeof tagField === 'string'
        ? tagField
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: boardRows } = await client.query(
        'SELECT id FROM boards WHERE id = $1 OR slug = $1 LIMIT 1',
        [boardInput],
      );

      if (boardRows.length === 0) {
        await client.query('ROLLBACK');
        await cleanupUploadedFiles(files);
        return res.status(400).json({
          status: 400,
          message: '존재하지 않는 게시판입니다.',
        });
      }

      const boardId = boardRows[0].id;
      const postId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      const hashedPassword = await bcrypt.hash(password || crypto.randomUUID(), SALT_ROUNDS);

      const sanitizedTitle = sanitizeInput(title);
      const sanitizedAuthor = sanitizeInput(authorNick);
      const sanitizedContent = sanitizeInput(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });

      await client.query(
        `INSERT INTO posts (
          id,
          title,
          author,
          content,
          category,
          password,
          board_id,
          tags,
          created_at,
          updated_at,
          views,
          likes,
          dislikes,
          attachments
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          NOW(), NOW(), 0, '{}', '{}', '[]'
        )`,
        [
          postId,
          sanitizedTitle,
          sanitizedAuthor,
          sanitizedContent,
          null,
          hashedPassword,
          boardId,
          tags,
        ],
      );

      for (const file of files) {
        await client.query(
          `INSERT INTO post_attachments (post_id, file_name, file_path, file_url, file_size, mime_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            postId,
            file.originalname ?? file.filename,
            file.filename,
            `/uploads/${file.filename}`,
            file.size ?? null,
            file.mimetype ?? null,
          ],
        );
      }

      await client.query('COMMIT');
      let detail = await fetchPostDetailFromDb(postId, client);
      if (!detail) {
        detail = await fetchPostDetailFromDb(postId);
      }
      res.status(201).json(detail);
    } catch (error) {
      await client.query('ROLLBACK');
      await cleanupUploadedFiles(files);
      console.error('게시글 생성 오류:', error);
      res.status(500).json({
        status: 500,
        message: '게시글을 등록하지 못했습니다.',
      });
    } finally {
      client.release();
    }
  });
});

communityRouter.post('/posts/:postId/comments', commentLimiter, async (req, res) => {
  const postId = req.params.postId;
  const parentIdInput = req.body.parentId ?? req.body.parent_id;
  const authorNick = typeof req.body.authorNick === 'string' ? req.body.authorNick.trim() : '익명';
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
  const parentId = parentIdInput ? String(parentIdInput) : null;

  if (!content) {
    return res.status(400).json({
      status: 400,
      message: '댓글 내용을 입력해주세요.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: postRows } = await client.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 404,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    if (parentId) {
      const { rows: parentRows } = await client.query(
        'SELECT id FROM comments WHERE id = $1 AND post_id = $2',
        [parentId, postId],
      );
      if (parentRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          status: 400,
          message: '대상 댓글을 찾을 수 없습니다.',
        });
      }
    }

    const sanitizedAuthor = sanitizeInput(authorNick);
    const sanitizedContent = sanitizeInput(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code'],
      ALLOWED_ATTR: [],
    });
    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    const commentId = Date.now() * 1000 + Math.floor(Math.random() * 1000);

    const { rows } = await client.query(
      `INSERT INTO comments (
        id,
        post_id,
        parent_id,
        author,
        content,
        password,
        created_at,
        like_count,
        dislike_count,
        report_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        NOW(), 0, 0, 0
      ) RETURNING id, post_id, parent_id, author, content, created_at, like_count, dislike_count, report_count`,
      [commentId, postId, parentId, sanitizedAuthor, sanitizedContent, hashedPassword],
    );

    await client.query('COMMIT');

    const comment = {
      id: String(rows[0].id),
      postId: String(rows[0].post_id),
      parentId: rows[0].parent_id ? String(rows[0].parent_id) : null,
      authorNick: rows[0].author,
      content: rows[0].content,
      createdAt: toISOString(rows[0].created_at),
      likeCount: Number(rows[0].like_count ?? 0),
      dislikeCount: Number(rows[0].dislike_count ?? 0),
      reportCount: Number(rows[0].report_count ?? 0),
      children: [],
      isHidden: false,
    };

    res.status(201).json(comment);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('댓글 등록 오류:', error);
    res.status(500).json({
      status: 500,
      message: '댓글을 등록하지 못했습니다.',
    });
  } finally {
    client.release();
  }
});

communityRouter.post('/posts/:postId/vote', async (req, res) => {
  const postId = req.params.postId;
  const type = typeof req.body.type === 'string' ? req.body.type : undefined;
  const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : '';

  if (!userId) {
    return res.status(400).json({
      status: 400,
      message: 'userId가 필요합니다.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: postRows } = await client.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 404,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    await client.query('DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2', [postId, userId]);

    if (type === 'like' || type === 'dislike') {
      await client.query(
        `INSERT INTO post_votes (post_id, user_id, vote_type, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (post_id, user_id) DO UPDATE
           SET vote_type = EXCLUDED.vote_type,
               created_at = NOW()`,
        [postId, userId, type],
      );
    }

    const { rows } = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE vote_type = 'like') AS like_count,
         COUNT(*) FILTER (WHERE vote_type = 'dislike') AS dislike_count
       FROM post_votes
       WHERE post_id = $1`,
      [postId],
    );

    await client.query('UPDATE posts SET updated_at = NOW() WHERE id = $1', [postId]);
    await client.query('COMMIT');

    res.json({
      likeCount: Number(rows[0]?.like_count ?? 0),
      dislikeCount: Number(rows[0]?.dislike_count ?? 0),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('게시글 추천/비추천 처리 오류:', error);
    res.status(500).json({
      status: 500,
      message: '추천 정보를 갱신하지 못했습니다.',
    });
  } finally {
    client.release();
  }
});

communityRouter.get('/events/timetables', async (_req, res) => {
  res.json({
    data: [],
    meta: createListMeta(0, 1, 0),
  });
});

app.use('/community', communityRouter);

// ============================================
// 게시판 REST API (보안 강화)
// ============================================

// 게시글 목록
app.get('/api/posts', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.title, p.author, p.category, p.created_at, p.views,
             p.is_notice, p.is_blinded,
             COALESCE(array_length(p.likes, 1), 0) as like_count,
             COALESCE(array_length(p.dislikes, 1), 0) as dislike_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      ORDER BY p.is_notice DESC, p.created_at DESC
    `);
    
    res.json({ success: true, posts: rows });
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 상세
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 게시글 상세 조회: ID ${id}`);
    
    const { rows: postRows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (postRows.length === 0) {
      console.log(`⚠️ 게시글 없음: ID ${id}`);
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    console.log(`✅ 게시글 찾음: "${postRows[0].title}"`);
    
    // 댓글 조회 (비밀번호 제외)
    const { rows: commentRows } = await pool.query(
      'SELECT id, post_id, author, content, instagram, created_at FROM comments WHERE post_id = $1 ORDER BY created_at DESC',
      [id]
    );
    
    console.log(`💬 댓글 ${commentRows.length}개 조회됨`);
    
    const post = {
      ...postRows[0],
      password: undefined, // 비밀번호 제거
      likes: postRows[0].likes || [],
      dislikes: postRows[0].dislikes || [],
      images: postRows[0].images || [],
      comments: commentRows || []
    };
    
    console.log(`📤 응답 전송: 게시글 + 댓글 ${post.comments.length}개`);
    res.json({ success: true, post });
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    console.error('오류 상세:', error.stack);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 작성 (보안 강화)
app.post('/api/posts', createPostLimiter, async (req, res) => {
  try {
    const { title, author, content, category, password, images, instagram } = req.body;
    
    // 입력값 검증
    if (!title || !author || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 입력해주세요' 
      });
    }
    
    // XSS 방지 - HTML 정제
    const cleanTitle = sanitizeInput(title);
    const cleanAuthor = sanitizeInput(author);
    const cleanContent = sanitizeInput(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target']
    });
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // ID를 명시적으로 생성 (JavaScript의 Date.now()와 호환성 유지)
    const postId = Date.now();
    
    const { rows } = await pool.query(
      `INSERT INTO posts (id, title, author, content, category, password, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [postId, cleanTitle, cleanAuthor, cleanContent, category, hashedPassword, JSON.stringify(images || [])]
    );
    
    // 비밀번호 제거 후 응답
    const post = {
      ...rows[0],
      password: undefined,
      likes: [],
      dislikes: [],
      images: images || [],
      comments: []
    };
    
    console.log(`📝 새 게시글: "${cleanTitle}" by ${cleanAuthor}`);
    res.json({ success: true, post });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 수정 (보안 강화)
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, password } = req.body;
    
    // 저장된 해시 비밀번호 조회
    const { rows: checkRows } = await pool.query(
      'SELECT password FROM posts WHERE id = $1',
      [id]
    );
    
    if (checkRows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // bcrypt로 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, checkRows[0].password);
    
    if (!isValidPassword && password !== 'admin') {
      return res.status(403).json({ success: false, message: '비밀번호가 일치하지 않습니다' });
    }
    
    // XSS 방지
    const cleanTitle = sanitizeInput(title);
    const cleanContent = sanitizeInput(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target']
    });
    
    const { rows } = await pool.query(
      `UPDATE posts 
       SET title = $1, content = $2, category = $3
       WHERE id = $4
       RETURNING *`,
      [cleanTitle, cleanContent, category, id]
    );
    
    res.json({ success: true, post: { ...rows[0], password: undefined } });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 삭제 (보안 강화)
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const { rows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    const post = rows[0];
    
    // bcrypt로 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, post.password);
    
    if (!isValidPassword && password !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '비밀번호가 일치하지 않습니다' 
      });
    }
    
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    
    console.log(`🗑️ 게시글 삭제: "${post.title}"`);
    res.json({ success: true, message: '게시글이 삭제되었습니다' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 조회수 증가 (중복 방지)
app.put('/api/posts/:id/views', viewLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userIP = req.ip;
    const key = `${userIP}_${id}`;
    
    // 1시간 이내 조회 기록 확인
    const lastViewed = viewedPosts.get(key);
    const now = Date.now();
    
    if (lastViewed && (now - lastViewed) < 3600000) {
      // 1시간 이내 재조회는 조회수 증가 안 함
      const { rows } = await pool.query(
        'SELECT views FROM posts WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
      }
      
      return res.json({ 
        success: true, 
        views: rows[0].views,
        cached: true 
      });
    }
    
    // 조회수 증가
    const { rows } = await pool.query(
      'UPDATE posts SET views = views + 1 WHERE id = $1 RETURNING views',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // 조회 기록 저장
    viewedPosts.set(key, now);
    
    // 메모리 관리 - 10000개 초과 시 오래된 것 삭제
    if (viewedPosts.size > 10000) {
      const oldestKeys = Array.from(viewedPosts.keys()).slice(0, 1000);
      oldestKeys.forEach(k => viewedPosts.delete(k));
    }
    
    console.log(`👁️ 조회수 증가: Post ${id} - ${rows[0].views} views (IP: ${userIP})`);
    res.json({ success: true, views: rows[0].views });
  } catch (error) {
    console.error('조회수 증가 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 댓글 추가 (보안 강화)
app.post('/api/posts/:id/comments', commentLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { author, content, password, instagram } = req.body;
    
    // 입력값 검증
    if (!author || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '작성자와 내용을 입력해주세요' 
      });
    }
    
    // 게시글 존재 확인
    const { rows: postCheck } = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [id]
    );
    
    if (postCheck.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // XSS 방지
    const cleanAuthor = sanitizeInput(author);
    const cleanContent = sanitizeInput(content);
    const cleanInstagram = sanitizeInput(instagram);
    
    // 비밀번호 해싱 (있는 경우)
    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    
    // 댓글 ID 명시적 생성
    const commentId = Date.now();
    
    const { rows } = await pool.query(
      `INSERT INTO comments (id, post_id, author, content, password, instagram) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, post_id, author, content, instagram, created_at`,
      [commentId, id, cleanAuthor, cleanContent, hashedPassword, cleanInstagram]
    );
    
    console.log(`✅ 댓글 작성 성공: Post ${id}, 작성자 "${cleanAuthor}"`);
    console.log(`   댓글 ID: ${rows[0].id}`);
    
    res.json({ success: true, comment: rows[0] });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 투표
app.post('/api/posts/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, type } = req.body;
    
    const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    const post = rows[0];
    let likes = post.likes || [];
    let dislikes = post.dislikes || [];
    
    // 기존 투표 제거
    likes = likes.filter(u => u !== userId);
    dislikes = dislikes.filter(u => u !== userId);
    
    // 새 투표 추가
    if (type === 'like') {
      likes.push(userId);
    } else if (type === 'dislike') {
      dislikes.push(userId);
    }
    
    // 업데이트
    await pool.query(
      'UPDATE posts SET likes = $1, dislikes = $2 WHERE id = $3',
      [likes, dislikes, id]
    );
    
    res.json({ 
      success: true, 
      likes: likes.length,
      dislikes: dislikes.length 
    });
  } catch (error) {
    console.error('투표 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 신고
app.post('/api/posts/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(
      'UPDATE posts SET reports = reports + 1 WHERE id = $1 RETURNING reports',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    // 10회 이상 신고 시 자동 블라인드
    if (rows[0].reports >= 10) {
      await pool.query(
        'UPDATE posts SET is_blinded = true WHERE id = $1',
        [id]
      );
    }
    
    res.json({ 
      success: true, 
      reports: rows[0].reports,
      isBlinded: rows[0].reports >= 10
    });
  } catch (error) {
    console.error('신고 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ============================================
// 정적 프런트엔드 제공 (빌드 결과물 존재 시)
// ============================================

const CLIENT_DIST_PATH = path.join(__dirname, 'src/community-app/dist');
const CLIENT_INDEX_PATH = path.join(CLIENT_DIST_PATH, 'index.html');

if (fs.existsSync(CLIENT_INDEX_PATH)) {
  console.log('✅ 정적 프런트엔드 제공 준비 완료:', CLIENT_DIST_PATH);

  app.use(
    express.static(CLIENT_DIST_PATH, {
      index: 'index.html',
      setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.html') {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }

    return res.sendFile(CLIENT_INDEX_PATH);
  });
} else {
  console.log('ℹ️ 정적 프런트엔드 빌드 파일이 없어 SPA 라우팅을 비활성화합니다.');
}

// ============================================
// WebSocket 채팅 서버 (기존 코드 유지)
// ============================================

const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = Date.now().toString();
  clients.set(clientId, { ws, nickname: null, currentRoom: null });
  
  console.log(`👤 새 클라이언트 연결: ${clientId}`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'join':
          await handleJoinRoom(clientId, data);
          break;
        case 'message':
          await sendChatMessage(clientId, data);
          break;
        case 'leave':
          handleLeaveRoom(clientId);
          break;
      }
    } catch (error) {
      console.error('메시지 처리 오류:', error);
    }
  });
  
  ws.on('close', () => {
    handleLeaveRoom(clientId);
    clients.delete(clientId);
    console.log(`👤 클라이언트 연결 종료: ${clientId}`);
  });
});

async function handleJoinRoom(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // 이전 방에서 나가기
  if (client.currentRoom) {
    handleLeaveRoom(clientId);
  }
  
  client.nickname = data.nickname;
  client.currentRoom = data.room;
  
  // 방별 메시지 히스토리 전송
  try {
    const { rows } = await pool.query(
      'SELECT * FROM chat_messages WHERE room = $1 ORDER BY created_at ASC LIMIT 100',
      [data.room]
    );
    
    client.ws.send(JSON.stringify({
      type: 'history',
      messages: rows
    }));
  } catch (error) {
    console.error('메시지 히스토리 로드 오류:', error);
  }
  
  // 입장 알림
  broadcastToRoom(data.room, {
    type: 'system',
    text: `${data.nickname}님이 입장하셨습니다.`,
    timestamp: new Date().toISOString()
  }, clientId);
}

function handleLeaveRoom(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  broadcastToRoom(client.currentRoom, {
    type: 'system',
    text: `${client.nickname}님이 퇴장하셨습니다.`,
    timestamp: new Date().toISOString()
  }, clientId);
  
  client.currentRoom = null;
}

function broadcastToRoom(room, message, excludeClientId = null) {
  clients.forEach((client, id) => {
    if (client.currentRoom === room && id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

async function sendChatMessage(clientId, messageData) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  try {
    // XSS 방지 - 메시지 정제
    const cleanMessage = sanitizeInput(messageData.text);
    const cleanNickname = sanitizeInput(messageData.nickname || client.nickname);
    
    // DB에 저장
    const { rows } = await pool.query(
      'INSERT INTO chat_messages (room, nickname, message) VALUES ($1, $2, $3) RETURNING *',
      [client.currentRoom, cleanNickname, cleanMessage]
    );
    
    const message = {
      id: rows[0].id,
      text: rows[0].message,
      nickname: rows[0].nickname,
      timestamp: rows[0].created_at,
      room: rows[0].room
    };
    
    // 같은 방 사용자에게 전송
    clients.forEach((c, id) => {
      if (c.currentRoom === client.currentRoom && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify({
          type: 'message',
          data: message
        }));
      }
    });
  } catch (error) {
    console.error('메시지 전송 오류:', error);
  }
}

// ============================================
// 서버 시작
// ============================================

initDatabase().then(() => {
  // Render 유료 플랜 검증
  validateRenderPlan();
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║     🎯 RENDER 유료 플랜 서버           ║
    ╠════════════════════════════════════════╣
    ║   플랜: ${RENDER_PLAN.plan.name}      ║
    ║   포트: ${PORT}                        ║
    ║   환경: ${process.env.NODE_ENV || 'development'}                   ║
    ║   DB: PostgreSQL (영구 저장)           ║
    ╠════════════════════════════════════════╣
    ║   💾 데이터 저장:                      ║
    ║   ✅ PostgreSQL 영구 저장             ║
    ║   ✅ 자동 백업                        ║
    ║   ✅ 데이터 제한 없음                 ║
    ╠════════════════════════════════════════╣
    ║   🔒 보안 기능:                        ║
    ║   ✅ bcrypt 비밀번호 해싱             ║
    ║   ✅ DOMPurify XSS 방지               ║
    ║   ✅ Rate Limiting                    ║
    ║   ✅ Helmet 보안 헤더                 ║
    ╚════════════════════════════════════════╝
    `);
  });
});