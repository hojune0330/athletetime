/**
 * 🏅 경기 결과 관리 API
 * 
 * GET    /api/match-results/competition/:competitionId  - 대회별 경기 결과 목록
 * GET    /api/match-results/:id                          - 경기 결과 상세
 * POST   /api/match-results                              - 경기 결과 등록 (관리자)
 * PUT    /api/match-results/:id                          - 경기 결과 수정 (관리자)
 * DELETE /api/match-results/:id                          - 경기 결과 삭제 (관리자)
 */

const express = require('express');
const router = express.Router();
const { optionalAuth, requireAdmin } = require('../middleware/auth');

// ============================================
// GET /api/match-results/competition/:competitionId
// 대회별 경기 결과 목록
// ============================================
router.get('/competition/:competitionId', async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { event, division, round } = req.query;
    
    // 대회 정보 조회
    const competitionResult = await req.app.locals.pool.query(`
      SELECT * FROM competitions WHERE id = $1 AND deleted_at IS NULL
    `, [competitionId]);
    
    if (competitionResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '대회를 찾을 수 없습니다.' 
      });
    }
    
    // 경기 결과 목록 조회
    let query = `
      SELECT 
        mr.id,
        mr.competition_id,
        mr.event,
        mr.division,
        mr.round,
        mr.event_date,
        mr.notes,
        mr.created_at,
        jsonb_array_length(mr.results) as athletes_count
      FROM match_results mr
      WHERE mr.competition_id = $1 AND mr.deleted_at IS NULL
    `;
    const params = [competitionId];
    let paramIndex = 2;
    
    // 종목 필터
    if (event) {
      query += ` AND mr.event = $${paramIndex}`;
      params.push(event);
      paramIndex++;
    }
    
    // 종별 필터
    if (division) {
      query += ` AND mr.division = $${paramIndex}`;
      params.push(division);
      paramIndex++;
    }
    
    // 라운드 필터
    if (round) {
      query += ` AND mr.round = $${paramIndex}`;
      params.push(round);
      paramIndex++;
    }
    
    query += ` ORDER BY mr.event ASC, mr.division ASC, 
      CASE mr.round 
        WHEN '예선' THEN 1 
        WHEN '준결승' THEN 2 
        WHEN '결승' THEN 3 
        ELSE 4 
      END ASC`;
    
    const resultsResult = await req.app.locals.pool.query(query, params);
    
    // 필터용 고유값 조회
    const filtersResult = await req.app.locals.pool.query(`
      SELECT 
        ARRAY_AGG(DISTINCT event) as events,
        ARRAY_AGG(DISTINCT division) as divisions,
        ARRAY_AGG(DISTINCT round) as rounds
      FROM match_results
      WHERE competition_id = $1 AND deleted_at IS NULL
    `, [competitionId]);
    
    res.json({
      success: true,
      competition: competitionResult.rows[0],
      results: resultsResult.rows,
      filters: {
        events: filtersResult.rows[0]?.events || [],
        divisions: filtersResult.rows[0]?.divisions || [],
        rounds: filtersResult.rows[0]?.rounds || []
      }
    });
    
  } catch (error) {
    console.error(`❌ [GET /api/match-results/competition/${req.params.competitionId}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '경기 결과 목록을 불러올 수 없습니다.' 
    });
  }
});

// ============================================
// GET /api/match-results/:id
// 경기 결과 상세
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await req.app.locals.pool.query(`
      SELECT 
        mr.*,
        c.name as competition_name,
        c.start_date as competition_start_date,
        c.end_date as competition_end_date,
        c.location as competition_location
      FROM match_results mr
      JOIN competitions c ON mr.competition_id = c.id
      WHERE mr.id = $1 AND mr.deleted_at IS NULL
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '경기 결과를 찾을 수 없습니다.' 
      });
    }
    
    res.json({
      success: true,
      matchResult: result.rows[0]
    });
    
  } catch (error) {
    console.error(`❌ [GET /api/match-results/${req.params.id}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '경기 결과를 불러올 수 없습니다.' 
    });
  }
});

// ============================================
// POST /api/match-results
// 경기 결과 등록 (관리자만)
// ============================================
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { 
      competition_id,
      event,
      division,
      round,
      results = [],
      event_date,
      notes = ''
    } = req.body;
    
    // 유효성 검사
    if (!competition_id || !event || !division || !round) {
      return res.status(400).json({ 
        success: false, 
        error: '필수 항목을 모두 입력해주세요. (대회, 종목, 종별, 라운드)' 
      });
    }
    
    // 대회 존재 확인
    const competitionCheck = await req.app.locals.pool.query(
      'SELECT id FROM competitions WHERE id = $1 AND deleted_at IS NULL',
      [competition_id]
    );
    
    if (competitionCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '대회를 찾을 수 없습니다.' 
      });
    }
    
    const result = await req.app.locals.pool.query(`
      INSERT INTO match_results (competition_id, event, division, round, results, event_date, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [competition_id, event, division, round, JSON.stringify(results), event_date || null, notes, req.user.id]);
    
    console.log(`✅ 경기 결과 등록: ${event} ${division} ${round}`);
    
    res.status(201).json({
      success: true,
      message: '경기 결과가 등록되었습니다.',
      matchResult: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ [POST /api/match-results] 에러:', error);
    res.status(500).json({ 
      success: false, 
      error: '경기 결과 등록에 실패했습니다.' 
    });
  }
});

// ============================================
// PUT /api/match-results/:id
// 경기 결과 수정 (관리자만)
// ============================================
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      event,
      division,
      round,
      results,
      event_date,
      notes
    } = req.body;
    
    // 존재 확인
    const existing = await req.app.locals.pool.query(
      'SELECT id FROM match_results WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '경기 결과를 찾을 수 없습니다.' 
      });
    }
    
    const result = await req.app.locals.pool.query(`
      UPDATE match_results 
      SET event = $1, division = $2, round = $3, results = $4, 
          event_date = $5, notes = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [event, division, round, JSON.stringify(results), event_date || null, notes, id]);
    
    console.log(`✅ 경기 결과 수정: ID=${id}`);
    
    res.json({
      success: true,
      message: '경기 결과가 수정되었습니다.',
      matchResult: result.rows[0]
    });
    
  } catch (error) {
    console.error(`❌ [PUT /api/match-results/${req.params.id}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '경기 결과 수정에 실패했습니다.' 
    });
  }
});

// ============================================
// DELETE /api/match-results/:id
// 경기 결과 삭제 (관리자만) - Soft Delete
// ============================================
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 존재 확인
    const existing = await req.app.locals.pool.query(
      'SELECT id, event, division, round FROM match_results WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '경기 결과를 찾을 수 없습니다.' 
      });
    }
    
    // Soft delete
    await req.app.locals.pool.query(
      'UPDATE match_results SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    
    const { event, division, round } = existing.rows[0];
    console.log(`✅ 경기 결과 삭제: ID=${id}, ${event} ${division} ${round}`);
    
    res.json({
      success: true,
      message: '경기 결과가 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error(`❌ [DELETE /api/match-results/${req.params.id}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '경기 결과 삭제에 실패했습니다.' 
    });
  }
});

module.exports = router;
