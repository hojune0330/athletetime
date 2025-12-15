-- 🏃 Athlete Time - Poll 기능 추가 마이그레이션
-- Version: 1.1.0
-- Date: 2025-11-04
-- Description: posts 테이블에 poll 기능 추가

-- ============================================
-- 1. Poll 데이터 구조 (JSONB)
-- ============================================
-- poll 필드 구조:
-- {
--   "question": "투표 질문",
--   "options": [
--     {"id": 1, "text": "선택지 1", "votes": 0},
--     {"id": 2, "text": "선택지 2", "votes": 0}
--   ],
--   "allow_multiple": false,
--   "ends_at": "2025-12-31T23:59:59Z",
--   "total_votes": 0
-- }

-- ============================================
-- 2. posts 테이블에 poll 컬럼 추가
-- ============================================
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS poll JSONB DEFAULT NULL;

-- Poll이 있는 게시글 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_poll 
ON posts USING gin(poll) 
WHERE poll IS NOT NULL;

-- ============================================
-- 3. poll_votes 테이블 생성 (투표 이력)
-- ============================================
CREATE TABLE IF NOT EXISTS poll_votes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 선택한 옵션 ID들 (다중 선택 지원)
    option_ids INTEGER[] NOT NULL,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 유니크 제약 (한 사용자는 하나의 투표에 한 번만 참여)
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);

-- ============================================
-- 4. Poll 관련 함수
-- ============================================

-- Poll 투표 추가/업데이트 함수
CREATE OR REPLACE FUNCTION vote_poll(
    p_post_id BIGINT,
    p_user_id UUID,
    p_option_ids INTEGER[]
) RETURNS JSONB AS $$
DECLARE
    v_poll JSONB;
    v_updated_poll JSONB;
    v_old_options INTEGER[];
BEGIN
    -- 기존 투표 확인
    SELECT option_ids INTO v_old_options
    FROM poll_votes
    WHERE post_id = p_post_id AND user_id = p_user_id;
    
    -- 현재 poll 데이터 가져오기
    SELECT poll INTO v_poll
    FROM posts
    WHERE id = p_post_id;
    
    IF v_poll IS NULL THEN
        RAISE EXCEPTION 'Poll not found for post %', p_post_id;
    END IF;
    
    -- 기존 투표가 있으면 카운트 감소
    IF v_old_options IS NOT NULL THEN
        -- 이전 투표 카운트 감소
        v_updated_poll := (
            SELECT jsonb_set(
                v_poll,
                '{options}',
                (
                    SELECT jsonb_agg(
                        CASE 
                            WHEN (option->>'id')::int = ANY(v_old_options) THEN
                                jsonb_set(option, '{votes}', to_jsonb((option->>'votes')::int - 1))
                            ELSE option
                        END
                    )
                    FROM jsonb_array_elements(v_poll->'options') AS option
                )
            )
        );
        v_poll := v_updated_poll;
    END IF;
    
    -- 새 투표 카운트 증가
    v_updated_poll := (
        SELECT jsonb_set(
            v_poll,
            '{options}',
            (
                SELECT jsonb_agg(
                    CASE 
                        WHEN (option->>'id')::int = ANY(p_option_ids) THEN
                            jsonb_set(option, '{votes}', to_jsonb((option->>'votes')::int + 1))
                        ELSE option
                    END
                )
                FROM jsonb_array_elements(v_poll->'options') AS option
            )
        )
    );
    
    -- 총 투표 수 업데이트
    v_updated_poll := jsonb_set(
        v_updated_poll,
        '{total_votes}',
        to_jsonb((v_updated_poll->>'total_votes')::int + 1)
    );
    
    -- posts 테이블 업데이트
    UPDATE posts SET poll = v_updated_poll WHERE id = p_post_id;
    
    -- poll_votes 테이블 upsert
    INSERT INTO poll_votes (post_id, user_id, option_ids)
    VALUES (p_post_id, p_user_id, p_option_ids)
    ON CONFLICT (post_id, user_id) 
    DO UPDATE SET 
        option_ids = p_option_ids,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN v_updated_poll;
END;
$$ LANGUAGE plpgsql;

-- Poll 결과 조회 함수
CREATE OR REPLACE FUNCTION get_poll_results(p_post_id BIGINT)
RETURNS TABLE (
    option_id INTEGER,
    option_text TEXT,
    votes INTEGER,
    percentage NUMERIC
) AS $$
DECLARE
    v_poll JSONB;
    v_total_votes INTEGER;
BEGIN
    SELECT poll INTO v_poll FROM posts WHERE id = p_post_id;
    
    IF v_poll IS NULL THEN
        RAISE EXCEPTION 'Poll not found for post %', p_post_id;
    END IF;
    
    v_total_votes := (v_poll->>'total_votes')::INTEGER;
    
    RETURN QUERY
    SELECT 
        (option->>'id')::INTEGER,
        option->>'text',
        (option->>'votes')::INTEGER,
        CASE 
            WHEN v_total_votes > 0 THEN 
                ROUND(((option->>'votes')::INTEGER * 100.0 / v_total_votes), 2)
            ELSE 0
        END
    FROM jsonb_array_elements(v_poll->'options') AS option;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. 스키마 버전 업데이트
-- ============================================
INSERT INTO schema_version (version, description) VALUES 
('1.1.0', 'Added poll functionality with JSONB and poll_votes table')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- 6. 예제 데이터 (테스트용)
-- ============================================
-- 주석 제거하면 테스트용 투표 게시글 생성
/*
-- 테스트용 투표 게시글
UPDATE posts SET poll = '{
  "question": "당신의 주종목은?",
  "options": [
    {"id": 1, "text": "단거리 (100m, 200m)", "votes": 0},
    {"id": 2, "text": "중거리 (400m, 800m)", "votes": 0},
    {"id": 3, "text": "장거리 (1500m 이상)", "votes": 0},
    {"id": 4, "text": "마라톤", "votes": 0}
  ],
  "allow_multiple": false,
  "ends_at": null,
  "total_votes": 0
}'::jsonb
WHERE id = 1; -- 첫 번째 게시글에 투표 추가
*/

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Poll migration completed successfully!';
    RAISE NOTICE '📊 Added: poll column (JSONB)';
    RAISE NOTICE '📊 Added: poll_votes table';
    RAISE NOTICE '⚡ Added: vote_poll() function';
    RAISE NOTICE '⚡ Added: get_poll_results() function';
    RAISE NOTICE '🚀 Ready for poll feature!';
END $$;
