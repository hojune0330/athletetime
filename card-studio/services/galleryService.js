/**
 * 갤러리 서비스
 *
 * output/ 디렉토리의 카드뉴스 이미지를 관리합니다.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

class GalleryService {
  /**
   * 생성된 카드뉴스 이미지 목록 반환
   *
   * @param {Object} [options]
   * @param {number} [options.limit=50] - 최대 개수
   * @param {number} [options.offset=0] - 시작 위치
   * @param {string} [options.sort='newest'] - 정렬 (newest, oldest, name)
   * @returns {{ images: Object[], total: number }}
   */
  getImages(options = {}) {
    const { limit = 50, offset = 0, sort = 'newest' } = options;
    const outputDir = config.dirs.output;

    if (!fs.existsSync(outputDir)) {
      return { images: [], total: 0 };
    }

    let files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
      .map(f => {
        const filePath = path.join(outputDir, f);
        const stat = fs.statSync(filePath);
        return {
          filename: f,
          path: `/output/${f}`,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
        };
      });

    // 정렬
    switch (sort) {
      case 'oldest':
        files.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'name':
        files.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case 'newest':
      default:
        files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    const total = files.length;
    const images = files.slice(offset, offset + limit);

    return { images, total };
  }

  /**
   * 단일 이미지 상세 정보
   */
  getImage(filename) {
    const filePath = path.join(config.dirs.output, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stat = fs.statSync(filePath);
    return {
      filename,
      path: `/output/${filename}`,
      size: stat.size,
      createdAt: stat.birthtime.toISOString(),
      modifiedAt: stat.mtime.toISOString(),
    };
  }

  /**
   * 이미지 삭제
   */
  deleteImage(filename) {
    const filePath = path.join(config.dirs.output, filename);
    if (!fs.existsSync(filePath)) {
      return false;
    }
    fs.unlinkSync(filePath);
    return true;
  }

  /**
   * 통계 정보
   */
  getStats() {
    const outputDir = config.dirs.output;
    if (!fs.existsSync(outputDir)) {
      return { totalImages: 0, totalSize: 0 };
    }

    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

    let totalSize = 0;
    for (const f of files) {
      const stat = fs.statSync(path.join(outputDir, f));
      totalSize += stat.size;
    }

    return {
      totalImages: files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  }
}

module.exports = new GalleryService();
