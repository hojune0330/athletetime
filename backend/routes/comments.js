/**
 * 댓글 라우터 (v4.0.0 - Clean Architecture)
 * 
 * 핵심 기능:
 * - 댓글 작성
 * - 댓글 삭제 (향후 구현)
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { broadcastToClients } = require('../utils/websocket');

/**
 * POST /api/posts/:postId/comments
 * 댓글 작성
 * 
 * Body: 
 * - content: string
 * - author: string
 * - instagram: string (optional)
 * - anonymousId: string
 */
router.post('/', async (req, res) => {
  try {
    const { postId } = req.params;
    const { 
      content, 
      author, 
      instagram,
      anonymousId = `anon_${Date.now()}`
    } = req.body;
    
    // 유효성 검사
    if (!content || !author) {
      return res.status(400).json({ 
        success: false, 
        error: '내용과 작성자명을 입력해주세요.' 
      });
    }
    
    if (content.length > 1000) {
      return res.status(400).json({ 
        success: false, 
        error: '댓글은 1000자 이내로 입력해주세요.' 
      });
    }
    
    // 사용자 확인/생성
    let userResult = await req.app.locals.pool.query(
      'SELECT id FROM users WHERE anonymous_id = $1',
      [anonymousId]
    );
    
    if (userResult.rows.length === 0) {
      userResult = await req.app.locals.pool.query(
        'INSERT INTO users (anonymous_id, username) VALUES ($1, $2) RETURNING id',
        [anonymousId, author]
      );
    }
    
    const userId = userResult.rows[0].id;
    
    // 댓글 작성
    await req.app.locals.pool.query(`
      INSERT INTO comments (
        post_id, 
        user_id, 
        content, 
        author, 
        instagram
      ) 
      VALUES ($1, $2, $3, $4, $5)
    `, [postId, userId, content, author, instagram || null]);
    
    // 게시글 댓글 수 증가
    await req.app.locals.pool.query(
      'UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1',
      [postId]
    );
    
    // 전체 게시글 정보 조회 (댓글 포함)
    const postResult = await req.app.locals.pool.query(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.author,
        p.instagram,
        p.views,
        p.likes_count,
        p.dislikes_count,
        p.comments_count,
        p.is_notice,
        p.is_pinned,
        p.is_blinded,
        p.created_at,
        p.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        u.id as user_id,
        u.username,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', i.id,
              'cloudinary_url', i.cloudinary_url,
              'thumbnail_url', i.thumbnail_url,
              'width', i.width,
              'height', i.height
            ) ORDER BY i.sort_order
          )
          FROM images i 
          WHERE i.post_id = p.id),
          '[]'::json
        ) as images,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', cm.id,
              'content', cm.content,
              'author', cm.author,
              'instagram', cm.instagram,
              'created_at', cm.created_at,
              'is_blinded', cm.is_blinded
            ) ORDER BY cm.created_at ASC
          )
          FROM comments cm 
          WHERE cm.post_id = p.id 
            AND cm.deleted_at IS NULL),
          '[]'::json
        ) as comments
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 
        AND p.deleted_at IS NULL
    `, [postId]);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '게시글을 찾을 수 없습니다.' 
      });
    }
    
    const post = postResult.rows[0];
    
    // WebSocket 알림
    broadcastToClients({
      type: 'new_comment',
      postId,
      comment: { author, content }
    });
    
    console.log(`✅ 댓글 작성 완료: PostID=${postId}, 작성자="${author}"`);
    
    res.json({
      success: true,
      post: {
        ...post,
        images: Array.isArray(post.images) ? post.images : [],
        comments: Array.isArray(post.comments) ? post.comments : []
      }
    });
    
  } catch (error) {
    console.error(`❌ [POST /api/posts/${req.params.postId}/comments] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 작성에 실패했습니다.' 
    });
  }
});

module.exports = router;
