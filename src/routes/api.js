/**
 * API 라우트 통합 (Route Aggregator)
 * 
 * ═══════════════════════════════════════════════════════════════
 * 구조 설계 (이식 대비)
 * ═══════════════════════════════════════════════════════════════
 * 
 * 이 파일은 공개 라우트와 관리자 라우트를 통합합니다.
 * 
 * /api/* (공개) → publicRoutes.js
 *   - 프로필 카드 (검색/생성/템플릿/프리셋)
 *   - 대회 참조 정보 (읽기 전용)
 *   - 검색 (선수/소속)
 *   - 데이터 정책
 * 
 * /api/* (관리자) → adminRoutes.js (requireAdmin 적용)
 *   - 시스템 모니터링 (status, system/info)
 *   - 갤러리 관리
 *   - 파이프라인
 *   - 감시 (Watcher)
 *   - 창작 콘텐츠 제작
 *   - 자동 생성 큐
 *   - 히스토리 관리
 * 
 * athletetime 이식 시:
 *   - publicRoutes.js → backend/routes/cardStudio.js (공개)
 *   - adminRoutes.js → backend/routes/cardStudioAdmin.js (관리자)
 *   - requireAdmin → athletetime의 authenticateToken + requireAdmin
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

const publicRoutes = require('./publicRoutes');
const adminRoutes = require('./adminRoutes');
const { requireAdmin } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');

// ============================================
// 공개 API (인증 불필요, rate-limit 적용)
// ============================================
// optionalAuth: 인증 정보가 있으면 첨부 (관리자면 rate-limit 면제)
router.use(optionalAuth);
router.use(publicRoutes);

// ============================================
// 관리자 API (인증 필수)
// ============================================
router.use(requireAdmin, adminRoutes);

module.exports = router;
