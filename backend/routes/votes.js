/**
 * 투표 라우터 (v4.0.0 - Clean Architecture)
 * 
 * 핵심 기능:
 * - 좋아요/싫어요 투표
 * - 투표 변경 지원
 * - 중복 투표 방지
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { broadcastToClients } = require('../utils/websocket');

/**
 * POST /api/posts/:postId/vote
 * 투표 (좋아요/싫어요)
 * 
 * Body:
 * - type: 'like' | 'dislike'
 * - anonymousId: string
 */
router.post('/', async (req, res) => {
  const client = await req.app.locals.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { postId } = req.params;
    const { 
      type, 
      anonymousId = `anon_${Date.now()}`
    } = req.body;
    
    // 유효성 검사
    if (!type || !['like', 'dislike'].includes(type)) {
      throw new Error('유효하지 않은 투표 타입입니다.');
    }
    
    // 사용자 확인/생성
    let userResult = await client.query(
      'SELECT id FROM users WHERE anonymous_id = $1',
      [anonymousId]
    );
    
    if (userResult.rows.length === 0) {
      userResult = await client.query(
        'INSERT INTO users (anonymous_id, username) VALUES ($1, $2) RETURNING id',
        [anonymousId, 'Anonymous']
      );
    }
    
    const userId = userResult.rows[0].id;
    
    // 기존 투표 확인
    const existingVote = await client.query(
      'SELECT vote_type FROM votes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );
    
    if (existingVote.rows.length > 0) {
      const oldType = existingVote.rows[0].vote_type;
      
      // 같은 타입이면 투표 취소
      if (oldType === type) {
        await client.query(
          'DELETE FROM votes WHERE post_id = $1 AND user_id = $2',
          [postId, userId]
        );
        
        // 카운터 감소
        const field = type === 'like' ? 'likes_count' : 'dislikes_count';
        await client.query(
          `UPDATE posts SET ${field} = GREATEST(${field} - 1, 0) WHERE id = $1`,
          [postId]
        );
        
        console.log(`✅ 투표 취소: PostID=${postId}, Type=${type}`);
      } else {
        // 다른 타입으로 변경
        await client.query(
          'UPDATE votes SET vote_type = $1 WHERE post_id = $2 AND user_id = $3',
          [type, postId, userId]
        );
        
        // 카운터 업데이트 (기존 타입 -1, 새 타입 +1)
        const oldField = oldType === 'like' ? 'likes_count' : 'dislikes_count';
        const newField = type === 'like' ? 'likes_count' : 'dislikes_count';
        await client.query(
          `UPDATE posts 
           SET ${oldField} = GREATEST(${oldField} - 1, 0),
               ${newField} = ${newField} + 1
           WHERE id = $1`,
          [postId]
        );
        
        console.log(`✅ 투표 변경: PostID=${postId}, ${oldType} → ${type}`);
      }
    } else {
      // 새 투표
      await client.query(
        'INSERT INTO votes (post_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [postId, userId, type]
      );
      
      // 카운터 증가
      const field = type === 'like' ? 'likes_count' : 'dislikes_count';
      await client.query(
        `UPDATE posts SET ${field} = ${field} + 1 WHERE id = $1`,
        [postId]
      );
      
      console.log(`✅ 신규 투표: PostID=${postId}, Type=${type}`);
    }
    
    await client.query('COMMIT');
    
    // 전체 게시글 정보 조회 (최신 카운트 포함)
    const postResult = await client.query(`
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
    
    // 현재 사용자의 투표 상태 조회
    const myVoteResult = await req.app.locals.pool.query(
      'SELECT vote_type FROM votes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );
    const myVote = myVoteResult.rows.length > 0 ? myVoteResult.rows[0].vote_type : null;
    
    // WebSocket 알림
    broadcastToClients({
      type: 'vote',
      postId,
      voteType: type
    });
    
    res.json({
      success: true,
      post: {
        ...post,
        images: Array.isArray(post.images) ? post.images : [],
        comments: Array.isArray(post.comments) ? post.comments : [],
        myVote, // 현재 사용자의 투표 상태 ('like', 'dislike', null)
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ [POST /api/posts/${req.params.postId}/vote] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '투표에 실패했습니다.' 
    });
  } finally {
    client.release();
  }
});

module.exports = router;
