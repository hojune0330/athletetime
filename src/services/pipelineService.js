/**
 * 파이프라인 서비스
 *
 * 파이프라인 실행을 서버에서 관리합니다.
 * 핵심 모듈(pipeline.js, scraper.js 등)은 수정하지 않고
 * 래핑하여 API와 WebSocket에 상태를 전달합니다.
 */

const path = require('path');
const { fork } = require('child_process');
const EventEmitter = require('events');
const config = require('../config');
const { assertCollectionUrlAllowed } = require('../../lib/crawlPolicy');

class PipelineService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.currentJob = null;
    this.history = [];
    this.maxHistory = 50;
  }

  /**
   * 파이프라인 실행 상태 반환
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentJob: this.currentJob,
      historyCount: this.history.length,
    };
  }

  /**
   * 최근 실행 기록 반환
   */
  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }

  /**
   * 파이프라인 실행 (child process로 격리)
   *
   * @param {Object} options
   * @param {string} [options.mode] - 'input', 'url', 'processAll'
   * @param {string} [options.url] - URL 모드 시 대상 URL
   * @param {string} [options.input] - input 모드 시 파일 경로
   * @param {number} [options.maxEvents=0] - 최대 종목 수
   */
  async run(options = {}) {
    if (this.isRunning) {
      throw new Error('파이프라인이 이미 실행 중입니다.');
    }

    const mode = options.mode || (options.input ? 'input' : options.url ? 'url' : null);
    if (!mode) {
      throw new Error('파이프라인 모드와 실제 입력이 필요합니다.');
    }
    if (mode === 'url' && options.url) {
      assertCollectionUrlAllowed(options.url, 'Pipeline URL mode');
    }

    const jobId = `job_${Date.now()}`;

    this.isRunning = true;
    this.currentJob = {
      id: jobId,
      mode,
      url: options.url || null,
      input: options.input || null,
      startedAt: new Date().toISOString(),
      status: 'running',
      logs: [],
    };

    this.emit('jobStart', { jobId, mode });
    this._log(jobId, `파이프라인 시작 (모드: ${mode})`);

    return new Promise((resolve, reject) => {
      // CLI 인자 구성
      const args = [];
      switch (mode) {
        case 'url':
          if (!options.url) {
            this.isRunning = false;
            this.currentJob = null;
            reject(new Error('URL이 필요합니다.'));
            return;
          }
          args.push('--url', options.url);
          if (options.maxEvents) args.push('--max', String(options.maxEvents));
          break;
        case 'processAll':
          args.push('--process-all');
          break;
        case 'input':
          if (!options.input) {
            this.isRunning = false;
            this.currentJob = null;
            reject(new Error('입력 파일 또는 디렉토리가 필요합니다.'));
            return;
          }
          args.push('--input', options.input);
          break;
        default:
          this.isRunning = false;
          this.currentJob = null;
          reject(new Error(`지원하지 않는 파이프라인 모드입니다: ${mode}`));
          return;
      }

      const pipelinePath = path.join(config.dirs.src, 'pipeline.js');
      const child = fork(pipelinePath, args, {
        cwd: config.dirs.root,
        silent: true,
      });

      let output = '';

      child.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          output += line + '\n';
          this._log(jobId, line);
          this.emit('jobLog', { jobId, message: line });
        }
      });

      child.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          this._log(jobId, `[오류] ${line}`);
          this.emit('jobLog', { jobId, message: `[오류] ${line}` });
        }
      });

      child.on('close', (code) => {
        const endedAt = new Date().toISOString();
        const status = code === 0 ? 'completed' : 'failed';

        this.currentJob.status = status;
        this.currentJob.endedAt = endedAt;
        this.currentJob.exitCode = code;

        // 히스토리에 추가
        this.history.push({ ...this.currentJob });
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }

        this._log(jobId, `파이프라인 ${status === 'completed' ? '완료' : '실패'} (코드: ${code})`);
        this.emit('jobEnd', { jobId, status, exitCode: code });

        this.isRunning = false;
        this.currentJob = null;

        if (code === 0) {
          resolve({ jobId, status, output });
        } else {
          reject(new Error(`파이프라인 실패 (종료 코드: ${code})`));
        }
      });

      child.on('error', (error) => {
        this.isRunning = false;
        this.currentJob = null;
        this.emit('jobEnd', { jobId, status: 'error', error: error.message });
        reject(error);
      });
    });
  }

  /**
   * 내부 로그 기록
   */
  _log(jobId, message) {
    if (this.currentJob && this.currentJob.id === jobId) {
      this.currentJob.logs.push({
        timestamp: new Date().toISOString(),
        message,
      });
    }
  }
}

module.exports = new PipelineService();
