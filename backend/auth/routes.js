/**
 * 인증 API 라우터
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../utils/db');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { sendVerificationEmail, sendWelcomeEmail, sendResetPasswordCodeEmail } = require('../utils/email');
const { authenticateToken, extractAccessToken } = require('../middleware/auth');
const {
  forgotPasswordLimiter,
  forgotPasswordIpLimiter,
  loginAttemptLimiter,
  loginAttemptIpLimiter,
  resetCodeAttemptLimiter,
  resetCodeAttemptIpLimiter,
  verificationCodeAttemptIpLimiter,
  verificationCodeAttemptLimiter,
  verificationDeliveryIpLimiter,
  verificationDeliveryLimiter,
} = require('../middleware/authRateLimit');
const {
  createRecoveryCode,
  hashRecoveryCode,
  isRecoveryCode,
  recoveryCodeMatches,
} = require('./recoveryCodes');
const {
  REFRESH_COOKIE,
  clearAuthCookies,
  getCookie,
  requireCsrfForCookieAuth,
  setAuthCookies,
  setCsrfCookie,
} = require('../utils/authCookies');

const router = express.Router();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUTH_CODE_SENT_RESPONSE = {
  success: true,
  message: '등록된 이메일이라면 인증 코드를 보냈습니다.',
};

/**
 * 6자리 랜덤 인증 코드 생성
 */
function generateVerificationCode() {
  return createRecoveryCode();
}

