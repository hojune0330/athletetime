/**
 * 인증 API 라우터
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../utils/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 6자리 랜덤 인증 코드 생성
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일로 발송된 인증 코드를 입력해주세요.',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        specialty: user.specialty,
        region: user.region,
        createdAt: user.created_at
      },
      requiresVerification: true
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
      accessToken,
      refreshToken,
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
      accessToken,
      refreshToken,
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

/**
 * POST /api/auth/logout
 * 로그아웃
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Refresh token 무효화
      await db.query(
        'UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE token = $1',
        [refreshToken]
      );
    }

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
 * PUT /api/auth/profile
 * 프로필 수정
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { nickname, specialty, region, instagram, bio } = req.body;

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

    // 프로필 업데이트
    const result = await db.query(
      `UPDATE users 
       SET nickname = COALESCE($1, nickname),
           specialty = COALESCE($2, specialty),
           region = COALESCE($3, region),
           instagram = COALESCE($4, instagram),
           bio = COALESCE($5, bio),
           updated_at = NOW()
       WHERE id = $6
       RETURNING nickname, specialty, region, instagram, bio`,
      [nickname, specialty, region, instagram, bio, req.user.id]
    );

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

module.exports = router;
