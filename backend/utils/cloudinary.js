/**
 * Cloudinary 유틸리티 (v4.0.0)
 * 
 * 이미지 업로드 헬퍼 함수
 */

const cloudinary = require('cloudinary').v2;

// 분리형 환경변수 지원 (레거시 Render 설정 호환)
// - CLOUDINARY_URL 하나짜리 형태는 라이브러리가 자동 인식
// - CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET 3개 분리형은 명시 설정 필요
if (
  !process.env.CLOUDINARY_URL &&
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Cloudinary 설정 확인
 */
function isCloudinaryConfigured() {
  const config = cloudinary.config();
  return !!(config.cloud_name && config.api_key && config.api_secret);
}

/**
 * Buffer를 Cloudinary에 업로드
 * 
 * @param {Buffer} buffer - 이미지 버퍼
 * @param {Object} options - Cloudinary 업로드 옵션
 * @returns {Promise<Object>} - Cloudinary 업로드 결과
 */
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary 업로드 실패:', error);
          reject(error);
        } else {
          console.log(`✅ Cloudinary 업로드 성공: ${result.public_id}`);
          resolve(result);
        }
      }
    );
    
    uploadStream.end(buffer);
  });
}

/**
 * Cloudinary 이미지 삭제
 * 
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<Object>} - 삭제 결과
 */
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Cloudinary 이미지 삭제: ${publicId}`);
    return result;
  } catch (error) {
    console.error(`❌ Cloudinary 이미지 삭제 실패: ${publicId}`, error);
    throw error;
  }
}

/**
 * 썸네일 URL 생성
 * 
 * @param {string} url - 원본 이미지 URL
 * @param {number} width - 썸네일 너비
 * @param {number} height - 썸네일 높이
 * @returns {string} - 썸네일 URL
 */
function getThumbnailUrl(url, width = 400, height = 400) {
  return url.replace(
    '/upload/',
    `/upload/w_${width},h_${height},c_fill/`
  );
}

module.exports = {
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
  getThumbnailUrl
};
