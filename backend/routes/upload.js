/**
 * 이미지 업로드 라우트
 */

const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { authenticateToken } = require('../middleware/auth');

console.log('✅ Upload 라우터 로드됨');

/**
 * POST /api/upload/image
 * 이미지 파일 업로드
 * 
 * Body:
 * - image: 이미지 파일 (multipart/form-data)
 * 
 * Response:
 * - url: Cloudinary 이미지 URL
 * - public_id: Cloudinary public_id
 */
router.post('/image', upload.single('image'), authenticateToken, async (req, res) => {
  console.log('📤 /api/upload/image 요청 받음');
  try {
    if (!req.file) {
      console.log('❌ 이미지 파일이 없음');
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    console.log('📁 파일 정보:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Cloudinary에 업로드
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'marketplace',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    });

    console.log('✅ Cloudinary 업로드 성공:', result.secure_url);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('❌ 이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
});

/**
 * POST /api/upload/images
 * 다중 이미지 파일 업로드
 * 
 * Body:
 * - images: 이미지 파일들 (multipart/form-data, 최대 10개)
 * 
 * Response:
 * - images: [{ url, public_id }]
 */
router.post('/images', upload.array('images', 10), authenticateToken, async (req, res) => {
  console.log('📤 /api/upload/images 요청 받음');
  try {
    if (!req.files || req.files.length === 0) {
      console.log('❌ 이미지 파일이 없음');
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    console.log(`📁 ${req.files.length}개 파일 수신:`, req.files.map(f => ({
      filename: f.originalname,
      size: f.size,
      mimetype: f.mimetype
    })));

    // 모든 이미지를 Cloudinary에 병렬 업로드
    const uploadPromises = req.files.map(file => 
      uploadToCloudinary(file.buffer, {
        folder: 'marketplace',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      })
    );

    const results = await Promise.all(uploadPromises);

    const images = results.map(result => ({
      url: result.secure_url,
      public_id: result.public_id,
    }));

    console.log(`✅ ${images.length}개 이미지 Cloudinary 업로드 성공`);

    res.json({ images });
  } catch (error) {
    console.error('❌ 이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
});

module.exports = router;