function sendAuthCodeAccepted(res) {
  return res.json({ ...AUTH_CODE_SENT_RESPONSE });
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

const RESET_CODE_MAX_ATTEMPTS = 5;
const VERIFICATION_CODE_MAX_ATTEMPTS = 5;

function sendResetCodeFailure(res) {
  return res.status(400).json({
    success: false,
    error: '인증 코드를 확인할 수 없습니다. 새로운 코드를 요청해주세요.',
  });
}

function resetCodeIsUsable(resetCode) {
  return Boolean(
    resetCode
    && !resetCode.used
    && !resetCode.locked_at
    && Number(resetCode.attempt_count || 0) < RESET_CODE_MAX_ATTEMPTS
    && new Date(resetCode.expires_at) > new Date(),
  );
}

async function recordInvalidResetCodeAttempt(client, email) {
  await client.query(
    `UPDATE password_reset_codes
     SET attempt_count = attempt_count + 1,
         locked_at = CASE WHEN attempt_count + 1 >= $2 THEN NOW() ELSE locked_at END
     WHERE email = $1`,
    [email, RESET_CODE_MAX_ATTEMPTS],
  );
}

function verificationCodeIsUsable(verification) {
  return Boolean(
    verification
    && !verification.verified
    && !verification.locked_at
    && Number(verification.attempt_count || 0) < VERIFICATION_CODE_MAX_ATTEMPTS
    && new Date(verification.expires_at) > new Date(),
  );
}

async function recordInvalidVerificationCodeAttempt(client, email) {
  await client.query(
    `UPDATE email_verifications
     SET attempt_count = attempt_count + 1,
         locked_at = CASE WHEN attempt_count + 1 >= $2 THEN NOW() ELSE locked_at END
     WHERE email = $1`,
    [email, VERIFICATION_CODE_MAX_ATTEMPTS],
  );
}

function sendVerificationCodeFailure(res) {
  return res.status(400).json({
    success: false,
    error: '인증 코드를 확인할 수 없습니다. 새로운 코드를 요청해주세요.',
  });
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
router.post('/send-verification', verificationDeliveryIpLimiter, verificationDeliveryLimiter, async (req, res) => {
  try {
    const { email: rawEmail } = req.body;
    const email = normalizeEmail(rawEmail);

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

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      `INSERT INTO email_verifications (
        email, code, code_hash, expires_at, verified, attempt_count, locked_at
      ) VALUES ($1, NULL, $2, $3, FALSE, 0, NULL)
      ON CONFLICT (email)
      DO UPDATE SET code = NULL,
                    code_hash = EXCLUDED.code_hash,
                    expires_at = EXCLUDED.expires_at,
                    verified = FALSE,
                    attempt_count = 0,
                    locked_at = NULL,
                    created_at = NOW()`,
      [email, hashRecoveryCode(verificationCode), expiresAt],
    );

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
router.post('/verify-code', verificationCodeAttemptIpLimiter, verificationCodeAttemptLimiter, async (req, res) => {
  const client = await db.getClient();
  let transactionOpen = false;
  try {
    const { email: rawEmail, code } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!email || !isRecoveryCode(code)) {
      return res.status(400).json({
        success: false,
        error: '이메일과 인증 코드가 필요합니다'
      });
    }

    await client.query('BEGIN');
    transactionOpen = true;
    const result = await client.query(
      `SELECT code_hash, expires_at, verified, attempt_count, locked_at
       FROM email_verifications
       WHERE email = $1
       FOR UPDATE`,
      [email],
    );
    const verification = result.rows[0];
    if (!verificationCodeIsUsable(verification) || !recoveryCodeMatches(code, verification.code_hash)) {
      if (verification && verificationCodeIsUsable(verification)) {
        await recordInvalidVerificationCodeAttempt(client, email);
      }
      await client.query('COMMIT');
      transactionOpen = false;
      return sendVerificationCodeFailure(res);
    }

    await client.query(
      `UPDATE email_verifications
       SET verified = TRUE, code = NULL, code_hash = NULL
       WHERE email = $1`,
      [email],
    );
    await client.query('COMMIT');
    transactionOpen = false;

    res.json({
      success: true,
      message: '이메일 인증이 완료되었습니다'
    });

  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    console.error('❌ 인증 코드 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 코드 확인 중 오류가 발생했습니다'
    });
  } finally {
    client.release();
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
  let transactionOpen = false;
  try {
    const { email: rawEmail, password, nickname, specialty, region } = req.body;
    const email = normalizeEmail(rawEmail);

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
    transactionOpen = true;

    if (IS_PRODUCTION) {
      const verification = await client.query(
        `SELECT verified, expires_at
         FROM email_verifications
         WHERE email = $1
         FOR UPDATE`,
        [email],
      );
      const verifiedEmail = verification.rows[0];
      if (!verifiedEmail?.verified || new Date(verifiedEmail.expires_at) <= new Date()) {
        await client.query('ROLLBACK');
        transactionOpen = false;
        return res.status(400).json({
          success: false,
          error: '이메일 인증을 완료해주세요',
        });
      }
    }

    // 이메일 중복 체크
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      transactionOpen = false;
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
      transactionOpen = false;
      return res.status(400).json({
        success: false,
        error: '이미 사용 중인 닉네임입니다'
      });
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, 10);

    // 인증 코드 생성
    const verificationCode = IS_PRODUCTION ? null : generateVerificationCode();
    const verificationCodeHash = verificationCode ? hashRecoveryCode(verificationCode) : null;
    const verificationExpiresAt = IS_PRODUCTION ? null : new Date(Date.now() + 10 * 60 * 1000);

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
        verification_code_hash,
        verification_expires_at,
        auth_provider,
        email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, email, nickname, specialty, region, created_at`,
      [
        email,
        passwordHash,
        nickname,
        nickname, // username도 nickname으로 설정
        specialty || null,
        region || null,
        null,
        verificationCodeHash,
        verificationExpiresAt,
        'email',
        IS_PRODUCTION
      ]
    );

    const user = result.rows[0];

    if (IS_PRODUCTION) {
      await client.query('DELETE FROM email_verifications WHERE email = $1', [email]);
    } else {
      await client.query(
        `INSERT INTO email_logs (user_id, email_type, recipient_email, subject, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'verification', email, '이메일 인증 코드', 'pending']
      );
    }

    await client.query('COMMIT');
    transactionOpen = false;

    if (!IS_PRODUCTION) sendVerificationEmail(email, verificationCode, nickname)
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
        emailVerified: IS_PRODUCTION || user.email_verified || false,
        isAdmin: user.is_admin || false
      }
    });

  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
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
router.post('/verify-email', verificationCodeAttemptIpLimiter, verificationCodeAttemptLimiter, async (req, res) => {
  const client = await db.getClient();
  let transactionOpen = false;
  try {
    const { email: rawEmail, code } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!email || !isRecoveryCode(code)) {
      return res.status(400).json({
        success: false,
        error: '이메일과 인증 코드가 필요합니다'
      });
    }

    await client.query('BEGIN');
    transactionOpen = true;
    const result = await client.query(
      `SELECT id, nickname, verification_code_hash, verification_expires_at,
              verification_attempt_count, verification_locked_at, email_verified
       FROM users 
       WHERE email = $1
       FOR UPDATE`,
      [email],
    );

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      transactionOpen = false;
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }

    const user = result.rows[0];

    // 이미 인증됨
    if (user.email_verified) {
      await client.query('COMMIT');
      transactionOpen = false;
      return res.status(400).json({
        success: false,
        error: '이미 인증된 이메일입니다'
      });
    }

    const verification = {
      code_hash: user.verification_code_hash,
      expires_at: user.verification_expires_at,
      verified: user.email_verified,
      attempt_count: user.verification_attempt_count,
      locked_at: user.verification_locked_at,
    };
    if (!verificationCodeIsUsable(verification) || !recoveryCodeMatches(code, verification.code_hash)) {
      if (verificationCodeIsUsable(verification)) {
        await client.query(
          `UPDATE users
           SET verification_attempt_count = verification_attempt_count + 1,
               verification_locked_at = CASE
                 WHEN verification_attempt_count + 1 >= $2 THEN NOW()
                 ELSE verification_locked_at
               END
           WHERE id = $1`,
          [user.id, VERIFICATION_CODE_MAX_ATTEMPTS],
        );
      }
      await client.query('COMMIT');
      transactionOpen = false;
      return sendVerificationCodeFailure(res);
    }

    await client.query(
      `UPDATE users 
       SET email_verified = TRUE, 
           verification_code = NULL, 
           verification_code_hash = NULL,
           verification_expires_at = NULL,
           verification_attempt_count = 0,
           verification_locked_at = NULL
       WHERE id = $1`,
      [user.id],
    );
    await client.query('COMMIT');
    transactionOpen = false;

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
    if (transactionOpen) await client.query('ROLLBACK');
    console.error('❌ 이메일 인증 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 처리 중 오류가 발생했습니다'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/resend-code
 * 인증 코드 재발송
 */
router.post('/resend-code', verificationDeliveryIpLimiter, verificationDeliveryLimiter, async (req, res) => {
  try {
    const { email: rawEmail } = req.body;
    const email = normalizeEmail(rawEmail);

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
       SET verification_code = NULL,
           verification_code_hash = $1,
           verification_expires_at = $2,
           verification_attempt_count = 0,
           verification_locked_at = NULL
       WHERE id = $3`,
      [hashRecoveryCode(verificationCode), verificationExpiresAt, user.id]
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
router.post('/login', loginAttemptIpLimiter, loginAttemptLimiter, async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = normalizeEmail(rawEmail);

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

    if (IS_PRODUCTION && !user.email_verified) {
      return res.status(403).json({
        success: false,
        error: '이메일 인증을 완료한 후 로그인할 수 있습니다',
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
router.get('/me', (req, res, next) => {
  if (!extractAccessToken(req)) {
    return res.json({ success: true, user: null });
  }
  return authenticateToken(req, res, next);
}, async (req, res) => {
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
router.post('/forgot-password', forgotPasswordIpLimiter, forgotPasswordLimiter, async (req, res) => {
  try {
    const { email: rawEmail } = req.body;
    const email = normalizeEmail(rawEmail);

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
    const verificationCode = createRecoveryCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      `INSERT INTO password_reset_codes (email, code_hash, expires_at, used, attempt_count, locked_at)
       VALUES ($1, $2, $3, FALSE, 0, NULL)
       ON CONFLICT (email)
       DO UPDATE SET code = NULL,
                     code_hash = EXCLUDED.code_hash,
                     expires_at = EXCLUDED.expires_at,
                     created_at = NOW(),
                     used = FALSE,
                     attempt_count = 0,
                     locked_at = NULL`,
      [email, hashRecoveryCode(verificationCode), expiresAt],
    );

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
router.post('/verify-reset-code', resetCodeAttemptIpLimiter, resetCodeAttemptLimiter, async (req, res) => {
  try {
    const { email: rawEmail, code } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!email || !isRecoveryCode(code)) {
      return res.status(400).json({
        success: false,
        error: '이메일과 인증 코드가 필요합니다'
      });
    }

    // 인증 코드 확인
    const result = await db.query(
      'SELECT code_hash, expires_at, used, attempt_count, locked_at FROM password_reset_codes WHERE email = $1',
      [email]
    );

    const resetCode = result.rows[0];
    if (!resetCodeIsUsable(resetCode) || !recoveryCodeMatches(code, resetCode.code_hash)) {
      if (resetCode && resetCodeIsUsable(resetCode)) {
        await recordInvalidResetCodeAttempt(db, email);
      }
      return sendResetCodeFailure(res);
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
router.post('/reset-password', resetCodeAttemptIpLimiter, resetCodeAttemptLimiter, async (req, res) => {
  const client = await db.getClient();
  let transactionOpen = false;
  try {
    const { email: rawEmail, code, newPassword } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!email || !isRecoveryCode(code) || !newPassword) {
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

    await client.query('BEGIN');
    transactionOpen = true;

    const codeResult = await client.query(
      'SELECT code_hash, expires_at, used, attempt_count, locked_at FROM password_reset_codes WHERE email = $1 FOR UPDATE',
      [email]
    );

    const resetCode = codeResult.rows[0];
    if (!resetCodeIsUsable(resetCode) || !recoveryCodeMatches(code, resetCode.code_hash)) {
      if (resetCode && resetCodeIsUsable(resetCode)) {
        await recordInvalidResetCodeAttempt(client, email);
      }
      await client.query('COMMIT');
      transactionOpen = false;
      return sendResetCodeFailure(res);
    }

    // 비밀번호 해싱 및 업데이트
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [passwordHash, email]
    );

    await client.query(
      'UPDATE password_reset_codes SET used = TRUE WHERE email = $1',
      [email]
    );

    await client.query(
      `UPDATE refresh_tokens
       SET is_revoked = TRUE, revoked_at = NOW()
       WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
      [email],
    );

    await client.query('COMMIT');
    transactionOpen = false;

    console.log('✅ 비밀번호 재설정 완료');

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.'
    });

  } catch (error) {
    if (transactionOpen) {
      await client.query('ROLLBACK');
    }
    console.error('❌ 비밀번호 재설정 오류:', error);
    res.status(500).json({
      success: false,
      error: '비밀번호 재설정 중 오류가 발생했습니다'
    });
  } finally {
    client.release();
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
 * 개발 환경에서만 쓰는 관리자 권한 설정 도구.
 * 운영에서는 라우트 자체를 등록하지 않아 공개 승격 경로가 존재하지 않는다.
 */
if (!IS_PRODUCTION) {
  router.post('/set-admin', async (req, res) => {
    try {
      const { email: rawEmail, secretKey } = req.body;
      const email = normalizeEmail(rawEmail);

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

      console.log('✅ 관리자 권한 부여 완료');

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
}

module.exports = router;
