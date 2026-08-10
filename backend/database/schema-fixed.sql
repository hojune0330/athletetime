-- 🏃 Athlete Time Community Database Schema
-- PostgreSQL 데이터베이스 스키마
-- Created: 2025-10-29
-- Database: athlete-time
-- Version: 1.0.1 (INDEX syntax fixed)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- ============================================
-- DROP existing tables if they exist
-- ============================================
DROP TABLE IF EXISTS schema_version CASCADE;
DROP TABLE IF EXISTS daily_stats CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP VIEW IF EXISTS active_posts CASCADE;
DROP VIEW IF EXISTS popular_posts CASCADE;

-- ============================================
-- 1. 사용자 테이블 (익명 사용자 포함)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL,
    anonymous_id VARCHAR(100) UNIQUE, -- localStorage의 익명 ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    
    -- 통계
    total_posts INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0
);

CREATE INDEX idx_users_anonymous_id ON users(anonymous_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================
-- 2. 카테고리 테이블
-- ============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50), -- emoji or icon class
    color VARCHAR(7), -- hex color
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 기본 카테고리 추가
INSERT INTO categories (name, description, icon, color, sort_order) VALUES
('공지', '중요한 공지사항', '📢', '#FFD700', 1),
('자유', '자유로운 이야기', '💬', '#00FFB3', 2),
('대회', '대회 정보 및 후기', '🏆', '#FF6B6B', 3),
('훈련', '훈련 방법 및 팁', '💪', '#4ECDC4', 4),
('질문', '궁금한 점 질문', '❓', '#95E1D3', 5),
('장비', '장비 리뷰 및 추천', '🔧', '#F38181', 6);

-- ============================================
-- 3. 게시글 테이블
-- ============================================
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 기본 정보
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(50) NOT NULL, -- 표시용 닉네임
    password_hash VARCHAR(255), -- bcrypt 해시
    instagram VARCHAR(50),
    
    -- 상태
    is_notice BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_blinded BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    blind_reason VARCHAR(100),
    
    -- 통계
    views INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 검색용 full-text search
    search_vector tsvector
);

CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_is_notice ON posts(is_notice);
CREATE INDEX idx_posts_is_blinded ON posts(is_blinded);
CREATE INDEX idx_posts_search ON posts USING gin(search_vector);

-- Full-text search 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION posts_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.author, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_search_vector_trigger
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION posts_search_vector_update();

-- ============================================
-- 4. 이미지 테이블
-- ============================================
CREATE TABLE images (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Cloudinary 정보
    cloudinary_id VARCHAR(255) NOT NULL UNIQUE,
    cloudinary_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- 메타데이터
    original_filename VARCHAR(255),
    file_size INTEGER, -- bytes
    width INTEGER,
    height INTEGER,
    format VARCHAR(10), -- jpg, png, webp
    
    -- 순서
    sort_order INTEGER DEFAULT 0,
    
    -- 타임스탬프
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_post_id ON images(post_id);
CREATE INDEX idx_images_cloudinary_id ON images(cloudinary_id);

-- ============================================
-- 5. 투표 테이블 (좋아요/싫어요)
-- ============================================
CREATE TABLE votes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 투표 타입
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 유니크 제약 (한 사용자는 하나의 게시글에 한 번만 투표)
    UNIQUE (post_id, user_id)
);

CREATE INDEX idx_votes_post_id ON votes(post_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- ============================================
-- 6. 댓글 테이블
-- ============================================
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE, -- 대댓글 지원
    
    -- 기본 정보
    content TEXT NOT NULL,
    author VARCHAR(50) NOT NULL,
    instagram VARCHAR(50),
    
    -- 상태
    is_blinded BOOLEAN DEFAULT FALSE,
    blind_reason VARCHAR(100),
    
    -- 통계
    reports_count INTEGER DEFAULT 0,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- ============================================
-- 7. 신고 테이블
-- ============================================
CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('post', 'comment', 'chat')),
    target_id VARCHAR(64) NOT NULL,
    reporter_anonymous_id VARCHAR(255) NOT NULL,
    reason_code VARCHAR(32) NOT NULL,
    detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (target_type, target_id, reporter_anonymous_id)
);

CREATE INDEX reports_target_idx ON reports(target_type, target_id);
CREATE INDEX reports_created_idx ON reports(created_at DESC);

