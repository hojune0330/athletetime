/**
 * 인증 API 라우터
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../utils/db');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { sendVerificationEmail, sendWelcomeEmail, sendResetPasswordCodeEmail } = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');
const {
  REFRESH_COOKIE,
  clearAuthCookies,
  getCookie,
  requireCsrfForCookieAuth,
  setAuthCookies,
  setCsrfCookie,
} = require('../utils/authCookies');

const router = express.Router();
const AUTH_CODE_SENT_RESPONSE = {
  success: true,
  message: '인증 코드가 발송되었습니다',
};

/**
 * 6자리 랜덤 인증 코드 생성
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendAuthCodeAccepted(res) {
  return res.json({ ...AUTH_CODE_SENT_RESPONSE });
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function extractRefreshToken(req) {
  if (req.body && typeof req.body.refreshToken === 'string') {
    return req.body.refreshToken;
  }

  const cookieRefreshToken = getCookie(req, REFRESH_COOKIE);
  if (cookieRefreshToken) {
    return cookieRefreshToken;
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function issueSession(res, accessToken, refreshToken) {
  setAuthCookies(res, accessToken, refreshToken);
}

router.get('/csrf-token', (req, res) => {
  const csrfToken = setCsrfCookie(res);
  res.json({
    success: true,
    csrfToken,
  });
});

/**
 * POST /api/auth/send-verification
 * 이메일 인증 코드 발송 (회원가입 전)
 */
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '이메일이 필요합니다'
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식이 아닙니다'
      });
    }

    // 이메일 중복 체크
    const emailCheck = await db.query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 사용 중인 이메일입니다'
      });
    }

    // 기존 인증 코드가 있는지 확인 (email_verifications 테이블 또는 임시 저장)
    // 여기서는 간단하게 메모리에 저장하거나, 임시 테이블 사용
    
    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

    // 인증 코드를 임시 저장 (email_verifications 테이블이 있다면 사용)
    // 여기서는 간단하게 처리
    try {
      await db.query(
        `INSERT INTO email_verifications (email, code, expires_at) 
         VALUES ($1, $2, $3)
         ON CONFLICT (email) 
         DO UPDATE SET code = $2, expires_at = $3, created_at = NOW()`,
        [email, verificationCode, expiresAt]
      );
    } catch (tableError) {
      // 테이블이 없으면 생성
      await db.query(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          email VARCHAR(255) PRIMARY KEY,
          code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.query(
        `INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, $3)`,
        [email, verificationCode, expiresAt]
      );
    }

    // 인증 이메일 발송
    try {
      await sendVerificationEmail(email, verificationCode, '회원');
      console.log('✅ 인증 코드 발송 요청 처리 완료');
    } catch (emailError) {
      console.error('이메일 발송 실패:', getErrorMessage(emailError));
    }

    sendAuthCodeAccepted(res);

  } catch (error) {
    console.error('❌ 인증 코드 발송 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 코드 발송 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/verify-code
 * 이메일 인증 코드 확인 (회원가입 전)
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: '이메일과 인증 코드가 필요합니다'
      });
    }

    // 인증 코드 확인
    const result = await db.query(
      'SELECT code, expires_at FROM email_verifications WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '인증 코드를 먼저 요청해주세요'
      });
    }

    const verification = result.rows[0];

    // 만료 확인
    if (new Date() > new Date(verification.expires_at)) {
      return res.status(400).json({
        success: false,
        error: '인증 코드가 만료되었습니다. 새로운 코드를 요청해주세요.'
      });
    }

    // 코드 확인
    if (verification.code !== code) {
      return res.status(400).json({
        success: false,
        error: '인증 코드가 일치하지 않습니다'
      });
    }

    // 인증 성공 - verified 표시 (컬럼이 없으면 추가)
    try {
      await db.query(
        `UPDATE email_verifications SET verified = TRUE WHERE email = $1`,
        [email]
      );
    } catch (updateError) {
      // verified 컬럼이 없으면 추가 후 재시도
      console.log('verified 컬럼 추가 시도...');
      await db.query(`ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
      await db.query(
        `UPDATE email_verifications SET verified = TRUE WHERE email = $1`,
        [email]
      );
    }

    res.json({
      success: true,
      message: '이메일 인증이 완료되었습니다'
    });

  } catch (error) {
    console.error('❌ 인증 코드 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 코드 확인 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/check-nickname
 * 닉네임 중복 확인
 */
router.post('/check-nickname', async (req, res) => {
  try {
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(400).json({
        success: false,
        available: false,
        error: '닉네임이 필요합니다'
      });
    }

    // 닉네임 검증 (2-10자)
    if (nickname.length < 2 || nickname.length > 10) {
      return res.status(400).json({
        success: false,
        available: false,
        error: '닉네임은 2-10자여야 합니다'
      });
    }

    // 닉네임 중복 체크
    const result = await db.query(
      'SELECT id FROM users WHERE nickname = $1',
      [nickname]
    );

    const available = result.rows.length === 0;

    res.json({
      success: true,
      available,
      message: available ? '사용 가능한 닉네임입니다' : '이미 사용 중인 닉네임입니다'
    });

  } catch (error) {
    console.error('❌ 닉네임 확인 오류:', error);
    res.status(500).json({
      success: false,
      available: false,
      error: '닉네임 확인 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/register
 * 회원가입
 */
router.post('/register', async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { email, password, nickname, specialty, region } = req.body;

    // 입력 검증
    if (!email || !password || !nickname) {
      return res.status(400).json({
        success: false,
        error: '이메일, 비밀번호, 닉네임은 필수입니다'
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식이 아닙니다'
      });
    }

    // 비밀번호 강도 검증 (8자 이상, 영문+숫자)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 8자 이상이어야 합니다'
      });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 영문과 숫자를 포함해야 합니다'
      });
    }

    // 닉네임 검증 (2-10자)
    if (nickname.length < 2 || nickname.length > 10) {
      return res.status(400).json({
        success: false,
        error: '닉네임은 2-10자여야 합니다'
      });
    }

    await client.query('BEGIN');

    // 이메일 중복 체크
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: '이미 사용 중인 이메일입니다'
      });
    }

    // 닉네임 중복 체크
    const nicknameCheck = await client.query(
      'SELECT id FROM users WHERE nickname = $1',
      [nickname]
    );

    if (nicknameCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: '이미 사용 중인 닉네임입니다'
      });
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, 10);

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

    // 사용자 생성
    const result = await client.query(
      `INSERT INTO users (
        email, 
        password_hash, 
        nickname, 
        username,
        specialty, 
        region,
        verification_code,
        verification_expires_at,
        auth_provider,
        email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, nickname, specialty, region, created_at`,
      [
        email,
        passwordHash,
        nickname,
        nickname, // username도 nickname으로 설정
        specialty || null,
        region || null,
        verificationCode,
        verificationExpiresAt,
        'email',
        false
      ]
    );

    const user = result.rows[0];

    // 이메일 발송 로그 기록
    await client.query(
      `INSERT INTO email_logs (user_id, email_type, recipient_email, subject, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'verification', email, '이메일 인증 코드', 'pending']
    );

    await client.query('COMMIT');

    // 인증 이메일 발송 (비동기)
    sendVerificationEmail(email, verificationCode, nickname)
      .then(async () => {
        // 발송 성공 로그 업데이트
        await db.query(
          `UPDATE email_logs 
           SET status = 'sent', sent_at = NOW() 
           WHERE user_id = $1 AND email_type = 'verification' AND status = 'pending'
           ORDER BY created_at DESC LIMIT 1`,
          [user.id]
        );
      })
      .catch(async (error) => {
        console.error('이메일 발송 실패:', error);
        // 발송 실패 로그 업데이트
        await db.query(
          `UPDATE email_logs 
           SET status = 'failed', error_message = $2 
           WHERE user_id = $1 AND email_type = 'verification' AND status = 'pending'
           ORDER BY created_at DESC LIMIT 1`,
          [user.id, error.message]
        );
      });

    // JWT 토큰 생성 (회원가입 즉시 로그인)
    const accessToken = generateAccessToken(user.id, email);
    const refreshToken = generateRefreshToken(user.id, email);
    issueSession(res, accessToken, refreshToken);

    // Refresh token 저장
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshToken]
    );

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        username: user.nickname,
        emailVerified: user.email_verified || false,
        isAdmin: user.is_admin || false
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 회원가입 오류:', error);
    res.status(500).json({
      success: false,
      error: '회원가입 처리 중 오류가 발생했습니다'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/verify-email
 * 이메일 인증
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: '이메일과 인증 코드가 필요합니다'
      });
    }

    // 사용자 조회
    const result = await db.query(
      `SELECT id, nickname, verification_code, verification_expires_at, email_verified
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }

    const user = result.rows[0];

    // 이미 인증됨
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: '이미 인증된 이메일입니다'
      });
    }

    // 인증 코드 확인
    if (user.verification_code !== code) {
      return res.status(400).json({
        success: false,
        error: '인증 코드가 일치하지 않습니다'
      });
    }

    // 만료 확인
    if (new Date() > new Date(user.verification_expires_at)) {
      return res.status(400).json({
        success: false,
        error: '인증 코드가 만료되었습니다. 새로운 코드를 요청해주세요.'
      });
    }

    // 인증 완료
    await db.query(
      `UPDATE users 
       SET email_verified = TRUE, 
           verification_code = NULL, 
           verification_expires_at = NULL
       WHERE id = $1`,
      [user.id]
    );

    // JWT 토큰 생성
    const accessToken = generateAccessToken(user.id, email);
    const refreshToken = generateRefreshToken(user.id, email);
    issueSession(res, accessToken, refreshToken);

    // Refresh token 저장
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshToken]
    );

    // 환영 이메일 발송 (비동기, 실패해도 무시)
    sendWelcomeEmail(email, user.nickname).catch(err => {
      console.error('환영 이메일 발송 실패:', err);
    });

    res.json({
      success: true,
      message: '이메일 인증이 완료되었습니다',
      user: {
        id: user.id,
        email,
        nickname: user.nickname
      }
    });

  } catch (error) {
    console.error('❌ 이메일 인증 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 처리 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/resend-code
 * 인증 코드 재발송
 */
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '이메일이 필요합니다'
      });
    }

    // 사용자 조회
    const result = await db.query(
      'SELECT id, nickname, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: '이미 인증된 이메일입니다'
      });
    }

    // 새 인증 코드 생성
    const verificationCode = generateVerificationCode();
    const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      `UPDATE users 
       SET verification_code = $1, verification_expires_at = $2
       WHERE id = $3`,
      [verificationCode, verificationExpiresAt, user.id]
    );

    // 인증 이메일 재발송
    await sendVerificationEmail(email, verificationCode, user.nickname);

    res.json({
      success: true,
      message: '인증 코드가 재발송되었습니다'
    });

  } catch (error) {
    console.error('❌ 인증 코드 재발송 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 코드 재발송 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/login
 * 로그인
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: '이메일과 비밀번호가 필요합니다'
      });
    }

    // 사용자 조회
    const result = await db.query(
      `SELECT id, email, password_hash, nickname, username, email_verified, is_active, is_admin
       FROM users 
       WHERE email = $1 AND auth_provider = 'email'`,
      [email]
    );

    if (result.rows.length === 0) {
      // 로그인 실패 기록
      await db.query(
        `INSERT INTO login_history (user_id, login_type, success, failure_reason)
         VALUES (NULL, 'email', FALSE, 'user_not_found')`
      );

      return res.status(401).json({
        success: false,
        error: '이메일 또는 비밀번호가 일치하지 않습니다'
      });
    }

    const user = result.rows[0];

    // 계정 활성화 체크
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: '비활성화된 계정입니다'
      });
    }

    // 비밀번호 확인
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // 로그인 실패 기록
      await db.query(
        `INSERT INTO login_history (user_id, login_type, success, failure_reason)
         VALUES ($1, 'email', FALSE, 'wrong_password')`,
        [user.id]
      );

      return res.status(401).json({
        success: false,
        error: '이메일 또는 비밀번호가 일치하지 않습니다'
      });
    }

    // JWT 토큰 생성
    const accessToken = generateAccessToken(user.id, email);
    const refreshToken = generateRefreshToken(user.id, email);
    issueSession(res, accessToken, refreshToken);

    // Refresh token 저장
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshToken]
    );

    // 마지막 로그인 시간 업데이트
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 로그인 성공 기록
    await db.query(
      `INSERT INTO login_history (user_id, login_type, success)
       VALUES ($1, 'email', TRUE)`,
      [user.id]
    );

    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        username: user.username,
        emailVerified: user.email_verified,
        isAdmin: user.is_admin
      }
    });

  } catch (error) {
    console.error('❌ 로그인 오류:', error);
    res.status(500).json({
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다'
    });
  }
});

router.post('/refresh', requireCsrfForCookieAuth, async (req, res) => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'refreshToken이 필요합니다'
      });
    }

    const decoded = verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'refresh token이 아닙니다'
      });
    }

    const tokenResult = await db.query(
      `SELECT 
        rt.user_id, rt.token, rt.expires_at, rt.is_revoked,
        u.email, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1
       LIMIT 1`,
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '등록되지 않은 refresh token입니다'
      });
    }

    const storedToken = tokenResult.rows[0];

    if (storedToken.is_revoked) {
      return res.status(401).json({
        success: false,
        error: '이미 만료된 refresh token입니다'
      });
    }

    if (new Date(storedToken.expires_at) <= new Date()) {
      return res.status(401).json({
        success: false,
        error: 'refresh token이 만료되었습니다'
      });
    }

    if (!storedToken.is_active || storedToken.user_id !== decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'refresh token을 사용할 수 없습니다'
      });
    }

    const accessToken = generateAccessToken(storedToken.user_id, storedToken.email);
    const nextRefreshToken = generateRefreshToken(storedToken.user_id, storedToken.email);
    issueSession(res, accessToken, nextRefreshToken);

    await db.query(
      'UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE token = $1',
      [refreshToken]
    );

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [storedToken.user_id, nextRefreshToken]
    );

    res.json({
      success: true
    });

  } catch (error) {
    console.error('❌ 토큰 재발급 오류:', error);
    res.status(401).json({
      success: false,
      error: 'refresh token을 확인할 수 없습니다'
    });
  }
});

/**
 * POST /api/auth/logout
 * 로그아웃
 */
router.post('/logout', requireCsrfForCookieAuth, authenticateToken, async (req, res) => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (refreshToken) {
      // Refresh token 무효화
      await db.query(
        'UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE token = $1',
        [refreshToken]
      );
    }

    clearAuthCookies(res);

    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });

  } catch (error) {
    console.error('❌ 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: '로그아웃 처리 중 오류가 발생했습니다'
    });
  }
});

/**
 * GET /api/auth/me
 * 내 정보 조회
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id, email, nickname, username, specialty, region, 
        profile_image_url, instagram, bio,
        email_verified, is_admin, is_active,
        total_posts, total_comments, total_likes_received,
        created_at, last_login_at
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        username: user.username,
        specialty: user.specialty,
        region: user.region,
        profileImage: user.profile_image_url,
        instagram: user.instagram,
        bio: user.bio,
        emailVerified: user.email_verified,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        stats: {
          totalPosts: user.total_posts,
          totalComments: user.total_comments,
          totalLikesReceived: user.total_likes_received
        },
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      }
    });

  } catch (error) {
    console.error('❌ 사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '사용자 정보 조회 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * 비밀번호 찾기 - 이메일 인증 코드 발송
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '이메일이 필요합니다'
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식이 아닙니다'
      });
    }

    // 사용자 확인
    const userResult = await db.query(
      'SELECT id, nickname FROM users WHERE email = $1 AND auth_provider = $2',
      [email, 'email']
    );

    if (userResult.rows.length === 0) {
      return sendAuthCodeAccepted(res);
    }

    const user = userResult.rows[0];

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

    // password_reset_codes 테이블에 저장 (테이블이 없으면 생성)
    try {
      await db.query(
        `INSERT INTO password_reset_codes (email, code, expires_at) 
         VALUES ($1, $2, $3)
         ON CONFLICT (email) 
         DO UPDATE SET code = $2, expires_at = $3, created_at = NOW(), used = FALSE`,
        [email, verificationCode, expiresAt]
      );
    } catch (tableError) {
      // 테이블이 없으면 생성
      await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_codes (
          email VARCHAR(255) PRIMARY KEY,
          code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.query(
        `INSERT INTO password_reset_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
        [email, verificationCode, expiresAt]
      );
    }

    // 인증 이메일 발송
    try {
      await sendResetPasswordCodeEmail(email, verificationCode, user.nickname);
      console.log('✅ 비밀번호 재설정 인증 코드 발송 요청 처리 완료');
    } catch (emailError) {
      console.error('이메일 발송 실패:', getErrorMessage(emailError));
    }

    sendAuthCodeAccepted(res);

  } catch (error) {
    console.error('❌ 비밀번호 찾기 오류:', error);
    res.status(500).json({
      success: false,
      error: '비밀번호 찾기 처리 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/verify-reset-code
 * 비밀번호 재설정 인증 코드 확인
 */
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: '이메일과 인증 코드가 필요합니다'
      });
    }

    // 인증 코드 확인
    const result = await db.query(
      'SELECT code, expires_at, used FROM password_reset_codes WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '인증 코드를 먼저 요청해주세요'
      });
    }

    const resetCode = result.rows[0];

    // 이미 사용된 코드인지 확인
    if (resetCode.used) {
      return res.status(400).json({
        success: false,
        error: '이미 사용된 인증 코드입니다. 새로운 코드를 요청해주세요.'
      });
    }

    // 만료 확인
    if (new Date() > new Date(resetCode.expires_at)) {
      return res.status(400).json({
        success: false,
        error: '인증 코드가 만료되었습니다. 새로운 코드를 요청해주세요.'
      });
    }

    // 코드 확인
    if (resetCode.code !== code) {
      return res.status(400).json({
        success: false,
        error: '인증 코드가 일치하지 않습니다'
      });
    }

    res.json({
      success: true,
      message: '인증이 완료되었습니다. 새 비밀번호를 설정해주세요.'
    });

  } catch (error) {
    console.error('❌ 인증 코드 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 코드 확인 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * 새 비밀번호 설정
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '이메일, 인증 코드, 새 비밀번호가 필요합니다'
      });
    }

    // 비밀번호 강도 검증 (8자 이상, 영문+숫자)
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 8자 이상이어야 합니다'
      });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 영문과 숫자를 포함해야 합니다'
      });
    }

    // 인증 코드 확인
    const codeResult = await db.query(
      'SELECT code, expires_at, used FROM password_reset_codes WHERE email = $1',
      [email]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '인증 코드를 먼저 요청해주세요'
      });
    }

    const resetCode = codeResult.rows[0];

    // 이미 사용된 코드인지 확인
    if (resetCode.used) {
      return res.status(400).json({
        success: false,
        error: '이미 사용된 인증 코드입니다. 새로운 코드를 요청해주세요.'
      });
    }

    // 만료 확인
    if (new Date() > new Date(resetCode.expires_at)) {
      return res.status(400).json({
        success: false,
        error: '인증 코드가 만료되었습니다. 새로운 코드를 요청해주세요.'
      });
    }

    // 코드 확인
    if (resetCode.code !== code) {
      return res.status(400).json({
        success: false,
        error: '인증 코드가 일치하지 않습니다'
      });
    }

    // 비밀번호 해싱 및 업데이트
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [passwordHash, email]
    );

    // 인증 코드 사용 처리
    await db.query(
      'UPDATE password_reset_codes SET used = TRUE WHERE email = $1',
      [email]
    );

    console.log('✅ 비밀번호 재설정 완료');

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.'
    });

  } catch (error) {
    console.error('❌ 비밀번호 재설정 오류:', error);
    res.status(500).json({
      success: false,
      error: '비밀번호 재설정 중 오류가 발생했습니다'
    });
  }
});

