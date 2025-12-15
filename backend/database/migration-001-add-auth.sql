-- ============================================
-- Migration 001: Add Authentication System
-- Created: 2025-10-30
-- Description: 이메일 회원가입 및 인증 시스템 추가
-- ============================================

-- ============================================
-- 1. users 테이블에 인증 관련 컬럼 추가
-- ============================================

-- 이메일 인증 관련 컬럼
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50);

-- 이메일 인증
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE;

-- 프로필 정보
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(50); -- 주종목
ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(50); -- 지역
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT; -- 프로필 사진
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram VARCHAR(100); -- 인스타 ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT; -- 자기소개

-- 계정 상태
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- 비밀번호 재설정
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE;

-- 사용자 타입 구분 (소셜 로그인 대비)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255);

-- ============================================
-- 2. 인덱스 추가
-- ============================================

-- 이메일 검색 최적화
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- 인증 코드 검색 최적화
CREATE INDEX IF NOT EXISTS idx_users_verification_code ON users(verification_code);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- ============================================
-- 3. 제약 조건 추가
-- ============================================

-- 이메일 사용자는 email과 password_hash 필수
-- (익명 사용자는 제외하기 위해 체크 제약 없음)

-- 닉네임 유니크 제약 (NULL 제외)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname_unique 
ON users(nickname) WHERE nickname IS NOT NULL;

-- OAuth ID 유니크 제약 (provider별)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_unique 
ON users(auth_provider, oauth_id) WHERE oauth_id IS NOT NULL;

-- ============================================
-- 4. JWT Refresh Token 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    
    -- 토큰 정보
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- 디바이스 정보
    user_agent TEXT,
    ip_address INET,
    
    -- 상태
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================
-- 5. 로그인 히스토리 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 로그인 정보
    login_type VARCHAR(50) NOT NULL, -- 'email', 'google', 'kakao'
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    
    -- 디바이스 정보
    user_agent TEXT,
    ip_address INET,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_created_at ON login_history(created_at DESC);

-- ============================================
-- 6. 이메일 발송 로그 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS email_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 이메일 정보
    email_type VARCHAR(50) NOT NULL, -- 'verification', 'reset_password', 'notification'
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    
    -- 발송 상태
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    
    -- 외부 서비스 정보 (Resend)
    external_id VARCHAR(255), -- Resend message ID
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- ============================================
-- 7. 함수: 만료된 인증 코드 정리
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_codes() RETURNS void AS $$
BEGIN
    -- 만료된 인증 코드 삭제
    UPDATE users 
    SET verification_code = NULL, 
        verification_expires_at = NULL
    WHERE verification_expires_at < NOW();
    
    -- 만료된 리셋 토큰 삭제
    UPDATE users 
    SET reset_token = NULL, 
        reset_token_expires_at = NULL
    WHERE reset_token_expires_at < NOW();
    
    -- 만료된 refresh token 삭제
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW();
    
    RAISE NOTICE 'Expired codes and tokens cleaned up';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. 함수: 사용자 통계 업데이트
-- ============================================

CREATE OR REPLACE FUNCTION update_user_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
        UPDATE users SET total_posts = total_posts + 1 WHERE id = NEW.user_id;
    ELSIF TG_TABLE_NAME = 'comments' AND TG_OP = 'INSERT' THEN
        UPDATE users SET total_comments = total_comments + 1 WHERE id = NEW.user_id;
    ELSIF TG_TABLE_NAME = 'votes' AND TG_OP = 'INSERT' AND NEW.vote_type = 'like' THEN
        -- 게시글 작성자에게 좋아요 카운트 증가
        UPDATE users u
        SET total_likes_received = total_likes_received + 1
        FROM posts p
        WHERE p.id = NEW.post_id AND p.user_id = u.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (이미 있으면 삭제 후 재생성)
DROP TRIGGER IF EXISTS trigger_update_user_stats_posts ON posts;
DROP TRIGGER IF EXISTS trigger_update_user_stats_comments ON comments;
DROP TRIGGER IF EXISTS trigger_update_user_stats_votes ON votes;

CREATE TRIGGER trigger_update_user_stats_posts
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER trigger_update_user_stats_comments
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER trigger_update_user_stats_votes
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- ============================================
-- 9. 관리자 계정 생성 (선택적)
-- ============================================

-- 기본 관리자 계정 (비밀번호: admin123! - 나중에 변경 필수)
-- bcrypt 해시: $2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

-- INSERT INTO users (
--     username, 
--     email, 
--     password_hash, 
--     nickname,
--     email_verified,
--     is_admin,
--     is_active,
--     auth_provider
-- ) VALUES (
--     '관리자',
--     'admin@athletetime.com',
--     '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', -- 실제 해시로 교체 필요
--     '관리자',
--     TRUE,
--     TRUE,
--     TRUE,
--     'email'
-- ) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 10. 스키마 버전 업데이트
-- ============================================

INSERT INTO schema_version (version, description) VALUES 
('1.1.0', 'Added authentication system with email verification and JWT support')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Authentication migration completed!';
    RAISE NOTICE '📧 Email authentication system added';
    RAISE NOTICE '🔐 JWT refresh token support added';
    RAISE NOTICE '📊 New tables: refresh_tokens, login_history, email_logs';
    RAISE NOTICE '🔍 New indexes: 8+';
    RAISE NOTICE '🚀 Ready for user registration!';
END $$;
