/**
 * Poll 라우터 (v4.0.0 - Clean Architecture)
 * 
 * 경로: /api/posts/:postId/poll
 * 
 * 핵심 기능:
 * - 투표 제출/수정 (POST /vote)
 * - 투표 취소 (DELETE /vote)
 * - 결과 조회 (GET /results)
 * 
 * PostgreSQL 함수 활용:
 * - vote_poll(p_post_id, p_user_id, p_option_ids)
 * - get_poll_results(p_post_id)
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // postId를 상위 라우터에서 받음

/**
 * POST /api/posts/:postId/poll/vote
 * 투표 제출/수정
 * 
 * Body:
 * {
 *   "user_id": "uuid",
 *   "option_ids": [1, 2]  // 다중 선택 가능
 * }
 */
router.post('/vote', async (req, res) => {
  try {
    const { postId } = req.params;
    const { user_id, option_ids } = req.body;

    // 입력 검증
    if (!user_id || !option_ids || !Array.isArray(option_ids) || option_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '필수 입력값이 누락되었습니다. (user_id, option_ids 필요)'
      });
    }

    // option_ids 중복 체크
    const uniqueOptions = [...new Set(option_ids)];
    if (uniqueOptions.length !== option_ids.length) {
      return res.status(400).json({
        success: false,
        error: '중복된 선택지는 제출할 수 없습니다.'
      });
    }

    // 게시글 및 Poll 존재 확인
    const postCheck = await req.app.locals.pool.query(
      'SELECT poll FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    const poll = postCheck.rows[0].poll;

    if (!poll) {
      return res.status(404).json({
        success: false,
        error: '이 게시글에는 투표가 없습니다.'
      });
    }

    // 마감 시간 체크
    if (poll.ends_at) {
      const endsAt = new Date(poll.ends_at);
      if (endsAt < new Date()) {
        return res.status(403).json({
          success: false,
          error: '투표가 이미 마감되었습니다.',
          ends_at: poll.ends_at
        });
      }
    }

    // 단일/다중 선택 검증
    if (!poll.allow_multiple && option_ids.length > 1) {
      return res.status(400).json({
        success: false,
        error: '이 투표는 단일 선택만 가능합니다.'
      });
    }

    // 선택지 ID 유효성 검증
    const validOptionIds = poll.options.map(opt => opt.id);
    const invalidOptions = option_ids.filter(id => !validOptionIds.includes(id));
    
    if (invalidOptions.length > 0) {
      return res.status(400).json({
        success: false,
        error: `유효하지 않은 선택지 ID: ${invalidOptions.join(', ')}`
      });
    }

    // PostgreSQL 함수 호출: vote_poll()
    const result = await req.app.locals.pool.query(
      'SELECT vote_poll($1, $2, $3) as updated_poll',
      [postId, user_id, option_ids]
    );

    const updatedPoll = result.rows[0].updated_poll;

    console.log(`✅ 투표 처리: postId=${postId}, userId=${user_id}, options=${option_ids}`);

    res.json({
      success: true,
      poll: updatedPoll,
      message: '투표가 성공적으로 제출되었습니다.'
    });

  } catch (error) {
    console.error('❌ [POST /api/posts/:postId/poll/vote] 에러:', error);
    
    // PostgreSQL 제약 조건 에러 처리
    if (error.code === '23505') { // UNIQUE violation
      return res.status(409).json({
        success: false,
        error: '이미 투표하셨습니다. 투표를 수정하려면 다시 시도해주세요.'
      });
    }

    res.status(500).json({
      success: false,
      error: '투표 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * DELETE /api/posts/:postId/poll/vote
 * 투표 취소
 * 
 * Body:
 * {
 *   "user_id": "uuid"
 * }
 */
router.delete('/vote', async (req, res) => {
  const client = await req.app.locals.pool.connect();

  try {
    const { postId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id가 필요합니다.'
      });
    }

    await client.query('BEGIN');

    // 게시글 및 Poll 존재 확인
    const postCheck = await client.query(
      'SELECT poll FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );

    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    const poll = postCheck.rows[0].poll;

    if (!poll) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: '이 게시글에는 투표가 없습니다.'
      });
    }

    // 마감 시간 체크
    if (poll.ends_at) {
      const endsAt = new Date(poll.ends_at);
      if (endsAt < new Date()) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: '마감된 투표는 취소할 수 없습니다.'
        });
      }
    }

    // 기존 투표 확인
    const voteCheck = await client.query(
      'SELECT option_ids FROM poll_votes WHERE post_id = $1 AND user_id = $2',
      [postId, user_id]
    );

    if (voteCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: '투표 기록을 찾을 수 없습니다.'
      });
    }

    const oldOptionIds = voteCheck.rows[0].option_ids;

    // 투표 기록 삭제
    await client.query(
      'DELETE FROM poll_votes WHERE post_id = $1 AND user_id = $2',
      [postId, user_id]
    );

    // Poll 데이터 업데이트 (투표수 감소)
    const updatedOptions = poll.options.map(option => {
      if (oldOptionIds.includes(option.id)) {
        return {
          ...option,
          votes: Math.max(0, option.votes - 1) // 음수 방지
        };
      }
      return option;
    });

    const updatedPoll = {
      ...poll,
      options: updatedOptions,
      total_votes: Math.max(0, poll.total_votes - 1)
    };

    await client.query(
      'UPDATE posts SET poll = $1 WHERE id = $2',
      [JSON.stringify(updatedPoll), postId]
    );

    await client.query('COMMIT');

    console.log(`✅ 투표 취소: postId=${postId}, userId=${user_id}`);

    res.json({
      success: true,
      poll: updatedPoll,
      message: '투표가 취소되었습니다.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [DELETE /api/posts/:postId/poll/vote] 에러:', error);
    res.status(500).json({
      success: false,
      error: '투표 취소 중 오류가 발생했습니다.'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/posts/:postId/poll/results
 * 투표 결과 조회
 * 
 * Response:
 * {
 *   "success": true,
 *   "results": [
 *     {
 *       "option_id": 1,
 *       "option_text": "선택지 1",
 *       "votes": 42,
 *       "percentage": 35.00
 *     }
 *   ],
 *   "total_votes": 120,
 *   "question": "투표 질문",
 *   "ends_at": "2025-12-31T23:59:59Z"
 * }
 */
router.get('/results', async (req, res) => {
  try {
    const { postId } = req.params;

    // 게시글 및 Poll 존재 확인
    const postCheck = await req.app.locals.pool.query(
      'SELECT poll FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    const poll = postCheck.rows[0].poll;

    if (!poll) {
      return res.status(404).json({
        success: false,
        error: '이 게시글에는 투표가 없습니다.'
      });
    }

    // PostgreSQL 함수 호출: get_poll_results()
    const result = await req.app.locals.pool.query(
      'SELECT * FROM get_poll_results($1)',
      [postId]
    );

    const results = result.rows.map(row => ({
      option_id: row.option_id,
      option_text: row.option_text,
      votes: row.votes,
      percentage: parseFloat(row.percentage)
    }));

    res.json({
      success: true,
      results,
      total_votes: poll.total_votes,
      question: poll.question,
      allow_multiple: poll.allow_multiple,
      ends_at: poll.ends_at,
      is_ended: poll.ends_at ? new Date(poll.ends_at) < new Date() : false
    });

  } catch (error) {
    console.error('❌ [GET /api/posts/:postId/poll/results] 에러:', error);
    res.status(500).json({
      success: false,
      error: '투표 결과 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/posts/:postId/poll
 * Poll 메타 정보 조회 (선택적 구현)
 */
router.get('/', async (req, res) => {
  try {
    const { postId } = req.params;

    const result = await req.app.locals.pool.query(
      'SELECT poll FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    const poll = result.rows[0].poll;

    if (!poll) {
      return res.status(404).json({
        success: false,
        error: '이 게시글에는 투표가 없습니다.'
      });
    }

    res.json({
      success: true,
      poll
    });

  } catch (error) {
    console.error('❌ [GET /api/posts/:postId/poll] 에러:', error);
    res.status(500).json({
      success: false,
      error: 'Poll 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