/**
 * PUT /api/auth/profile
 * 프로필 수정
 */
router.put('/profile', requireCsrfForCookieAuth, authenticateToken, async (req, res) => {
  try {
    const { nickname, password } = req.body;

    // 닉네임 변경 시 중복 체크
    if (nickname && nickname !== req.user.nickname) {
      const nicknameCheck = await db.query(
        'SELECT id FROM users WHERE nickname = $1 AND id != $2',
        [nickname, req.user.id]
      );

      if (nicknameCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 사용 중인 닉네임입니다'
        });
      }
    }

    // 비밀번호 변경 시 해싱
    let passwordHash = null;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: '비밀번호는 8자 이상이어야 합니다'
        });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    // 프로필 업데이트
    let query, params;
    if (passwordHash) {
      query = `UPDATE users 
               SET nickname = COALESCE($1, nickname),
                   password_hash = $2
               WHERE id = $3
               RETURNING nickname`;
      params = [nickname, passwordHash, req.user.id];
    } else {
      query = `UPDATE users 
               SET nickname = COALESCE($1, nickname)
               WHERE id = $2
               RETURNING nickname`;
      params = [nickname, req.user.id];
    }

    const result = await db.query(query, params);
    
    console.log('✅ 프로필 수정 완료:', result.rows[0]);

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ 프로필 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로필 수정 중 오류가 발생했습니다'
    });
  }
});

