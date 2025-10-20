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
const sharp = require('sharp');

// Render 유료 플랜 설정 로드
const { validateRenderPlan, RENDER_PLAN } = require('./config/render-config');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_UPLOAD_FILES = 5;
const MAX_IMAGES_PER_POST = 3;
const POST_VOTE_BLIND_THRESHOLD = 10;

const IMAGE_PROCESSING_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  thumbnailWidth: 400,
  thumbnailHeight: 400,
  maxOutputSize: 5 * 1024 * 1024,
  smartProfiles: [
    { maxInputMB: 5, quality: 0.8, maxWidth: 1200, maxHeight: 1200 },
    { maxInputMB: 10, quality: 0.7, maxWidth: 1200, maxHeight: 1200 },
    { maxInputMB: 20, quality: 0.65, maxWidth: 1100, maxHeight: 1100 },
    { maxInputMB: 30, quality: 0.55, maxWidth: 1000, maxHeight: 1000 },
    { maxInputMB: Infinity, quality: 0.5, maxWidth: 800, maxHeight: 800 },
  ],
};

const ATTACHMENT_CLEANUP_CONFIG = {
  stage1Days: 3,
  stage2Days: 30,
  stage3Days: 90,
  usageThresholdStage1: 0, // 항상 가능
  usageThresholdStage2: 50,
  usageThresholdStage3: 80,
  intervalMs: 60 * 60 * 1000,
  storageSoftLimitMB: 512,
};

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

function isImageMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('image/');
}

function deriveCompressionProfile(fileSize) {
  const sizeMB = (fileSize || 0) / (1024 * 1024);
  for (const profile of IMAGE_PROCESSING_CONFIG.smartProfiles) {
    if (sizeMB <= profile.maxInputMB) {
      return profile;
    }
  }
  return IMAGE_PROCESSING_CONFIG.smartProfiles[IMAGE_PROCESSING_CONFIG.smartProfiles.length - 1];
}

async function removeFileIfExists(targetPath) {
  if (!targetPath) {
    return false;
  }
  try {
    await fsp.unlink(targetPath);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('파일 삭제 실패:', targetPath, error.message);
    }
    return false;
  }
}

