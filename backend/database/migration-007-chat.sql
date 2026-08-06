-- migration-007-chat.sql
-- 채팅「자유수다」오픈: chat_messages + reports + users.muted_until
-- 설계: docs/athletetime-chat-open-plan.md (§2.4, §2.5)
-- 원본 스펙: docs/work-orders/20260708-community-activation-track-h.md (H-1b/H-1c)
-- idempotent: 모든 문장 IF NOT EXISTS — 운영 DB 재실행 안전.
-- 익명 원칙: user_key_hash(세션 키 SHA-256)만 저장, 원문 식별자·실명·IP 미저장.

-- 1. 채팅 메시지 (30일 보존, 자동 블라인드 지원)
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id VARCHAR(32) NOT NULL DEFAULT 'main',
  nickname VARCHAR(20) NOT NULL,
  user_key_hash CHAR(64) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_blinded BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_at TIMESTAMPTZ
);

-- 입장 시 최근 히스토리 조회 + 30일 배치 삭제 인덱스
CREATE INDEX IF NOT EXISTS chat_messages_room_created_idx
  ON chat_messages (room_id, created_at DESC);

-- 2. 신고 (H-1b: target_type 'post'|'comment'|'chat')
CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('post', 'comment', 'chat')),
  target_id VARCHAR(64) NOT NULL,
  reporter_anonymous_id VARCHAR(255) NOT NULL,
  reason_code VARCHAR(32) NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 같은 신고자의 중복 신고는 미카운트 (블라인드 도달 3명의 고유 신고자 조건)
  UNIQUE (target_type, target_id, reporter_anonymous_id)
);

CREATE INDEX IF NOT EXISTS reports_target_idx
  ON reports (target_type, target_id);

CREATE INDEX IF NOT EXISTS reports_created_idx
  ON reports (created_at DESC);

-- 3. 이용 제한 (H-1b: muted_until 경과 시 자동 해제)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;
