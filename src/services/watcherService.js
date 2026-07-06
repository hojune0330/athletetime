/**
 * 감시 서비스
 *
 * ResultWatcher를 서버에서 관리합니다.
 * 핵심 모듈(watcher.js)은 수정하지 않고 래핑합니다.
 */

const EventEmitter = require('events');
const { ResultWatcher } = require('../watcher');

class WatcherService extends EventEmitter {
  constructor() {
    super();
    this.watcher = null;
    this.logs = [];
    this.maxLogs = 200;
  }

  /**
   * 감시 상태 반환
   */
  getStatus() {
    if (!this.watcher) {
      return { isRunning: false, status: 'idle', url: null, interval: 0, scanCount: 0, knownEvents: 0 };
    }
    return this.watcher.getStatus();
  }

  /**
   * 최근 로그 반환
   */
  getLogs(limit = 50) {
    return this.logs.slice(-limit);
  }

  /**
   * 감시 시작
   *
   * @param {Object} options
   * @param {string} options.url - KAAF URL
   * @param {number} [options.interval=300] - 주기 (초)
   * @param {number} [options.maxEvents=0] - 최대 종목
   */
  async start(options = {}) {
    if (this.watcher && this.watcher.isRunning) {
      throw new Error('이미 감시 중입니다.');
    }

    const { url, interval = 300, maxEvents = 0 } = options;
    if (!url) throw new Error('URL이 필요합니다.');

    this.watcher = new ResultWatcher({ url, interval, maxEvents });

    // 이벤트 전달
    this.watcher.on('log', (data) => {
      this._addLog('log', data.message);
      this.emit('log', data);
    });

    this.watcher.on('newResult', (data) => {
      this._addLog('newResult', `${data.type === 'new' ? '신규' : '업데이트'}: ${data.event}`);
      this.emit('newResult', data);
    });

    this.watcher.on('statusChange', (data) => {
      this.emit('statusChange', data);
    });

    this.watcher.on('error', (data) => {
      this._addLog('error', data.message);
      this.emit('error', data);
    });

    await this.watcher.start();
    this._addLog('info', '감시 서비스 시작');
  }

  /**
   * 감시 중지
   */
  stop() {
    if (this.watcher) {
      this.watcher.stop();
      this._addLog('info', '감시 서비스 중지');
    }
  }

  /**
   * 수동 스캔 1회 실행
   */
  async scanOnce() {
    if (!this.watcher) {
      throw new Error('감시기가 초기화되지 않았습니다. 먼저 start를 호출하세요.');
    }
    return await this.watcher.scan();
  }

  /**
   * 감시 데이터 초기화
   */
  reset() {
    if (this.watcher) {
      this.watcher.reset();
    }
    this.logs = [];
    this._addLog('info', '감시 데이터 초기화');
  }

  /**
   * 로그 추가
   */
  _addLog(type, message) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      type,
      message,
    });
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
}

module.exports = new WatcherService();
