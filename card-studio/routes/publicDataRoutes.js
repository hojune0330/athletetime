/**
 * publicDataRoutes.js — 공공데이터 거시통계 공개 API (S1/운영데이터 노출 골격)
 *
 * 소유: Claude(인문/신뢰 도메인). Codex 소유 publicRoutes.js 와 분리된 별도 라우터.
 * 마운트: /api/public-data (src/server.js)
 *
 * 설계(재정비 염두):
 *   - publicDataService 결과형태(JSON 계약)를 그대로 노출 → UI가 바뀌어도 백엔드 계약 불변.
 *   - 모든 응답에 source(출처) 동봉(신뢰 프레임). 사실/익명 거시통계만.
 *   - CSV 미배치 시 available:false + ingestion 안내(HTTP 200, 에러 아님 → UI가 빈상태 처리).
 */

const express = require('express');
const publicDataService = require('../services/publicDataService');

const router = express.Router();

/** 공통: 출처 메타를 항상 포함하는 응답 래퍼. */
function ok(res, payload) {
  return res.json({ ok: true, ...payload });
}

// GET /api/public-data/status — 적재 상태(운영/디버그). PII 없음.
router.get('/status', (req, res) => {
  return ok(res, { status: publicDataService.getStatus() });
});

// GET /api/public-data/distribution — 연도/시도/성별/종목 익명 분포 + 출처.
router.get('/distribution', (req, res) => {
  return ok(res, { distribution: publicDataService.getDistribution() });
});

// GET /api/public-data/breakdown?dimension=sport&region=서울 ...
//   dimension 차원의 분포를, 나머지 쿼리스트링을 동등필터로 적용해 반환.
router.get('/breakdown', (req, res) => {
  const { dimension, ...filters } = req.query || {};
  if (!dimension) {
    return res.status(400).json({
      ok: false,
      error: 'dimension 쿼리 파라미터가 필요합니다(예: ?dimension=sport).',
    });
  }
  return ok(res, {
    breakdown: publicDataService.getBreakdown(String(dimension), filters),
  });
});

module.exports = router;
