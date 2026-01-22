/**
 * 중고거래 API 라우트
 * /api/marketplace
 */

const express = require('express');
const router = express.Router();
const { optionalAuth, authenticateToken } = require('../middleware/auth');

// ============================================
// GET /api/marketplace
// 상품 목록 조회 (필터, 검색, 정렬, 페이지네이션)
// ============================================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      sort = 'latest', // latest, price_low, price_high, views
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 기본 쿼리
    let query = `
      SELECT 
        mi.*,
        u.nickname as seller_nickname,
        u.profile_image_url as seller_profile_image,
        (SELECT COUNT(*) FROM marketplace_comments WHERE item_id = mi.id AND deleted_at IS NULL) as comment_count
      FROM marketplace_items mi
      LEFT JOIN users u ON mi.seller_id = u.id
      WHERE mi.deleted_at IS NULL
    `;
    
    const params = [];
    let paramIndex = 1;

    // 검색 필터
    if (search) {
      query += ` AND mi.title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // 상태 필터
    if (status) {
      query += ` AND mi.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // 정렬
    switch (sort) {
      case 'price_low':
        query += ' ORDER BY mi.price ASC, mi.created_at DESC';
        break;
      case 'price_high':
        query += ' ORDER BY mi.price DESC, mi.created_at DESC';
        break;
      case 'views':
        query += ' ORDER BY mi.view_count DESC, mi.created_at DESC';
        break;
      case 'latest':
      default:
        query += ' ORDER BY mi.created_at DESC';
    }

    // 페이지네이션
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await req.app.locals.pool.query(query, params);

    // 전체 개수 조회
    let countQuery = `
      SELECT COUNT(*) 
      FROM marketplace_items mi 
      WHERE mi.deleted_at IS NULL
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND mi.title ILIKE $${countParamIndex}`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND mi.status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await req.app.locals.pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      items: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ 상품 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '상품 목록을 불러올 수 없습니다.' 
    });
  }
});

// ============================================
// PATCH /api/marketplace/:id/status
// 상품 상태 변경 (본인만 가능)
// ============================================
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 상태값 유효성 검사
    if (!status || !['판매중', '예약중', '판매완료'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: '올바른 상태값이 아닙니다. (판매중, 예약중, 판매완료)'
      });
    }

    // 상품 소유자 확인
    const checkResult = await req.app.locals.pool.query(
      'SELECT seller_id FROM marketplace_items WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '상품을 찾을 수 없습니다.'
      });
    }

    if (checkResult.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '본인의 상품만 상태를 변경할 수 있습니다.'
      });
    }

    // 상태 업데이트
    const result = await req.app.locals.pool.query(
      'UPDATE marketplace_items SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    console.log(`✅ 상품 상태 변경: ${id} → ${status}`);

    res.json({
      success: true,
      message: '상태가 변경되었습니다.',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 상품 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      error: '상태 변경에 실패했습니다.'
    });
  }
});

// ============================================
// GET /api/marketplace/:id
// 상품 상세 조회 (조회수 증가)
// ============================================
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 조회수 증가
    await req.app.locals.pool.query(
      'UPDATE marketplace_items SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    // 상품 정보 조회
    const result = await req.app.locals.pool.query(`
      SELECT 
        mi.*,
        u.nickname as seller_nickname,
        u.profile_image_url as seller_profile_image,
        (SELECT COUNT(*) FROM marketplace_comments WHERE item_id = mi.id AND deleted_at IS NULL) as comment_count
      FROM marketplace_items mi
      LEFT JOIN users u ON mi.seller_id = u.id
      WHERE mi.id = $1 AND mi.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '상품을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 상품 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '상품 정보를 불러올 수 없습니다.'
    });
  }
});

// ============================================
// POST /api/marketplace
// 상품 등록 (로그인 필수)
// ============================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, price, images, thumbnail_index } = req.body;

    // 유효성 검사
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: '상품명을 입력해주세요.'
      });
    }

    if (title.length < 2 || title.length > 100) {
      return res.status(400).json({
        success: false,
        error: '상품명은 2~100자 사이여야 합니다.'
      });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: '가격을 입력해주세요.'
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        error: '가격은 0원 이상이어야 합니다.'
      });
    }

    const result = await req.app.locals.pool.query(`
      INSERT INTO marketplace_items (
        title, description, price, images, thumbnail_index, seller_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      title,
      description || '',
      price,
      JSON.stringify(images || []),
      thumbnail_index || 0,
      req.user.id
    ]);

    console.log(`✅ 상품 등록: ${title} (${req.user.nickname})`);

    res.status(201).json({
      success: true,
      message: '상품이 등록되었습니다.',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 상품 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '상품 등록에 실패했습니다.'
    });
  }
});

