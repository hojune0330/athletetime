-- 🏆 Athlete Time - Competitions & Match Results Migration
-- Version: 1.0.0
-- Description: 대회 목록 및 경기 결과 테이블

-- ============================================
-- 1. 대회 테이블 (competitions)
-- ============================================
CREATE TABLE IF NOT EXISTS competitions (
    id BIGSERIAL PRIMARY KEY,
    
    -- 기본 정보
    name VARCHAR(200) NOT NULL,                    -- 대회명
    type VARCHAR(20) NOT NULL DEFAULT '국내경기',   -- 국내경기 / 국제경기
    category VARCHAR(50) NOT NULL DEFAULT '트랙 및 필드', -- 트랙 및 필드 / 로드레이스 / 단일종목경기
    
    -- 일정
    start_date DATE NOT NULL,                      -- 시작일
    end_date DATE NOT NULL,                        -- 종료일
    year INTEGER NOT NULL,                         -- 연도
    month INTEGER NOT NULL,                        -- 월 (01 ~ 12)
    
    -- 장소
    location VARCHAR(100) NOT NULL,                -- 장소
    
    -- 메타
    description TEXT,                              -- 설명 (선택)
    
    -- 관리
    created_by UUID REFERENCES users(id),          -- 등록한 관리자
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE            -- soft delete
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_competitions_type ON competitions(type);
CREATE INDEX IF NOT EXISTS idx_competitions_year ON competitions(year);
CREATE INDEX IF NOT EXISTS idx_competitions_category ON competitions(category);
CREATE INDEX IF NOT EXISTS idx_competitions_start_date ON competitions(start_date);
CREATE INDEX IF NOT EXISTS idx_competitions_deleted_at ON competitions(deleted_at);

-- ============================================
-- 2. 경기 결과 테이블 (match_results)
-- ============================================
CREATE TABLE IF NOT EXISTS match_results (
    id BIGSERIAL PRIMARY KEY,
    competition_id BIGINT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    
    -- 경기 정보
    event VARCHAR(50) NOT NULL,                    -- 종목 (100m, 200m, 마라톤 등)
    division VARCHAR(50) NOT NULL,                 -- 종별 (남자부, 여자부, 고등부 등)
    round VARCHAR(50) NOT NULL,                    -- 라운드 (예선, 준결승, 결승)
    
    -- 결과 데이터 (JSON)
    -- 형식: [{ rank: 1, athlete_name: "김선수", team: "서울", record: "10.21", note: "PB" }, ...]
    results JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- 메타
    event_date DATE,                               -- 경기 일자 (선택)
    notes TEXT,                                    -- 비고
    
    -- 관리
    created_by UUID REFERENCES users(id),          -- 등록한 관리자
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE            -- soft delete
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_match_results_competition_id ON match_results(competition_id);
CREATE INDEX IF NOT EXISTS idx_match_results_event ON match_results(event);
CREATE INDEX IF NOT EXISTS idx_match_results_division ON match_results(division);
CREATE INDEX IF NOT EXISTS idx_match_results_round ON match_results(round);
CREATE INDEX IF NOT EXISTS idx_match_results_deleted_at ON match_results(deleted_at);

-- ============================================
-- 스키마 버전 업데이트
-- ============================================
INSERT INTO schema_version (version, description) 
VALUES ('1.1.0', 'Added competitions and match_results tables')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 002 - Competitions completed!';
    RAISE NOTICE '📊 New Tables: competitions, match_results';
END $$;
