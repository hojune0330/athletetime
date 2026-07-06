/**
 * 시스템 서비스
 *
 * 서버 상태, 디스크 사용량 등 시스템 정보를 제공합니다.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');

class SystemService {
  constructor() {
    this.startedAt = new Date().toISOString();
  }

  /**
   * 시스템 상태 반환
   */
  getStatus() {
    return {
      status: 'running',
      uptime: process.uptime(),
      startedAt: this.startedAt,
      nodeVersion: process.version,
      platform: os.platform(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      cpu: os.loadavg(),
    };
  }

  /**
   * 데이터 디렉토리 현황
   */
  getDataStatus() {
    const dirs = {
      raw: this._countFiles(config.dirs.raw, '.json'),
      normalized: this._countFiles(config.dirs.normalized, '.json'),
      output: this._countFiles(config.dirs.output, '.png'),
      debug: this._countFiles(config.dirs.debug),
    };

    return dirs;
  }

  /**
   * 전체 시스템 정보
   */
  getInfo() {
    return {
      project: 'athletic-card-news',
      version: this._getVersion(),
      system: this.getStatus(),
      data: this.getDataStatus(),
    };
  }

  /**
   * package.json에서 버전 읽기
   */
  _getVersion() {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(config.dirs.root, 'package.json'), 'utf-8'));
      return pkg.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * 디렉토리 내 파일 수 세기
   */
  _countFiles(dirPath, ext = null) {
    if (!fs.existsSync(dirPath)) return { count: 0, sizeKB: 0 };

    let files = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
    if (ext) files = files.filter(f => f.endsWith(ext));

    let totalSize = 0;
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(dirPath, f));
        totalSize += stat.size;
      } catch { /* 무시 */ }
    }

    return {
      count: files.length,
      sizeKB: Math.round(totalSize / 1024),
    };
  }
}

module.exports = new SystemService();