// ============================================
// PUT /api/marketplace/:id
// 상품 수정 (본인만 가능)
// ============================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, status, images, thumbnail_index } = req.body;

    // 상품 소유자 확인
    const checkResult = await req.app.locals.pool.query(
      'SELECT seller_id FROM marketplace_items WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '상품을 찾을 수 없습니다.'
      });
    }

    if (checkResult.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '본인의 상품만 수정할 수 있습니다.'
      });
    }

    // 유효성 검사
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          error: '상품명을 입력해주세요.'
        });
      }
      if (title.length < 2 || title.length > 100) {
        return res.status(400).json({
          success: false,
          error: '상품명은 2~100자 사이여야 합니다.'
        });
      }
    }

    if (price !== undefined && price < 0) {
      return res.status(400).json({
        success: false,
        error: '가격은 0원 이상이어야 합니다.'
      });
    }

    if (status && !['판매중', '예약중', '판매완료'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: '올바른 상태값이 아닙니다.'
      });
    }

    // 업데이트
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (price !== undefined) {
      updateFields.push(`price = $${paramIndex}`);
      updateValues.push(price);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }

    if (images !== undefined) {
      updateFields.push(`images = $${paramIndex}`);
      updateValues.push(JSON.stringify(images));
      paramIndex++;
    }

    if (thumbnail_index !== undefined) {
      updateFields.push(`thumbnail_index = $${paramIndex}`);
      updateValues.push(thumbnail_index);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '수정할 내용이 없습니다.'
      });
    }

    updateValues.push(id);
    const result = await req.app.locals.pool.query(`
      UPDATE marketplace_items
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    console.log(`✅ 상품 수정: ${id}`);

    res.json({
      success: true,
      message: '상품이 수정되었습니다.',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 상품 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '상품 수정에 실패했습니다.'
    });
  }
});

// ============================================
// DELETE /api/marketplace/:id
// 상품 삭제 (소프트 삭제, 본인만 가능)
// ============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 상품 소유자 확인
    const checkResult = await req.app.locals.pool.query(
      'SELECT seller_id FROM marketplace_items WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '상품을 찾을 수 없습니다.'
      });
    }

    if (checkResult.rows[0].seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '본인의 상품만 삭제할 수 있습니다.'
      });
    }

    // 소프트 삭제
    await req.app.locals.pool.query(
      'UPDATE marketplace_items SET deleted_at = NOW() WHERE id = $1',
      [id]
    );

    console.log(`✅ 상품 삭제: ${id}`);

    res.json({
      success: true,
      message: '상품이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('❌ 상품 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '상품 삭제에 실패했습니다.'
    });
  }
});

// ============================================
// GET /api/marketplace/:id/comments
// 댓글 목록 조회
// ============================================
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.app.locals.pool.query(`
      SELECT 
        mc.*,
        u.nickname as user_nickname,
        u.profile_image_url as user_profile_image
      FROM marketplace_comments mc
      LEFT JOIN users u ON mc.user_id = u.id
      WHERE mc.item_id = $1 AND mc.deleted_at IS NULL
      ORDER BY mc.created_at ASC
    `, [id]);

    res.json({
      success: true,
      comments: result.rows
    });
  } catch (error) {
    console.error('❌ 댓글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '댓글 목록을 불러올 수 없습니다.'
    });
  }
});

// ============================================
// POST /api/marketplace/:id/comments
// 댓글 작성 (로그인 필수)
// ============================================
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: '댓글 내용을 입력해주세요.'
      });
    }

    const result = await req.app.locals.pool.query(`
      INSERT INTO marketplace_comments (item_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, req.user.id, content]);

    // 댓글 작성자 정보 포함하여 반환
    const commentWithUser = await req.app.locals.pool.query(`
      SELECT 
        mc.*,
        u.nickname as user_nickname,
        u.profile_image_url as user_profile_image
      FROM marketplace_comments mc
      LEFT JOIN users u ON mc.user_id = u.id
      WHERE mc.id = $1
    `, [result.rows[0].id]);

    console.log(`✅ 댓글 작성: 상품 ${id} (${req.user.nickname})`);

    res.status(201).json({
      success: true,
      message: '댓글이 작성되었습니다.',
      comment: commentWithUser.rows[0]
    });
  } catch (error) {
    console.error('❌ 댓글 작성 오류:', error);
    res.status(500).json({
      success: false,
      error: '댓글 작성에 실패했습니다.'
    });
  }
});

// ============================================
// DELETE /api/marketplace/:itemId/comments/:commentId
// 댓글 삭제 (본인만 가능)
// ============================================
router.delete('/:itemId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;

    // 댓글 소유자 확인
    const checkResult = await req.app.locals.pool.query(
      'SELECT user_id FROM marketplace_comments WHERE id = $1 AND deleted_at IS NULL',
      [commentId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '댓글을 찾을 수 없습니다.'
      });
    }

    if (checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '본인의 댓글만 삭제할 수 있습니다.'
      });
    }

    // 소프트 삭제
    await req.app.locals.pool.query(
      'UPDATE marketplace_comments SET deleted_at = NOW() WHERE id = $1',
      [commentId]
    );

    console.log(`✅ 댓글 삭제: ${commentId}`);

    res.json({
      success: true,
      message: '댓글이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('❌ 댓글 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '댓글 삭제에 실패했습니다.'
    });
  }
});

module.exports = router;
