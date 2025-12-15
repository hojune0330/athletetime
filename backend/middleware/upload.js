/**
 * Multer 업로드 미들웨어 (v4.0.0)
 * 
 * 이미지 파일 업로드 처리
 */

const multer = require('multer');

/**
 * 이미지 업로드 설정
 * - 메모리 저장소 사용 (Buffer)
 * - 최대 파일 크기: 5MB
 * - 최대 파일 개수: 5개
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다. (JPEG, PNG, GIF, WebP)'));
    }
  }
});

/**
 * 에러 핸들링 미들웨어
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '파일 크기는 5MB 이하만 가능합니다.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: '최대 5개의 파일만 업로드 가능합니다.'
      });
    }
    return res.status(400).json({
      success: false,
      error: `파일 업로드 오류: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  next();
}

module.exports = {
  upload,
  handleUploadError
};
