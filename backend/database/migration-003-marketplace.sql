-- ============================================
-- Migration: marketplace (중고거래)
-- Version: 1.2.0
-- Description: 중고거래 상품 및 댓글 테이블 추가
-- ============================================

-- marketplace_items 테이블 생성
CREATE TABLE IF NOT EXISTS marketplace_items (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  status VARCHAR(20) NOT NULL DEFAULT '판매중' CHECK (status IN ('판매중', '예약중', '판매완료')),
  images JSONB DEFAULT '[]'::jsonb,
  thumbnail_index INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- marketplace_comments 테이블 생성
CREATE TABLE IF NOT EXISTS marketplace_comments (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller ON marketplace_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_created_at ON marketplace_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_deleted_at ON marketplace_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_item ON marketplace_comments(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_user ON marketplace_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_deleted_at ON marketplace_comments(deleted_at);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_marketplace_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_marketplace_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_marketplace_items_updated_at ON marketplace_items;
CREATE TRIGGER trigger_update_marketplace_items_updated_at
  BEFORE UPDATE ON marketplace_items
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_items_updated_at();

DROP TRIGGER IF EXISTS trigger_update_marketplace_comments_updated_at ON marketplace_comments;
CREATE TRIGGER trigger_update_marketplace_comments_updated_at
  BEFORE UPDATE ON marketplace_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_comments_updated_at();

-- 스키마 버전 업데이트
INSERT INTO schema_version (version, description)
VALUES ('1.2.0', 'Added marketplace tables')
ON CONFLICT (version) DO NOTHING;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003 - Marketplace completed!';
  RAISE NOTICE '🛒 New Tables: marketplace_items, marketplace_comments';
END $$;
