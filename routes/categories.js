/**
 * 카테고리 라우터 (v4.0.0 - Clean Architecture)
 * 
 * 핵심 기능:
 * - 카테고리 목록 조회
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/categories
 * 카테고리 목록 조회 (활성 카테고리만)
 */
router.get('/', async (req, res) => {
  try {
    const result = await req.app.locals.pool.query(`
      SELECT 
        id,
        name,
        icon,
        color,
        description,
        sort_order,
        is_active
      FROM categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC
    `);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ [GET /api/categories] 에러:', error);
    res.status(500).json({ 
      success: false, 
      error: '카테고리 목록을 불러올 수 없습니다.' 
    });
  }
});

module.exports = router;