/**
 * POST /api/auth/set-admin
 * 관리자 권한 설정 (특정 이메일에 대해)
 * 내부용 API - 보안을 위해 특정 조건에서만 사용
 */
router.post('/set-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;

    // 비밀 키 검증: 예측 가능한 하드코딩 기본값을 제거한다.
    // ADMIN_SECRET_KEY가 설정되지 않으면 이 엔드포인트는 비활성화(차단)한다.
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

    if (!ADMIN_SECRET_KEY || ADMIN_SECRET_KEY.trim().length === 0) {
      return res.status(403).json({
        success: false,
        error: '관리자 설정 기능이 비활성화되어 있습니다.'
      });
    }

    if (typeof secretKey !== 'string' || secretKey !== ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다.'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '이메일이 필요합니다.'
      });
    }

    // 사용자 찾기 및 관리자 권한 부여
    const result = await db.query(
      'UPDATE users SET is_admin = TRUE WHERE email = $1 RETURNING id, email, nickname, is_admin',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '해당 이메일로 가입된 사용자가 없습니다.'
      });
    }

    console.log(`✅ 관리자 권한 부여: ${email}`);

    res.json({
      success: true,
      message: '관리자 권한이 부여되었습니다.',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ 관리자 설정 오류:', error);
    res.status(500).json({
      success: false,
      error: '관리자 설정 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
