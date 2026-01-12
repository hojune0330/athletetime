/**
 * 이미지 업로드 라우트
 */

const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { authenticateToken } = require('../middleware/auth');

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
router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    // Cloudinary에 업로드
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'marketplace',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    });

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
router.post('/images', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

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

    res.json({ images });
  } catch (error) {
    console.error('❌ 이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
});

module.exports = router;
