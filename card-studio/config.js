/**
 * 프로젝트 설정 (한 곳에서 관리)
 *
 * 모든 경로, URL, 기본값을 여기서 관리합니다.
 * 다른 모듈은 이 파일만 import하면 됩니다.
 */

const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

const config = {
  // ============================================
  // 디렉토리 경로
  // ============================================
  dirs: {
    root: ROOT_DIR,
    src: path.join(ROOT_DIR, 'src'),
    data: path.join(ROOT_DIR, 'data'),
    raw: path.join(ROOT_DIR, 'data', 'raw'),
    normalized: path.join(ROOT_DIR, 'data', 'normalized'),
    debug: path.join(ROOT_DIR, 'data', 'debug'),
    output: path.join(ROOT_DIR, 'output'),
    templates: path.join(ROOT_DIR, 'templates'),
    tools: path.join(ROOT_DIR, 'tools'),
  },

  // ============================================
  // 파일 경로
  // ============================================
  files: {
    template: path.join(ROOT_DIR, 'templates', 'result.html'),
    styles: path.join(ROOT_DIR, 'templates', 'styles.css'),
  },

  // ============================================
  // KAAF 사이트 URL
  // ============================================
  kaaf: {
    resultBase: 'http://result.kaaf.or.kr/tourInfo/resultInfo.do',
  },

  // ============================================
  // 카드뉴스 생성 기본값
  // ============================================
  cardNews: {
    width: 1080,
    height: 1080,
    deviceScaleFactor: 2,
  },

  // ============================================
  // 스크래퍼 기본값
  // ============================================
  scraper: {
    timeout: 30000,
    renderWait: 2000,   // 동적 렌더링 대기 (ms)
    maxRetries: 2,      // 종목별 재시도 횟수
  },

  // ============================================
  // 감시 모듈 기본값
  // ============================================
  watcher: {
    defaultInterval: 300,  // 기본 감시 주기 (초)
    knownResultsFile: 'known_results.json',
  },

  // ============================================
  // 서버 기본값
  // ============================================
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
};

module.exports = config;
