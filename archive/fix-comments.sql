-- 댓글 테이블 구조 확인 및 수정
-- PostgreSQL 댓글 문제 해결 스크립트

-- 1. 현재 comments 테이블 구조 확인
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;

-- 2. 댓글 데이터 확인
SELECT COUNT(*) as total_comments FROM comments;

-- 3. 최근 댓글 10개 확인
SELECT id, post_id, author, content, created_at 
FROM comments 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. 특정 게시글의 댓글 확인 (예: 최근 게시글)
SELECT p.id as post_id, p.title, COUNT(c.id) as comment_count
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id, p.title
ORDER BY p.created_at DESC
LIMIT 5;

-- 5. 만약 post_id의 타입이 다르다면 수정
-- ALTER TABLE comments ALTER COLUMN post_id TYPE BIGINT USING post_id::BIGINT;

-- 6. 인덱스 재생성 (성능 개선)
DROP INDEX IF EXISTS idx_comments_post_id;
CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);

-- 7. 테스트 댓글 추가
INSERT INTO comments (post_id, author, content, created_at)
SELECT 
    p.id,
    'DB 테스트',
    'DB에서 직접 추가한 테스트 댓글입니다.',
    NOW()
FROM posts p
ORDER BY p.created_at DESC
LIMIT 1;

-- 8. 추가된 댓글 확인
SELECT * FROM comments WHERE author = 'DB 테스트';