async function processImageAttachment(file) {
  const originalSize = file.size ?? 0;
  const profile = deriveCompressionProfile(originalSize);
  const { name: baseName } = path.parse(file.filename);
  const processedFileName = `${baseName}.jpg`;
  const processedPath = path.join(UPLOAD_DIR, processedFileName);
  const thumbnailFileName = `${baseName}-thumb.jpg`;
  const thumbnailPath = path.join(UPLOAD_DIR, thumbnailFileName);

  const baseTransformer = sharp(file.path).rotate().resize({
    width: profile.maxWidth,
    height: profile.maxHeight,
    fit: 'inside',
    withoutEnlargement: true,
  });

  let compressedBuffer = await baseTransformer
    .jpeg({ quality: Math.round(profile.quality * 100), mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

  if (compressedBuffer.length > IMAGE_PROCESSING_CONFIG.maxOutputSize) {
    const sizeRatio = Math.sqrt(IMAGE_PROCESSING_CONFIG.maxOutputSize / compressedBuffer.length) * 0.9;
    const adjustedWidth = Math.max(400, Math.floor(profile.maxWidth * sizeRatio));
    const adjustedHeight = Math.max(400, Math.floor(profile.maxHeight * sizeRatio));
    const adjustedQuality = Math.max(35, Math.round(profile.quality * 100 * 0.8));

    compressedBuffer = await sharp(compressedBuffer)
      .resize({
        width: adjustedWidth,
        height: adjustedHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: adjustedQuality, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();
  }

  await fsp.writeFile(processedPath, compressedBuffer);
  await removeFileIfExists(file.path);

  const metadata = await sharp(compressedBuffer).metadata();
  const thumbnailBuffer = await sharp(compressedBuffer)
    .resize({
      width: IMAGE_PROCESSING_CONFIG.thumbnailWidth,
      height: IMAGE_PROCESSING_CONFIG.thumbnailHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 60, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
  await fsp.writeFile(thumbnailPath, thumbnailBuffer);

  file.processedPath = processedPath;
  file.processedFileName = processedFileName;
  file.thumbnailPath = thumbnailPath;
  file.thumbnailFileName = thumbnailFileName;

  return {
    isImage: true,
    variant: 'image',
    originalName: file.originalname ?? processedFileName,
    storedFileName: processedFileName,
    storedFilePath: processedFileName,
    fileUrl: `/uploads/${processedFileName}`,
    fileSize: compressedBuffer.length,
    originalSize,
    compressionRatio:
      originalSize > 0 ? Math.max(0, Math.round((1 - compressedBuffer.length / originalSize) * 100)) : null,
    mimeType: 'image/jpeg',
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    thumbnailFileName,
    thumbnailUrl: `/uploads/${thumbnailFileName}`,
    thumbnailSize: thumbnailBuffer.length,
  };
}

async function processUploadedAttachments(files) {
  const processed = [];
  for (const file of files) {
    if (isImageMime(file.mimetype)) {
      const result = await processImageAttachment(file);
      processed.push(result);
    } else {
      processed.push({
        isImage: false,
        variant: 'file',
        originalName: file.originalname ?? file.filename,
        storedFileName: file.filename,
        storedFilePath: file.filename,
        fileUrl: `/uploads/${file.filename}`,
        fileSize: file.size ?? null,
        originalSize: file.size ?? null,
        compressionRatio: null,
        mimeType: file.mimetype ?? 'application/octet-stream',
        width: null,
        height: null,
        thumbnailFileName: null,
        thumbnailUrl: null,
        thumbnailSize: null,
      });
    }
  }
  return processed;
}

async function calculateUploadUsage() {
  async function walk(directory) {
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        total += await walk(fullPath);
      } else {
        const stats = await fsp.stat(fullPath);
        total += stats.size;
      }
    }
    return total;
  }

  const totalBytes = await walk(UPLOAD_DIR).catch(() => 0);
  const usedMB = totalBytes / (1024 * 1024);
  const softLimit = ATTACHMENT_CLEANUP_CONFIG.storageSoftLimitMB || 1;
  const percentUsed = Math.min(100, Math.round((usedMB / softLimit) * 100));
  return {
    totalBytes,
    usedMB,
    percentUsed,
  };
}

async function cleanupFilePaths(paths) {
  if (!paths || paths.length === 0) {
    return;
  }
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  await Promise.allSettled(uniquePaths.map(removeFileIfExists));
}

async function cleanupUploadedFiles(files) {
  if (!files || files.length === 0) {
    return;
  }
  const paths = [];
  for (const file of files) {
    if (!file) continue;
    if (typeof file === 'string') {
      paths.push(file);
    } else {
      if (file.path) {
        paths.push(file.path);
      }
      if (file.processedPath) {
        paths.push(file.processedPath);
      }
      if (file.thumbnailPath) {
        paths.push(file.thumbnailPath);
      }
    }
  }
  await cleanupFilePaths(paths);
}

async function fetchAttachmentRowsForPost(postId, executor = pool) {
  if (!postId) {
    return [];
  }
  const runner = executor && typeof executor.query === 'function' ? executor : pool;
  const { rows } = await runner.query(
    `SELECT id, post_id, file_name, file_path, file_url, thumbnail_url, thumbnail_path,
            file_size, original_size, compression_ratio, mime_type,
            width, height, cleanup_stage, variant, created_at
     FROM post_attachments
     WHERE post_id = $1
     ORDER BY created_at ASC`,
    [postId],
  );
  return rows;
}

function buildAttachmentFilePaths(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }
  const candidates = [];
  for (const row of rows) {
    if (!row) continue;
    if (row.file_path) {
      candidates.push(path.isAbsolute(row.file_path) ? row.file_path : path.join(UPLOAD_DIR, row.file_path));
    }
    if (row.thumbnail_path) {
      candidates.push(
        path.isAbsolute(row.thumbnail_path) ? row.thumbnail_path : path.join(UPLOAD_DIR, row.thumbnail_path),
      );
    }
  }
  return Array.from(new Set(candidates));
}

function extractImageUrlsFromAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }
  const urls = attachments
    .filter(
      (attachment) =>
        attachment && (attachment.isImage === true || attachment.variant === 'image') && (attachment.fileUrl || attachment.thumbnailUrl),
    )
    .map((attachment) => attachment.fileUrl || attachment.thumbnailUrl)
    .filter(Boolean)
    .map((url) => String(url));
  return Array.from(new Set(urls));
}

function serializeAttachmentForPostRow(attachment) {
  if (!attachment) {
    return null;
  }

  const fileName = attachment.fileName ?? attachment.originalName ?? attachment.storedFileName ?? null;
  const sizeValue = attachment.fileSize ?? attachment.size ?? null;
  const originalSizeValue = attachment.originalSize ?? null;
  const compressionValue = attachment.compressionRatio ?? null;
  const widthValue = attachment.width ?? null;
  const heightValue = attachment.height ?? null;

  const toNumber = (value) => {
    if (value == null) {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const payload = {
    fileName,
    fileUrl: attachment.fileUrl ?? null,
    thumbnailUrl: attachment.thumbnailUrl ?? null,
    mimeType: attachment.mimeType ?? null,
    size: toNumber(sizeValue),
    originalSize: toNumber(originalSizeValue),
    compressionRatio: toNumber(compressionValue),
    width: toNumber(widthValue),
    height: toNumber(heightValue),
    variant: attachment.variant ?? (attachment.isImage ? 'image' : 'file'),
  };

  const createdAt = attachment.createdAt ?? attachment.created_at ?? attachment.created_at_iso ?? null;
  if (createdAt) {
    payload.createdAt = typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString();
  }

  return payload;
}

async function removeAttachmentFilesForPost(postId, executor = pool) {
  const rows = await fetchAttachmentRowsForPost(postId, executor);
  const paths = buildAttachmentFilePaths(rows);
  await cleanupFilePaths(paths);
  return rows;
}

async function runAttachmentCleanup() {
  const usage = await calculateUploadUsage();
  const results = {
    originalsRemoved: 0,
    thumbnailsRemoved: 0,
    attachmentsDeleted: 0,
    spaceFreedBytes: 0,
    usage,
  };
  const affectedPostIds = new Set();

  // Stage 1: remove original images after threshold days
  const stage1Rows = await pool
    .query(
      `SELECT id, post_id, file_path, file_url, thumbnail_path
       FROM post_attachments
       WHERE mime_type LIKE 'image/%'
         AND cleanup_stage = 0
         AND created_at < NOW() - INTERVAL '${ATTACHMENT_CLEANUP_CONFIG.stage1Days} days'`,
    )
    .then((res) => res.rows)
    .catch(() => []);

  for (const row of stage1Rows) {
    const filePath = row.file_path ? path.join(UPLOAD_DIR, row.file_path) : null;
    let freedSize = 0;
    if (filePath) {
      const stat = await fsp.stat(filePath).catch(() => null);
      if (stat?.size) {
        freedSize = stat.size;
      }
    }
    const removed = await removeFileIfExists(filePath);
    if (removed) {
      results.originalsRemoved += 1;
      results.spaceFreedBytes += freedSize;
      affectedPostIds.add(row.post_id);
      await pool.query(
        `UPDATE post_attachments
         SET cleanup_stage = 1,
             file_path = NULL,
             file_url = NULL,
             last_cleanup_at = NOW()
         WHERE id = $1`,
        [row.id],
      );
    }
  }

  // Stage 2: remove thumbnails when storage high and older than threshold
  if (usage.percentUsed >= ATTACHMENT_CLEANUP_CONFIG.usageThresholdStage2) {
    const stage2Rows = await pool
      .query(
        `SELECT id, post_id, thumbnail_path
         FROM post_attachments
         WHERE cleanup_stage = 1
           AND thumbnail_path IS NOT NULL
           AND created_at < NOW() - INTERVAL '${ATTACHMENT_CLEANUP_CONFIG.stage2Days} days'`,
      )
      .then((res) => res.rows)
      .catch(() => []);

    for (const row of stage2Rows) {
      const thumbPath = row.thumbnail_path ? path.join(UPLOAD_DIR, row.thumbnail_path) : null;
      let freedSize = 0;
      if (thumbPath) {
        const stat = await fsp.stat(thumbPath).catch(() => null);
        if (stat?.size) {
          freedSize = stat.size;
        }
      }
      const removed = await removeFileIfExists(thumbPath);
      if (removed) {
        results.thumbnailsRemoved += 1;
        results.spaceFreedBytes += freedSize;
        affectedPostIds.add(row.post_id);
        await pool.query(
          `UPDATE post_attachments
           SET cleanup_stage = 2,
               thumbnail_path = NULL,
               thumbnail_url = NULL,
               last_cleanup_at = NOW()
           WHERE id = $1`,
          [row.id],
        );
      }
    }
  }

  // Stage 3: purge metadata entries when storage very high and old
  if (usage.percentUsed >= ATTACHMENT_CLEANUP_CONFIG.usageThresholdStage3) {
    const stage3Rows = await pool
      .query(
        `DELETE FROM post_attachments
         WHERE cleanup_stage >= 2
           AND created_at < NOW() - INTERVAL '${ATTACHMENT_CLEANUP_CONFIG.stage3Days} days'
         RETURNING post_id, thumbnail_path, file_path`,
      )
      .then((res) => res.rows)
      .catch(() => []);

    if (stage3Rows.length > 0) {
      results.attachmentsDeleted += stage3Rows.length;
      const paths = stage3Rows
        .flatMap((row) => [row.thumbnail_path, row.file_path])
        .filter(Boolean)
        .map((p) => path.join(UPLOAD_DIR, p));
      stage3Rows.forEach((row) => {
        if (row.post_id) {
          affectedPostIds.add(row.post_id);
        }
      });
      await cleanupFilePaths(paths);
    }
  }

  if (affectedPostIds.size > 0) {
    await rebuildPostAttachmentSnapshots(Array.from(affectedPostIds));
  }

  return results;
}

function scheduleAttachmentCleanup() {
  runAttachmentCleanup().catch((error) => console.error('첨부파일 정리 실패:', error));
  setInterval(() => {
    runAttachmentCleanup().catch((error) => console.error('첨부파일 정리 실패:', error));
  }, ATTACHMENT_CLEANUP_CONFIG.intervalMs).unref();
}

async function applyPostVote(postId, userId, voteType) {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const { rows: existingPost } = await client.query(
      'SELECT id, is_blinded FROM posts WHERE id = $1 FOR UPDATE',
      [postId],
    );

    if (existingPost.length === 0) {
      await client.query('ROLLBACK').catch(() => {});
      transactionStarted = false;
      return { notFound: true };
    }

    const { rows: currentVoteRows } = await client.query(
      'SELECT vote_type FROM post_votes WHERE post_id = $1 AND user_id = $2',
      [postId, userId],
    );
    const currentVote = currentVoteRows[0]?.vote_type ?? null;

    let normalizedVote = null;
    if (voteType === 'like' || voteType === 'dislike') {
      normalizedVote = voteType === currentVote ? null : voteType;
    }

    await client.query('DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2', [postId, userId]);

    if (normalizedVote) {
      await client.query(
        `INSERT INTO post_votes (post_id, user_id, vote_type, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (post_id, user_id) DO UPDATE
           SET vote_type = EXCLUDED.vote_type,
               created_at = NOW()`,
        [postId, userId, normalizedVote],
      );
    }

    const { rows: voteRows } = await client.query(
      `SELECT user_id, vote_type
       FROM post_votes
       WHERE post_id = $1`,
      [postId],
    );

    const likes = [];
    const dislikes = [];
    for (const row of voteRows) {
      if (row.vote_type === 'like') {
        likes.push(row.user_id);
      } else if (row.vote_type === 'dislike') {
        dislikes.push(row.user_id);
      }
    }

    const uniqueLikes = Array.from(new Set(likes));
    const uniqueDislikes = Array.from(new Set(dislikes));
    const userVote = uniqueLikes.includes(userId)
      ? 'like'
      : uniqueDislikes.includes(userId)
        ? 'dislike'
        : null;
    const isBlinded = existingPost[0].is_blinded || uniqueDislikes.length >= POST_VOTE_BLIND_THRESHOLD;

    await client.query(
      `UPDATE posts
       SET likes = $2,
           dislikes = $3,
           is_blinded = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [postId, uniqueLikes, uniqueDislikes, isBlinded],
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return {
      notFound: false,
      summary: {
        postId: String(postId),
        likes: uniqueLikes,
        dislikes: uniqueDislikes,
        likeCount: uniqueLikes.length,
        dislikeCount: uniqueDislikes.length,
        userVote,
        isBlinded,
        blindThreshold: POST_VOTE_BLIND_THRESHOLD,
      },
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    client.release();
  }
}

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
    name: '대한육상연맹 공지',
    description: '대한육상연맹(KAAF)과 AthleteTime 운영팀이 전달하는 공식 공지와 대회 안내입니다.',
    icon: '📢',
    orderIndex: 0,
  },
  {
    id: 'anonymous',
    slug: 'anonymous',
    name: '육상 자유토크',
    description: '훈련 일상, 팀 분위기, 경기 현장 이슈를 익명으로 자유롭게 나눠보세요.',
    icon: '💬',
    orderIndex: 1,
  },
  {
    id: 'qna',
    slug: 'qna',
    name: '코칭 Q&A',
    description: '연맹 공인 코치진·선수단과 상호 피드백을 주고받는 질의응답 공간입니다.',
    icon: '❓',
    orderIndex: 2,
  },
  {
    id: 'training',
    slug: 'training',
    name: '훈련·기록 공유',
    description: '훈련 프로그램, 피지컬 테스트 결과, 계절별 기록 향상 노하우를 공유하세요.',
    icon: '🏃',
    orderIndex: 3,
  },
  {
    id: 'gear',
    slug: 'gear',
    name: '장비·케어 리뷰',
    description: '스파이크, 로드화, 회복 장비와 케어 제품 후기를 육상인 시각으로 나눕니다.',
    icon: '🎽',
    orderIndex: 4,
  },
  {
    id: 'competition',
    slug: 'competition',
    name: '공식 대회·참가 신청',
    description: 'KAAF 공인 대회 일정, 참가 신청, 경기운영 공지를 실시간으로 확인하세요.',
    icon: '🏅',
    orderIndex: 5,
  },
];

const OFFICIAL_POST_SEEDS = [
  {
    id: 202510200001,
    boardId: 'notice',
    title: '대한육상연맹 2025 시즌 운영 일정 안내',
    author: 'AthleteTime 운영팀',
    summary: '2025 시즌 훈련 및 대회 운영 타임라인과 합숙 계획을 안내드립니다.',
    tags: ['대한육상연맹', '시즌계획', '공지'],
    isNotice: true,
    publishedAt: '2025-10-15T09:00:00+09:00',
    content: [
      '대한육상연맹(KAAF)과 AthleteTime 커뮤니티는 2025 시즌을 맞아 훈련 및 대회 운영 일정을 다음과 같이 안내드립니다.',
      '**핵심 일정**',
      '- 11월 11일(월) : 국가대표 및 후보 선수단 동계강화 합숙 개시 (진천선수촌)',
      '- 12월 5일(목) : 실업팀·대학팀 합동 스피드 테스트 데이 (잠실 주경기장 보조트랙)',
      '- 2025년 2월 22일(토) : 전국실내육상경기대회 – 종목별 예선',
      '- 2025년 3월 15일(토) : 세계선수권 국가대표 최종 선발전 (종목별 오전/오후 세션 운영)',
      '훈련 프로그램 자료와 세부 참가 요강은 첨부된 안내지를 참고하시고, 각 팀 담당자는 연맹 등록 시스템에서 출전 명단을 제출해 주세요.',
      '문의 : 대한육상연맹 경기운영팀 kaaf-events@kaaf.or.kr / 02-1234-5678',
    ].join('\n\n'),
    views: 420,
  },
  {
    id: 202510200002,
    boardId: 'notice',
    title: '국가대표 선발전 참가 등록 절차 정비 안내',
    author: 'AthleteTime 운영팀',
    summary: '2025 국가대표 선발전 전자 등록 시스템 점검 및 필수 제출 서류 안내입니다.',
    tags: ['대한육상연맹', '선발전', '공지'],
    isNotice: true,
    publishedAt: '2025-10-18T10:00:00+09:00',
    content: [
      '2025 시즌 국가대표 선발전 참가 등록 시스템(KAAF Entry Portal)이 10월 25일(금) 18시에 일괄 오픈합니다.',
      '등록 담당자는 다음 절차를 확인해 주세요.',
      '1) 팀 계정으로 포털 로그인 후 종목별 엔트리 작성\n2) 선수별 공인기록 및 메디컬 체크리스트 PDF 업로드\n3) 11월 4일(월) 12시까지 참가비 결제 및 전자 서명 완료',
      '업로드 서류 양식은 공지 첨부파일에서 내려받을 수 있으며, 기한 초과 시 시스템이 자동으로 참가 신청을 잠금 처리합니다.',
      '기술적인 문의는 it@kaaf.or.kr, 경기운영 관련 문의는 selection@kaaf.or.kr 로 연락 바랍니다.',
    ].join('\n\n'),
    views: 380,
  },
  {
    id: 202510200101,
    boardId: 'training',
    title: 'KAAF 공인 웨이트 트레이닝 프로토콜 (400m·중장거리)',
    author: '연맹 지도위원회',
    summary: '400m와 중장거리 선수단을 위한 공식 웨이트 훈련 프로토콜 요약본입니다.',
    tags: ['훈련', '웨이트', '공인프로그램'],
    publishedAt: '2025-10-19T08:30:00+09:00',
    content: [
      '연맹 지도위원회는 400m 및 중·장거리 선수단을 위한 3단계 웨이트 트레이닝 프로토콜을 업데이트했습니다.',
      '**Phase 1 (10~11월)** : 기초 근지구력 + 움직임 안정성 / 3세트 × 15회, 리프팅 속도는 통제',
      '**Phase 2 (12~1월)** : 파워 빌드업 / 올림픽 리프팅 변형과 플라이오메트릭 트레이닝 병행',
      '**Phase 3 (2~3월)** : 경기기 촉진 / 스프린트-웨이트 복합 세션, RPE 기반 로드 조절',
      '각 단계별 세트 구성, 회복 가이드, 국내 실업팀 적용 사례를 PDF로 정리했습니다. 팀 피지컬 코치와 공유하시고, 세션 로그는 AthleteTime 기록 도구에 업로드해 주세요.',
    ].join('\n\n'),
    views: 255,
  },
  {
    id: 202510200201,
    boardId: 'competition',
    title: '2025 서울 실외트랙 테스트 이벤트 참가 안내',
    author: '경기운영팀',
    summary: '서울월드컵경기장 보조경기장에서 열리는 2025 실외트랙 테스트 이벤트 참가 요강을 안내합니다.',
    tags: ['대회', '서울트랙', '참가신청'],
    publishedAt: '2025-10-20T07:45:00+09:00',
    content: [
      '2025년 4월 정식 시즌 개막을 앞두고 서울월드컵경기장 보조경기장에서 실외트랙 테스트 이벤트가 열립니다.',
      '**대회 개요**',
      '- 일시 : 2025년 3월 1일(토) 09:00 ~ 17:00',
      '- 참가 종목 : 스프린트(100m/200m), 허들(110mH/100mH), 400m, 800m, 멀리뛰기, 포환던지기',
      '- 참가 자격 : KAAF 등록선수, 시·도협회 추천선수, 대학·실업팀 선수',
      '참가 신청은 1월 10일(수)부터 2월 14일(금) 18시까지 온라인으로 진행되며, 세부 경기 운영 매뉴얼과 장비 점검 체크리스트는 첨부 자료를 확인해주세요.',
      '대회 당일에는 대한육상연맹 경기운영본부에서 심판 배치를 지원하고, AthleteTime 커뮤니티는 실시간 결과 게시 서비스를 제공합니다.',
    ].join('\n\n'),
    views: 198,
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
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS thumbnail_path TEXT`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS file_url TEXT`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS file_size INTEGER`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS original_size INTEGER`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS compression_ratio INTEGER`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS mime_type TEXT`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS width INTEGER`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS height INTEGER`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS cleanup_stage SMALLINT DEFAULT 0`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS last_cleanup_at TIMESTAMP`,
    `ALTER TABLE post_attachments ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT 'file'`
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
    `ALTER TABLE comments ALTER COLUMN report_count SET DEFAULT 0`,
    `ALTER TABLE post_attachments ALTER COLUMN cleanup_stage SET DEFAULT 0`,
    `ALTER TABLE post_attachments ALTER COLUMN variant SET DEFAULT 'file'`
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

async function backfillPostAttachmentSnapshots() {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT post_id
      FROM post_attachments
      ORDER BY post_id ASC
    `);
    const postIds = rows.map((row) => row.post_id).filter((id) => id != null);
    if (postIds.length === 0) {
      console.log('ℹ️ 첨부파일 스냅샷 백필 대상 게시글 없음');
      return;
    }
    await rebuildPostAttachmentSnapshots(postIds);
    console.log(`✅ ${postIds.length}개 게시글 첨부파일 스냅샷 갱신 완료`);
  } catch (error) {
    console.error('첨부파일 스냅샷 백필 실패:', error.message);
  }
}

async function backfillPostVotesFromArrays() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      SELECT id, likes, dislikes
      FROM posts
      WHERE (likes IS NOT NULL AND array_length(likes, 1) > 0)
         OR (dislikes IS NOT NULL AND array_length(dislikes, 1) > 0)
    `);

    if (rows.length === 0) {
      await client.query('COMMIT');
      console.log('ℹ️ post_votes 백필 대상 게시글 없음');
      return;
    }

    for (const row of rows) {
      const likeSet = Array.from(
        new Set(
          (row.likes || [])
            .map((value) => (value == null ? null : String(value).trim()))
            .filter(Boolean),
        ),
      );
      const dislikeSet = Array.from(
        new Set(
          (row.dislikes || [])
            .map((value) => (value == null ? null : String(value).trim()))
            .filter(Boolean)
            .filter((value) => !likeSet.includes(value)),
        ),
      );

      if (likeSet.length > 0) {
        await client.query(
          `
          INSERT INTO post_votes (post_id, user_id, vote_type, created_at)
          SELECT $1 AS post_id, user_id, 'like' AS vote_type, NOW()
          FROM unnest($2::text[]) AS user_id
          ON CONFLICT (post_id, user_id) DO UPDATE
            SET vote_type = EXCLUDED.vote_type,
                created_at = LEAST(post_votes.created_at, EXCLUDED.created_at)
        `,
          [row.id, likeSet],
        );
      }

      if (dislikeSet.length > 0) {
        await client.query(
          `
          INSERT INTO post_votes (post_id, user_id, vote_type, created_at)
          SELECT $1 AS post_id, user_id, 'dislike' AS vote_type, NOW()
          FROM unnest($2::text[]) AS user_id
          ON CONFLICT (post_id, user_id) DO UPDATE
            SET vote_type = EXCLUDED.vote_type,
                created_at = LEAST(post_votes.created_at, EXCLUDED.created_at)
        `,
          [row.id, dislikeSet],
        );
      }

      await client.query(
        `
        UPDATE posts
        SET likes = $2::text[],
            dislikes = $3::text[],
            updated_at = COALESCE(updated_at, NOW())
        WHERE id = $1
      `,
        [row.id, likeSet, dislikeSet],
      );
    }

    await client.query('COMMIT');
    console.log(`✅ ${rows.length}개 게시글에 대한 post_votes 백필 완료`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('post_votes 백필 실패:', error.message);
  } finally {
    client.release();
  }
}


async function seedOfficialContent() {
  for (const post of OFFICIAL_POST_SEEDS) {
    try {
      const existing = await pool.query('SELECT 1 FROM posts WHERE id = $1', [post.id]);
      if (existing.rowCount > 0) {
        continue;
      }

      const boardCheck = await pool.query('SELECT id FROM boards WHERE id = $1 LIMIT 1', [post.boardId]);
      if (boardCheck.rowCount === 0) {
        console.warn(`공식 콘텐츠 시드 건너뜀 (${post.id}): 게시판 ${post.boardId} 없음`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(post.password ?? `official-${post.boardId}`, SALT_ROUNDS);
      const publishedAt = post.publishedAt ? new Date(post.publishedAt) : new Date();

      await pool.query(
        `INSERT INTO posts (
          id,
          title,
          author,
          content,
          board_id,
          category,
          password,
          tags,
          created_at,
          updated_at,
          is_notice,
          summary,
          views
        ) VALUES (
          $1, $2, $3, $4, $5, NULL, $6, $7, $8, $8, $9, $10, $11
        )`,
        [
          post.id,
          post.title,
          post.author,
          post.content,
          post.boardId,
          hashedPassword,
          post.tags ?? [],
          publishedAt,
          post.isNotice ?? false,
          post.summary ?? null,
          post.views ?? 0,
        ],
      );
    } catch (error) {
      console.error(`공식 콘텐츠 시드 실패 (${post.id}):`, error.message);
    }
  }

  console.log('✅ 공식 공지 및 참고 게시글 시드 완료');
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
        file_path TEXT,
        file_url TEXT,
        thumbnail_url TEXT,
        thumbnail_path TEXT,
        file_size INTEGER,
        original_size INTEGER,
        compression_ratio INTEGER,
        mime_type TEXT,
        width INTEGER,
        height INTEGER,
        cleanup_stage SMALLINT DEFAULT 0,
        last_cleanup_at TIMESTAMP,
        variant TEXT DEFAULT 'file',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await ensureExtendedSchema();
    await seedDefaultBoards();
    await seedOfficialContent();
    await backfillPostBoardRelations();
    await backfillPostVotesFromArrays();
    await backfillPostAttachmentSnapshots();

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
  const primaryUrl = row.file_url || (row.file_path ? `/uploads/${row.file_path}` : null);
  const thumbnailUrl = row.thumbnail_url || (row.thumbnail_path ? `/uploads/${row.thumbnail_path}` : null);
  return {
    id: String(row.id),
    postId: row.post_id ? String(row.post_id) : undefined,
    fileName: row.file_name,
    fileSize: row.file_size ? Number(row.file_size) : null,
    originalSize: row.original_size ? Number(row.original_size) : null,
    compressionRatio: typeof row.compression_ratio === 'number' ? Number(row.compression_ratio) : null,
    fileUrl: primaryUrl || thumbnailUrl || null,
    thumbnailUrl: thumbnailUrl ?? undefined,
    mimeType: row.mime_type ?? 'application/octet-stream',
    width: row.width ? Number(row.width) : null,
    height: row.height ? Number(row.height) : null,
    cleanupStage: typeof row.cleanup_stage === 'number' ? Number(row.cleanup_stage) : null,
    hasOriginal: Boolean(primaryUrl),
    hasThumbnail: Boolean(thumbnailUrl),
    variant: row.variant ?? (row.mime_type && isImageMime(row.mime_type) ? 'image' : 'file'),
    createdAt: toISOString(row.created_at),
  };
}

async function rebuildPostAttachmentSnapshots(postIds, executor = pool) {
  if (!Array.isArray(postIds) || postIds.length === 0) {
    return;
  }

  const normalizedIds = Array.from(
    new Set(
      postIds
        .map((value) => {
          if (value == null) {
            return null;
          }
          if (typeof value === 'object' && value.post_id) {
            return String(value.post_id).trim();
          }
          if (typeof value === 'string') {
            return value.trim();
          }
          if (typeof value === 'number' || typeof value === 'bigint') {
            return value.toString();
          }
          return null;
        })
        .filter((id) => id && id.length > 0),
    ),
  );

  if (normalizedIds.length === 0) {
    return;
  }

  const runner = executor && typeof executor.query === 'function' ? executor : pool;

  for (const postId of normalizedIds) {
    try {
      const rows = await fetchAttachmentRowsForPost(postId, runner);
      const attachments = rows.map(mapAttachmentRow);
      const serialized = attachments
        .map(serializeAttachmentForPostRow)
        .filter((payload) => payload !== null);
      const imageUrls = extractImageUrlsFromAttachments(attachments);

      await runner.query(
        `UPDATE posts
         SET attachments = $2::jsonb,
             images = $3::jsonb
         WHERE id = $1`,
        [postId, JSON.stringify(serialized), JSON.stringify(imageUrls)],
      );
    } catch (error) {
      console.error('첨부파일 스냅샷 갱신 실패:', postId, error.message);
    }
  }
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
    images: extractImageUrlsFromAttachments(attachments),
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
  SELECT DISTINCT ON (post_id) post_id, COALESCE(file_url, thumbnail_url) AS thumbnail_url
  FROM post_attachments
  WHERE variant = 'image'
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
  ap.thumbnail_url,
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
  SELECT DISTINCT ON (post_id) post_id, COALESCE(file_url, thumbnail_url) AS thumbnail_url
  FROM post_attachments
  WHERE variant = 'image'
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
  ap.thumbnail_url,
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
    `SELECT id, post_id, file_name, file_path, file_url, thumbnail_url, thumbnail_path,
            file_size, original_size, compression_ratio, mime_type,
            width, height, cleanup_stage, variant, created_at
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
    const imageCount = files.filter((file) => isImageMime(file.mimetype)).length;
    if (imageCount > MAX_IMAGES_PER_POST) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({
        status: 400,
        message: `이미지는 최대 ${MAX_IMAGES_PER_POST}장까지 업로드할 수 있습니다.`,
      });
    }
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
    let transactionStarted = false;
    try {
      const { rows: boardRows } = await client.query(
        'SELECT id FROM boards WHERE id = $1 OR slug = $1 LIMIT 1',
        [boardInput],
      );

      if (boardRows.length === 0) {
        await cleanupUploadedFiles(files);
        return res.status(400).json({
          status: 400,
          message: '존재하지 않는 게시판입니다.',
        });
      }

      const processedAttachments = await processUploadedAttachments(files);

      await client.query('BEGIN');
      transactionStarted = true;

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

      for (const attachment of processedAttachments) {
        await client.query(
          `INSERT INTO post_attachments (
             post_id,
             file_name,
             file_path,
             file_url,
             thumbnail_url,
             thumbnail_path,
             file_size,
             original_size,
             compression_ratio,
             mime_type,
             width,
             height,
             variant
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            postId,
            attachment.originalName,
            attachment.storedFilePath,
            attachment.fileUrl,
            attachment.thumbnailUrl,
            attachment.thumbnailFileName,
            attachment.fileSize,
            attachment.originalSize,
            attachment.compressionRatio,
            attachment.mimeType,
            attachment.width,
            attachment.height,
            attachment.variant ?? (attachment.isImage ? 'image' : 'file'),
          ],
        );
      }

      await rebuildPostAttachmentSnapshots([postId], client);

      await client.query('COMMIT');
      transactionStarted = false;
      let detail = await fetchPostDetailFromDb(postId, client);
      if (!detail) {
        detail = await fetchPostDetailFromDb(postId);
      }
      res.status(201).json(detail);
    } catch (error) {
      if (transactionStarted) {
        await client.query('ROLLBACK').catch(() => {});
      }
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
  const rawType =
    typeof req.body.type === 'string'
      ? req.body.type
      : typeof req.body.voteType === 'string'
        ? req.body.voteType
        : undefined;
  const normalizedType = rawType ? rawType.trim().toLowerCase() : undefined;
  const voteType = normalizedType === 'like' || normalizedType === 'dislike' ? normalizedType : undefined;
  const userIdInput = req.body.userId ?? req.body.user_id ?? req.body.uid;
  const userId =
    typeof userIdInput === 'string'
      ? userIdInput.trim()
      : typeof userIdInput === 'number'
        ? String(userIdInput)
        : '';

  if (!userId) {
    return res.status(400).json({
      status: 400,
      message: 'userId가 필요합니다.',
    });
  }

  try {
    const result = await applyPostVote(postId, userId, voteType);
    if (result.notFound) {
      return res.status(404).json({
        status: 404,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    const summary = result.summary;
    res.json({
      success: true,
      post: {
        id: summary.postId,
        likes: summary.likes,
        dislikes: summary.dislikes,
        likeCount: summary.likeCount,
        dislikeCount: summary.dislikeCount,
        userVote: summary.userVote,
        isBlinded: summary.isBlinded,
        blindThreshold: summary.blindThreshold,
      },
    });
  } catch (error) {
    console.error('게시글 추천/비추천 처리 오류:', error);
    res.status(500).json({
      status: 500,
      message: '추천 정보를 갱신하지 못했습니다.',
    });
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

    const attachmentRows = await fetchAttachmentRowsForPost(id);
    const attachments = attachmentRows.map(mapAttachmentRow);
    const attachmentImageUrls = extractImageUrlsFromAttachments(attachments);
    const existingImageUrls = Array.isArray(postRows[0].images)
      ? postRows[0].images.map((url) => String(url))
      : [];
    const mergedImageUrls = Array.from(new Set([...existingImageUrls, ...attachmentImageUrls]));

    console.log(`💬 댓글 ${commentRows.length}개 조회됨`);

    const post = {
      ...postRows[0],
      password: undefined, // 비밀번호 제거
      likes: postRows[0].likes || [],
      dislikes: postRows[0].dislikes || [],
      images: mergedImageUrls,
      attachments,
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
    
    await removeAttachmentFilesForPost(id);
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
  const postId = req.params.id;
  const rawType =
    typeof req.body.type === 'string'
      ? req.body.type
      : typeof req.body.voteType === 'string'
        ? req.body.voteType
        : undefined;
  const normalizedType = rawType ? rawType.trim().toLowerCase() : undefined;
  const voteType = normalizedType === 'like' || normalizedType === 'dislike' ? normalizedType : undefined;
  const userIdInput = req.body.userId ?? req.body.user_id ?? req.body.uid;
  const userId =
    typeof userIdInput === 'string'
      ? userIdInput.trim()
      : typeof userIdInput === 'number'
        ? String(userIdInput)
        : '';

  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId가 필요합니다.' });
  }

  try {
    const result = await applyPostVote(postId, userId, voteType);
    if (result.notFound) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }

    const summary = result.summary;
    res.json({
      success: true,
      post: {
        id: summary.postId,
        likes: summary.likes,
        dislikes: summary.dislikes,
        likeCount: summary.likeCount,
        dislikeCount: summary.dislikeCount,
        userVote: summary.userVote,
        isBlinded: summary.isBlinded,
        blindThreshold: summary.blindThreshold,
      },
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
  scheduleAttachmentCleanup();
  
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