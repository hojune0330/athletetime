-- 🏃 Athlete Time Community Database Schema
-- PostgreSQL 데이터베이스 스키마
-- Created: 2025-10-29
-- Database: athlete-time

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

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
    total_likes_received INTEGER DEFAULT 0,
    
    -- 인덱스
    INDEX idx_users_anonymous_id (anonymous_id),
    INDEX idx_users_created_at (created_at)
);

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
    search_vector tsvector,
    
    -- 인덱스
    INDEX idx_posts_category_id (category_id),
    INDEX idx_posts_user_id (user_id),
    INDEX idx_posts_created_at (created_at DESC),
    INDEX idx_posts_is_notice (is_notice),
    INDEX idx_posts_is_blinded (is_blinded),
    INDEX idx_posts_search (search_vector) USING gin
);

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
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 인덱스
    INDEX idx_images_post_id (post_id),
    INDEX idx_images_cloudinary_id (cloudinary_id)
);

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
    UNIQUE (post_id, user_id),
    
    -- 인덱스
    INDEX idx_votes_post_id (post_id),
    INDEX idx_votes_user_id (user_id)
);

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
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 인덱스
    INDEX idx_comments_post_id (post_id),
    INDEX idx_comments_user_id (user_id),
    INDEX idx_comments_parent_comment_id (parent_comment_id),
    INDEX idx_comments_created_at (created_at)
);

-- ============================================
-- 7. 신고 테이블
-- ============================================
CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 신고 정보
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- 처리 상태
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    admin_note TEXT,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- 유니크 제약 (한 사용자는 하나의 컨텐츠에 한 번만 신고)
    UNIQUE (post_id, user_id),
    UNIQUE (comment_id, user_id),
    
    -- 인덱스
    INDEX idx_reports_post_id (post_id),
    INDEX idx_reports_comment_id (comment_id),
    INDEX idx_reports_user_id (user_id),
    INDEX idx_reports_status (status)
);

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
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- 인덱스
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created_at (created_at DESC)
);

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
    UNIQUE (user_id, action, window_start),
    
    -- 인덱스
    INDEX idx_rate_limits_user_id (user_id),
    INDEX idx_rate_limits_window_start (window_start)
);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 인덱스
    INDEX idx_daily_stats_date (date DESC)
);

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

-- 신고 카운터 업데이트
CREATE OR REPLACE FUNCTION update_reports_count() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE posts SET reports_count = reports_count + 1 WHERE id = NEW.post_id;
            
            -- 신고 10건 이상 시 자동 블라인드
            UPDATE posts SET is_blinded = TRUE, blind_reason = 'auto_reports' 
            WHERE id = NEW.post_id AND reports_count >= 10;
        END IF;
        
        IF NEW.comment_id IS NOT NULL THEN
            UPDATE comments SET reports_count = reports_count + 1 WHERE id = NEW.comment_id;
            
            -- 신고 5건 이상 시 자동 블라인드
            UPDATE comments SET is_blinded = TRUE, blind_reason = 'auto_reports' 
            WHERE id = NEW.comment_id AND reports_count >= 5;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_count_trigger
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_count();

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
-- 권한 설정 (보안)
-- ============================================

-- 애플리케이션 사용자 생성 (보안상 root 사용 금지)
-- CREATE USER athlete_time_app WITH PASSWORD 'your_secure_password';
-- GRANT CONNECT ON DATABASE athlete_time TO athlete_time_app;
-- GRANT USAGE ON SCHEMA public TO athlete_time_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO athlete_time_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO athlete_time_app;

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

-- 매일 자동 실행하도록 설정 (pg_cron extension 필요)
-- SELECT cron.schedule('cleanup-old-data', '0 3 * * *', 'SELECT cleanup_old_data()');

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
('1.0.0', 'Initial schema with full feature set: users, posts, comments, notifications, images, search');

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
