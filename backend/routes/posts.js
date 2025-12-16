/**
 * 게시글 라우터 (v4.0.0 - Clean Architecture)
 * 
 * 핵심 기능:
 * - 게시글 목록 조회 (페이지네이션, 카테고리 필터)
 * - 게시글 상세 조회 (조회수 자동 증가)
 * - 게시글 작성 (Cloudinary 이미지 업로드)
 * - 게시글 수정
 * - 게시글 삭제 (비밀번호 검증)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { broadcastToClients } = require('../utils/websocket');

/**
 * GET /api/posts
 * 게시글 목록 조회
 */
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      limit = 20, 
      offset = 0,
      page = 1
    } = req.query;
    
    const actualLimit = parseInt(limit);
    const actualPage = parseInt(page);
    const actualOffset = (actualPage - 1) * actualLimit;
    
    // 기본 쿼리 (password_hash 제외, comments 배열 포함)
    // '자유' 카테고리는 null로 반환 (프론트에서 뱃지 표시 안함)
    let query = `
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
        CASE WHEN c.name = '자유' THEN NULL ELSE c.name END as category_name,
        CASE WHEN c.name = '자유' THEN NULL ELSE c.icon END as category_icon,
        CASE WHEN c.name = '자유' THEN NULL ELSE c.color END as category_color,
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
      WHERE p.deleted_at IS NULL 
        AND p.is_blinded = FALSE
    `;
    
    const params = [];
    
    // 카테고리 필터
    if (category) {
      params.push(category);
      query += ` AND c.name = $${params.length}`;
    }
    
    // 정렬 및 페이지네이션
    // 고정글(is_pinned) 또는 공지글(is_notice)을 상단에 표시하고, 그 안에서 최신순 정렬
    query += ` 
      ORDER BY 
        (CASE WHEN p.is_pinned OR p.is_notice THEN 1 ELSE 0 END) DESC,
        p.created_at DESC 
      LIMIT $${params.length + 1} 
      OFFSET $${params.length + 2}
    `;
    params.push(actualLimit, actualOffset);
    
    // 전체 개수 조회
    let countQuery = `
      SELECT COUNT(*) as total
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL 
        AND p.is_blinded = FALSE
    `;
    const countParams = [];
    if (category) {
      countParams.push(category);
      countQuery += ` AND c.name = $${countParams.length}`;
    }
    
    // 실행
    const [postsResult, countResult] = await Promise.all([
      req.app.locals.pool.query(query, params),
      req.app.locals.pool.query(countQuery, countParams)
    ]);
    
    res.json({
      success: true,
      posts: postsResult.rows.map(row => ({
        ...row,
        images: Array.isArray(row.images) ? row.images : [],
        comments: Array.isArray(row.comments) ? row.comments : []
      })),
      count: parseInt(countResult.rows[0].total),
      page: actualPage,
      limit: actualLimit
    });
    
  } catch (error) {
    console.error('❌ [GET /api/posts] 에러:', error);
    res.status(500).json({ 
      success: false, 
      error: '게시글 목록을 불러올 수 없습니다.' 
    });
  }
});

/**
 * GET /api/posts/:id
 * 게시글 상세 조회 (조회수 자동 증가)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 조회수 증가
    await req.app.locals.pool.query(
      'UPDATE posts SET views = views + 1 WHERE id = $1',
      [id]
    );
    
    // 게시글 상세 조회 (이미지, 댓글 포함)
    // '자유' 카테고리는 null로 반환
    const result = await req.app.locals.pool.query(`
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
        CASE WHEN c.name = '자유' THEN NULL ELSE c.name END as category_name,
        CASE WHEN c.name = '자유' THEN NULL ELSE c.icon END as category_icon,
        CASE WHEN c.name = '자유' THEN NULL ELSE c.color END as category_color,
        u.id as user_id,
        u.username,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', i.id,
              'cloudinary_id', i.cloudinary_id,
              'cloudinary_url', i.cloudinary_url,
              'thumbnail_url', i.thumbnail_url,
              'width', i.width,
              'height', i.height,
              'format', i.format,
              'sort_order', i.sort_order
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
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '게시글을 찾을 수 없습니다.' 
      });
    }
    
    const post = result.rows[0];
    
    res.json({
      success: true,
      post: {
        ...post,
        images: Array.isArray(post.images) ? post.images : [],
        comments: Array.isArray(post.comments) ? post.comments : []
      }
    });
    
  } catch (error) {
    console.error(`❌ [GET /api/posts/${req.params.id}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '게시글을 불러올 수 없습니다.' 
    });
  }
});

/**
 * POST /api/posts
 * 게시글 작성 (이미지 업로드 포함)
 * 
 * multipart/form-data:
 * - title: string
 * - content: string
 * - author: string
 * - password: string
 * - category: string (카테고리명)
 * - instagram: string (optional)
 * - anonymousId: string
 * - images: File[] (최대 5개)
 */