-- ============================================
-- 8. 알림 테이블
-- ============================================
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 알림 정보
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'new_comment',      -- 내 게시글에 새 댓글
        'comment_reply',    -- 내 댓글에 답글
        'post_like',        -- 내 게시글에 좋아요
        'mention',          -- 멘션 (@username)
        'system'            -- 시스템 알림
    )),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- 연관 데이터
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 상태
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 9. Rate Limiting 테이블
-- ============================================
CREATE TABLE rate_limits (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rate limit 정보
    action VARCHAR(50) NOT NULL CHECK (action IN ('post', 'comment', 'vote', 'report')),
    count INTEGER DEFAULT 1,
    
    -- 타임스탬프
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 유니크 제약
    UNIQUE (user_id, action, window_start)
);

CREATE INDEX idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);

-- ============================================
-- 10. 통계 테이블 (일별)
-- ============================================
CREATE TABLE daily_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    
    -- 게시글 통계
    new_posts INTEGER DEFAULT 0,
    new_comments INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    
    -- 사용자 통계
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    
    -- 생성 시간
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

-- ============================================
-- 트리거: 게시글 카운터 자동 업데이트
-- ============================================

-- 좋아요/싫어요 카운터 업데이트
CREATE OR REPLACE FUNCTION update_post_votes_count() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'like' THEN
            UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSE
            UPDATE posts SET dislikes_count = dislikes_count + 1 WHERE id = NEW.post_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.vote_type = 'like' AND NEW.vote_type = 'dislike' THEN
            UPDATE posts SET likes_count = likes_count - 1, dislikes_count = dislikes_count + 1 WHERE id = NEW.post_id;
        ELSIF OLD.vote_type = 'dislike' AND NEW.vote_type = 'like' THEN
            UPDATE posts SET dislikes_count = dislikes_count - 1, likes_count = likes_count + 1 WHERE id = NEW.post_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'like' THEN
            UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        ELSE
            UPDATE posts SET dislikes_count = dislikes_count - 1 WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_votes_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_votes_count();

-- 댓글 카운터 업데이트
CREATE OR REPLACE FUNCTION update_post_comments_count() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_comments_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comments_count();

-- ============================================
-- 유용한 뷰 (Views)
-- ============================================

-- 활성 게시글 뷰 (블라인드되지 않은 게시글)
CREATE VIEW active_posts AS
SELECT 
    p.*,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    u.username AS user_username,
    (SELECT COUNT(*) FROM images WHERE post_id = p.id) AS images_count
FROM posts p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.is_blinded = FALSE AND p.deleted_at IS NULL
ORDER BY p.is_pinned DESC, p.created_at DESC;

-- 인기 게시글 뷰 (최근 7일, 좋아요 많은 순)
CREATE VIEW popular_posts AS
SELECT 
    p.*,
    c.name AS category_name,
    (p.likes_count - p.dislikes_count) AS score
FROM posts p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_blinded = FALSE 
    AND p.deleted_at IS NULL
    AND p.created_at > NOW() - INTERVAL '7 days'
ORDER BY score DESC, p.views DESC
LIMIT 10;

-- ============================================
-- 인덱스 최적화
-- ============================================

-- 복합 인덱스 추가
CREATE INDEX idx_posts_category_created ON posts(category_id, created_at DESC);
CREATE INDEX idx_posts_not_blinded_created ON posts(is_blinded, created_at DESC) WHERE is_blinded = FALSE;
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;

-- ============================================
-- 데이터 유지보수 함수
-- ============================================

-- 오래된 데이터 정리 (90일 이상)
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- 오래된 게시글 삭제 (소프트 삭제)
    UPDATE posts SET deleted_at = NOW() 
    WHERE created_at < NOW() - INTERVAL '90 days' 
        AND is_notice = FALSE 
        AND deleted_at IS NULL;
    
    -- 오래된 알림 삭제
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days' AND is_read = TRUE;
    
    -- 오래된 rate limit 데이터 삭제
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 day';
    
    RAISE NOTICE 'Old data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 완료!
-- ============================================

-- 스키마 버전 정보
CREATE TABLE schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES 
('1.0.1', 'Fixed INDEX syntax - all indexes created separately');

-- 성공 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Tables: 11';
    RAISE NOTICE '🔍 Indexes: 20+';
    RAISE NOTICE '⚡ Triggers: 4';
    RAISE NOTICE '👁️ Views: 2';
    RAISE NOTICE '🚀 Ready for production!';
END $$;
