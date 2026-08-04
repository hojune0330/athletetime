/**
 * 🏆 대회 관리 API
 * 
 * GET    /api/competitions              - 대회 목록
 * GET    /api/competitions/:id          - 대회 상세
 * POST   /api/competitions              - 대회 등록 (관리자)
 * PUT    /api/competitions/:id          - 대회 수정 (관리자)
 * DELETE /api/competitions/:id          - 대회 삭제 (관리자)
 */

const express = require('express');
const { logger } = require('../utils/privacyGuardLogger');
const router = express.Router();
const { optionalAuth, requireAdmin, authenticateToken } = require('../middleware/auth');

// ============================================
// GET /api/competitions
// 대회 목록 조회
// ============================================
router.get('/', async (req, res) => {
  try {
    const { 
      type = '',      // 국내경기 / 국제경기
      year = new Date().getFullYear(),
      category = ''   // 트랙 및 필드 / 로드레이스 / 단일종목경기
    } = req.query;
    
    let query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM match_results mr WHERE mr.competition_id = c.id AND mr.deleted_at IS NULL) as results_count
      FROM competitions c
      WHERE c.deleted_at IS NULL
    `;
    const params = [];
    let paramIndex = 1;
    
    // 연도 필터
    if (year) {
      query += ` AND c.year = $${paramIndex}`;
      params.push(parseInt(year));
      paramIndex++;
    }
    
    // 타입 필터 (국내/국제)
    if (type) {
      query += ` AND c.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    // 카테고리 필터
    if (category) {
      query += ` AND c.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    query += ` ORDER BY c.month ASC, c.start_date ASC`;
    
    const result = await req.app.locals.pool.query(query, params);
    
    // 카테고리별로 그룹핑
    const grouped = {};
    result.rows.forEach(comp => {
      if (!grouped[comp.category]) {
        grouped[comp.category] = [];
      }
      grouped[comp.category].push(comp);
    });
    
    res.json({
      success: true,
      competitions: result.rows,
      grouped,
      filters: { type, year: parseInt(year), category }
    });
    
  } catch (error) {
    logger.error('❌ [GET /api/competitions] 에러:', error);
    res.status(500).json({ 
      success: false, 
      error: '대회 목록을 불러올 수 없습니다.' 
    });
  }
});

// ============================================
// GET /api/competitions/:id
// 대회 상세 조회
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await req.app.locals.pool.query(`
      SELECT c.*
      FROM competitions c
      WHERE c.id = $1 AND c.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '대회를 찾을 수 없습니다.' 
      });
    }
    
    res.json({
      success: true,
      competition: result.rows[0]
    });
    
  } catch (error) {
    logger.error(`❌ [GET /api/competitions/${req.params.id}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '대회 정보를 불러올 수 없습니다.' 
    });
  }
});

// ============================================
// POST /api/competitions
// 대회 등록 (관리자만)
// ============================================
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      name, 
      type = '국내경기', 
      category = '트랙 및 필드',
      start_date,
      end_date,
      location,
      description = ''
    } = req.body;
    
    // 유효성 검사
    if (!name || !start_date || !end_date || !location) {
      return res.status(400).json({ 
        success: false, 
        error: '필수 항목을 모두 입력해주세요. (대회명, 시작일, 종료일, 장소)' 
      });
    }
    
    // 유효한 타입인지 확인
    const validTypes = ['국내경기', '국제경기'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효하지 않은 대회 유형입니다.' 
      });
    }
    
    // 유효한 카테고리인지 확인
    const validCategories = ['대한육상연맹사업', '트랙 및 필드', '로드레이스', '단일종목경기'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효하지 않은 카테고리입니다.' 
      });
    }
    
    // 날짜에서 연도, 월 추출
    const startDateObj = new Date(start_date);
    const year = startDateObj.getFullYear();
    const month = startDateObj.getMonth() + 1;
    
    const result = await req.app.locals.pool.query(`
      INSERT INTO competitions (name, type, category, start_date, end_date, year, month, location, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, type, category, start_date, end_date, year, month, location, description, req.user.id]);
    
    logger.info(`✅ 대회 등록: ${name} (${year})`);
    
    res.status(201).json({
      success: true,
      message: '대회가 등록되었습니다.',
      competition: result.rows[0]
    });
    
  } catch (error) {
    logger.error('❌ [POST /api/competitions] 에러:', error);
    res.status(500).json({ 
      success: false, 
      error: '대회 등록에 실패했습니다.' 
    });
  }
});

// ============================================
// PUT /api/competitions/:id
// 대회 수정 (관리자만)
// ============================================
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      type, 
      category,
      start_date,
      end_date,
      location,
      description
    } = req.body;
    
    // 대회 존재 확인
    const existing = await req.app.locals.pool.query(
      'SELECT id FROM competitions WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '대회를 찾을 수 없습니다.' 
      });
    }
    
    // 날짜에서 연도, 월 추출
    const startDateObj = new Date(start_date);
    const year = startDateObj.getFullYear();
    const month = startDateObj.getMonth() + 1;
    
    const result = await req.app.locals.pool.query(`
      UPDATE competitions 
      SET name = $1, type = $2, category = $3, start_date = $4, end_date = $5, 
          year = $6, month = $7, location = $8, description = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [name, type, category, start_date, end_date, year, month, location, description, id]);
    
    logger.info(`✅ 대회 수정: ID=${id}`);
    
    res.json({
      success: true,
      message: '대회가 수정되었습니다.',
      competition: result.rows[0]
    });
    
  } catch (error) {
    logger.error(`❌ [PUT /api/competitions/${req.params.id}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '대회 수정에 실패했습니다.' 
    });
  }
});

// ============================================
// DELETE /api/competitions/:id
// 대회 삭제 (관리자만) - Soft Delete
// ============================================
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 대회 존재 확인
    const existing = await req.app.locals.pool.query(
      'SELECT id, name FROM competitions WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '대회를 찾을 수 없습니다.' 
      });
    }
    
    // Soft delete
    await req.app.locals.pool.query(
      'UPDATE competitions SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    
    logger.info(`✅ 대회 삭제: ID=${id}, Name=${existing.rows[0].name}`);
    
    res.json({
      success: true,
      message: '대회가 삭제되었습니다.'
    });
    
  } catch (error) {
    logger.error(`❌ [DELETE /api/competitions/${req.params.id}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '대회 삭제에 실패했습니다.' 
    });
  }
});

module.exports = router;