router.post('/', async (req, res) => {
  const client = await req.app.locals.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      title, 
      content, 
      author, 
      password, 
      category = '자유', 
      instagram,
      anonymousId = `anon_${Date.now()}`
    } = req.body;
    
    // 유효성 검사
    if (!title || !content || !author || !password) {
      throw new Error('필수 필드가 누락되었습니다.');
    }
    
    if (title.length > 200) {
      throw new Error('제목은 200자 이내로 입력해주세요.');
    }
    
    if (content.length > 10000) {
      throw new Error('내용은 10000자 이내로 입력해주세요.');
    }
    
    if (password.length < 4) {
      throw new Error('비밀번호는 4자 이상 입력해주세요.');
    }
    
    // 사용자 확인/생성
    let userResult = await client.query(
      'SELECT id FROM users WHERE anonymous_id = $1',
      [anonymousId]
    );
    
    if (userResult.rows.length === 0) {
      userResult = await client.query(
        'INSERT INTO users (anonymous_id, username) VALUES ($1, $2) RETURNING id',
        [anonymousId, author]
      );
    }
    
    const userId = userResult.rows[0].id;
    
    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 카테고리 조회
    const categoryResult = await client.query(
      'SELECT id FROM categories WHERE name = $1',
      [category]
    );
    
    if (categoryResult.rows.length === 0) {
      throw new Error('유효하지 않은 카테고리입니다.');
    }
    
    const categoryId = categoryResult.rows[0].id;
    
    // 게시글 생성
    const postResult = await client.query(`
      INSERT INTO posts (
        category_id, 
        user_id, 
        title, 
        content, 
        author, 
        password_hash, 
        instagram
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [categoryId, userId, title, content, author, passwordHash, instagram || null]);
    
    const post = postResult.rows[0];
    
    // 이미지 업로드 (Cloudinary)
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.slice(0, 5).map(async (file, index) => {
        const cloudinaryResult = await uploadToCloudinary(file.buffer, {
          folder: 'athlete-time/posts',
          transformation: [
            { width: 1920, height: 1920, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        });
        
        await client.query(`
          INSERT INTO images (
            post_id, 
            cloudinary_id, 
            cloudinary_url, 
            thumbnail_url,
            original_filename, 
            file_size, 
            width, 
            height, 
            format, 
            sort_order
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          post.id,
          cloudinaryResult.public_id,
          cloudinaryResult.secure_url,
          cloudinaryResult.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill/'),
          file.originalname,
          cloudinaryResult.bytes,
          cloudinaryResult.width,
          cloudinaryResult.height,
          cloudinaryResult.format,
          index
        ]);
      });
      
      await Promise.all(uploadPromises);
    }
    
    await client.query('COMMIT');
    
    // WebSocket 알림
    broadcastToClients({
      type: 'new_post',
      post: {
        id: post.id,
        title: post.title,
        author: post.author
      }
    });
    
    console.log(`✅ 게시글 작성 완료: ID=${post.id}, 제목="${title}"`);
    
    res.status(201).json({
      success: true,
      post,
      message: '게시글이 작성되었습니다.'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [POST /api/posts] 에러:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '게시글 작성에 실패했습니다.' 
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/posts/:id
 * 게시글 삭제 (비밀번호 검증)
 * 
 * Body: { password: string }
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // 비밀번호 필수 체크
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '비밀번호를 입력해주세요.' 
      });
    }
    
    // 게시글 조회
    const result = await req.app.locals.pool.query(
      'SELECT password_hash FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '게시글을 찾을 수 없습니다.' 
      });
    }
    
    // password_hash 존재 여부 확인 (방어 로직)
    if (!result.rows[0].password_hash) {
      return res.status(500).json({ 
        success: false, 
        error: '게시글 비밀번호 정보가 없습니다.' 
      });
    }
    
    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, result.rows[0].password_hash);
    
    if (!isValid) {
      return res.status(403).json({ 
        success: false, 
        error: '비밀번호가 일치하지 않습니다.' 
      });
    }
    
    // Soft delete
    await req.app.locals.pool.query(
      'UPDATE posts SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    
    console.log(`✅ 게시글 삭제 완료: ID=${id}`);
    
    res.json({
      success: true,
      message: '게시글이 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error(`❌ [DELETE /api/posts/${req.params.id}] 에러:`, error);
    res.status(500).json({ 
      success: false, 
      error: '게시글 삭제에 실패했습니다.' 
    });
  }
});

module.exports = router;
