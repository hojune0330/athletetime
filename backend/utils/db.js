/**
 * PostgreSQL 데이터베이스 연결 유틸리티
 * 
 * Standalone 모드: DATABASE_URL 미설정 시 메모리 기반 Mock DB로 동작
 * Production 모드: PostgreSQL 연결
 */

const DATABASE_URL = process.env.DATABASE_URL;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================
// 기본 관리자 계정 설정
// ============================================
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@athletetime.com';
const ADMIN_NICKNAME = '관리자';

// ============================================
// Standalone Mock DB (PostgreSQL 없이 테스트용)
// ============================================

if (!DATABASE_URL) {
  // 운영 환경에서는 메모리 Mock DB로 절대 기동하지 않는다.
  if (IS_PRODUCTION) {
    throw new Error('운영 환경에서는 DATABASE_URL이 필요합니다. 메모리 Mock DB는 개발 전용입니다.');
  }

  console.log('⚠️  DATABASE_URL 미설정 → Standalone 모드 (메모리 DB, 개발 전용)');

  // 관리자 비밀번호: 예측 가능한 하드코딩 기본값을 제거한다.
  // - ADMIN_PASSWORD 환경변수가 있으면 사용
  // - 없으면 프로세스마다 무작위 비밀번호를 생성하고 콘솔에 1회 안내 (개발 편의)
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.trim().length === 0) {
    adminPassword = crypto.randomBytes(9).toString('base64url');
    console.log(`⚠️  [dev] 임시 관리자 비밀번호가 생성되었습니다 (${ADMIN_EMAIL}). 콘솔에는 표시하지 않습니다.`);
    console.log('    운영 배포 전 ADMIN_PASSWORD와 실제 DB를 설정하세요.');
  }
  // 서버 시작 시 관리자 비밀번호를 동적으로 해싱 (해시 호환성 문제 원천 차단)
  const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);

  // 메모리 저장소
  const store = {
    users: [
      // 기본 관리자 계정 (서버 시작 시 동적 해시 생성)
      {
        id: 'admin-001',
        email: ADMIN_EMAIL,
        password_hash: adminPasswordHash,
        nickname: ADMIN_NICKNAME,
        username: ADMIN_NICKNAME,
        specialty: null,
        region: null,
        verification_code: null,
        verification_expires_at: null,
        auth_provider: 'email',
        email_verified: true,
        is_active: true,
        is_admin: true,
        is_banned: false,
        total_posts: 0,
        total_comments: 0,
        total_likes_received: 0,
        created_at: new Date().toISOString(),
        last_login_at: null,
        last_active: new Date().toISOString(),
        profile_image_url: null,
        instagram: null,
        bio: '애타 관리자 계정',
      },
    ],
    refresh_tokens: [],
    login_history: [],
    email_logs: [],
    email_verifications: [],
    password_reset_codes: [],
    posts: [],
    categories: [
      { id: 1, name: '공지', description: '중요한 공지사항', icon: '📢', color: '#FFD700', sort_order: 1, is_active: true },
      { id: 2, name: '자유', description: '자유로운 이야기', icon: '💬', color: '#00FFB3', sort_order: 2, is_active: true },
      { id: 3, name: '대회', description: '대회 정보 및 후기', icon: '🏆', color: '#FF6B6B', sort_order: 3, is_active: true },
      { id: 4, name: '훈련', description: '훈련 방법 및 팁', icon: '💪', color: '#4ECDC4', sort_order: 4, is_active: true },
      { id: 5, name: '질문', description: '궁금한 점 질문', icon: '❓', color: '#95E1D3', sort_order: 5, is_active: true },
      { id: 6, name: '장비', description: '장비 리뷰 및 추천', icon: '🔧', color: '#F38181', sort_order: 6, is_active: true },
    ],
    comments: [],
    votes: [],
    marketplace_items: [],
    marketplace_comments: [],
    _autoId: 1,
  };

  // 비밀번호 평문은 로그에 남기지 않는다.
  console.log(`  [MockDB] 관리자 계정 시드 완료: ${ADMIN_EMAIL}`);
  console.log(`  [MockDB] 해시 검증: ${bcrypt.compareSync(adminPassword, adminPasswordHash) ? 'OK' : 'FAIL'}`);

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /**
   * 간이 SQL 파서 — INSERT, SELECT, UPDATE, DELETE 기본 동작
   * 완전한 SQL 파서가 아닌 AthleTime 코드에서 사용하는 패턴만 처리
   */
  async function query(text, params = []) {
    const sql = text.trim().replace(/\s+/g, ' ');

    // SELECT 1 (health check)
    if (/^SELECT 1$/i.test(sql)) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // INSERT INTO users
    if (/INSERT INTO users/i.test(sql)) {
      const user = {
        id: generateUUID(),
        email: params[0] || null,
        password_hash: params[1] || null,
        nickname: params[2] || null,
        username: params[3] || params[2] || null,
        specialty: params[4] || null,
        region: params[5] || null,
        verification_code: params[6] || null,
        verification_expires_at: params[7] || null,
        auth_provider: params[8] || 'email',
        email_verified: params[9] !== undefined ? params[9] : false,
        is_active: true,
        is_admin: false,
        is_banned: false,
        total_posts: 0,
        total_comments: 0,
        total_likes_received: 0,
        created_at: new Date().toISOString(),
        last_login_at: null,
        last_active: new Date().toISOString(),
        profile_image_url: null,
        instagram: null,
        bio: null,
      };
      store.users.push(user);
      return { rows: [user], rowCount: 1 };
    }

    // SELECT ... FROM users WHERE email = $1
    if (/SELECT.*FROM users WHERE email/i.test(sql)) {
      const email = params[0];
      const found = store.users.filter(u => u.email === email);
      return { rows: found, rowCount: found.length };
    }

    // SELECT ... FROM users WHERE id = $1
    if (/SELECT.*FROM users WHERE id/i.test(sql)) {
      const id = params[0];
      const found = store.users.filter(u => u.id === id);
      return { rows: found, rowCount: found.length };
    }

    // SELECT ... FROM users WHERE nickname = $1
    if (/SELECT.*FROM users WHERE nickname/i.test(sql)) {
      const nickname = params[0];
      const found = store.users.filter(u => u.nickname === nickname);
      return { rows: found, rowCount: found.length };
    }

    // UPDATE users SET ... WHERE id
    if (/UPDATE users SET.*WHERE id/i.test(sql)) {
      const id = params[params.length - 1];
      const user = store.users.find(u => u.id === id);
      if (user) {
        // Parse SET clauses loosely
        if (/email_verified\s*=\s*TRUE/i.test(sql)) user.email_verified = true;
        if (/verification_code\s*=\s*NULL/i.test(sql)) user.verification_code = null;
        if (/is_admin\s*=\s*TRUE/i.test(sql)) user.is_admin = true;
        if (/last_login_at/i.test(sql)) user.last_login_at = new Date().toISOString();
        if (/nickname\s*=\s*COALESCE/i.test(sql)) {
          if (params[0]) user.nickname = params[0];
        }
        if (/password_hash\s*=\s*\$/i.test(sql)) {
          // Find password_hash param
          for (let i = 0; i < params.length - 1; i++) {
            if (typeof params[i] === 'string' && params[i].startsWith('$2')) {
              user.password_hash = params[i];
              break;
            }
          }
        }
        return { rows: [user], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // UPDATE users SET is_admin WHERE email
    if (/UPDATE users SET is_admin.*WHERE email/i.test(sql)) {
      const email = params[0];
      const user = store.users.find(u => u.email === email);
      if (user) {
        user.is_admin = true;
        return { rows: [user], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // INSERT INTO refresh_tokens
    if (/INSERT INTO refresh_tokens/i.test(sql)) {
      store.refresh_tokens.push({
        user_id: params[0],
        token: params[1],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false,
      });
      return { rows: [], rowCount: 1 };
    }

    if (/SELECT.*FROM refresh_tokens/i.test(sql)) {
      const token = params[0];
      const refreshToken = store.refresh_tokens.find(t => t.token === token);
      if (!refreshToken) {
        return { rows: [], rowCount: 0 };
      }

      const user = store.users.find(u => u.id === refreshToken.user_id);
      if (!user) {
        return { rows: [], rowCount: 0 };
      }

      return {
        rows: [{
          user_id: refreshToken.user_id,
          token: refreshToken.token,
          expires_at: refreshToken.expires_at,
          is_revoked: refreshToken.is_revoked,
          email: user.email,
          is_active: user.is_active,
        }],
        rowCount: 1,
      };
    }

    // UPDATE refresh_tokens (revoke)
    if (/UPDATE refresh_tokens/i.test(sql)) {
      const token = params[0];
      const rt = store.refresh_tokens.find(t => t.token === token);
      if (rt) { rt.is_revoked = true; rt.revoked_at = new Date().toISOString(); }
      return { rows: [], rowCount: rt ? 1 : 0 };
    }

    // INSERT INTO login_history
    if (/INSERT INTO login_history/i.test(sql)) {
      store.login_history.push({ user_id: params[0], created_at: new Date().toISOString() });
      return { rows: [], rowCount: 1 };
    }

    // INSERT INTO email_logs
    if (/INSERT INTO email_logs/i.test(sql)) {
      store.email_logs.push({ user_id: params[0], type: params[1], created_at: new Date().toISOString() });
      return { rows: [], rowCount: 1 };
    }

    // UPDATE email_logs
    if (/UPDATE email_logs/i.test(sql)) {
      return { rows: [], rowCount: 0 };
    }

    // email_verifications
    if (/INSERT INTO email_verifications/i.test(sql) || /ON CONFLICT.*email_verifications/i.test(sql)) {
      const existing = store.email_verifications.findIndex(e => e.email === params[0]);
      const record = { email: params[0], code: params[1], expires_at: params[2], verified: false };
      if (existing >= 0) store.email_verifications[existing] = record;
      else store.email_verifications.push(record);
      return { rows: [], rowCount: 1 };
    }

    if (/SELECT.*FROM email_verifications/i.test(sql)) {
      const found = store.email_verifications.filter(e => e.email === params[0]);
      return { rows: found, rowCount: found.length };
    }

    if (/UPDATE email_verifications/i.test(sql)) {
      const ev = store.email_verifications.find(e => e.email === params[0]);
      if (ev) ev.verified = true;
      return { rows: [], rowCount: ev ? 1 : 0 };
    }

    // password_reset_codes
    if (/INSERT INTO password_reset_codes/i.test(sql) || /ON CONFLICT.*password_reset_codes/i.test(sql)) {
      const existing = store.password_reset_codes.findIndex(e => e.email === params[0]);
      const record = { email: params[0], code: params[1], expires_at: params[2], used: false };
      if (existing >= 0) store.password_reset_codes[existing] = record;
      else store.password_reset_codes.push(record);
      return { rows: [], rowCount: 1 };
    }

    if (/SELECT.*FROM password_reset_codes/i.test(sql)) {
      const found = store.password_reset_codes.filter(e => e.email === params[0]);
      return { rows: found, rowCount: found.length };
    }

    if (/UPDATE password_reset_codes/i.test(sql)) {
      const pc = store.password_reset_codes.find(e => e.email === params[0]);
      if (pc) pc.used = true;
      return { rows: [], rowCount: pc ? 1 : 0 };
    }

    // SELECT ... FROM categories
    if (/SELECT.*FROM categories/i.test(sql)) {
      return { rows: store.categories, rowCount: store.categories.length };
    }

    if (/^SELECT COUNT\(\*\) FROM marketplace_items/i.test(sql)) {
      return { rows: [{ count: String(store.marketplace_items.length) }], rowCount: 1 };
    }

    if (/UPDATE marketplace_items SET view_count/i.test(sql)) {
      return { rows: [], rowCount: 0 };
    }

    if (/SELECT.*FROM marketplace_items/i.test(sql)) {
      return { rows: store.marketplace_items, rowCount: store.marketplace_items.length };
    }

    // SELECT ... FROM posts (list)
    if (/SELECT.*FROM posts/i.test(sql) && !/WHERE/i.test(sql)) {
      return { rows: store.posts, rowCount: store.posts.length };
    }

    // CREATE TABLE / ALTER TABLE / CREATE INDEX / DROP (DDL - ignore silently)
    if (/^(CREATE|ALTER|DROP|INSERT INTO schema_version)/i.test(sql)) {
      return { rows: [], rowCount: 0 };
    }

    // Default fallback — empty result
    console.log(`[MockDB] 미처리 쿼리: ${sql.substring(0, 80)}...`);
    return { rows: [], rowCount: 0 };
  }

  /**
   * 트랜잭션 모의 — 동일 query 함수를 반환
   */
  async function getClient() {
    return {
      query,
      release: () => {},
    };
  }

  async function end() {
    console.log('MockDB 종료');
  }

  module.exports = { query, getClient, end, pool: null, _store: store };

} else {

  // ============================================
  // Production 모드: PostgreSQL 연결
  // ============================================

  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('connect', () => {
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');
  });

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL 연결 오류:', err);
  });

  async function query(text, params) {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`⚠️ 느린 쿼리 감지 (${duration}ms):`, text.substring(0, 100));
      }
      return result;
    } catch (error) {
      console.error('❌ 쿼리 실행 오류:', error);
      throw error;
    }
  }

  async function getClient() {
    return await pool.connect();
  }

  async function end() {
    await pool.end();
  }

  module.exports = { query, getClient, end, pool };
}
