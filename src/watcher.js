#!/usr/bin/env node

/**
 * 실시간 경기결과 감시 모듈 (Round 2-B)
 *
 * KAAF 경기결과 페이지를 주기적으로 스크래핑하여
 * 새로운 결과가 등록되면 이벤트를 발생시킵니다.
 *
 * 동작 방식:
 *   1. 최초 스캔: URL에서 전체 결승 결과를 수집
 *   2. known_results.json에 기존 결과를 저장
 *   3. 설정된 주기(interval)마다 재스캔
 *   4. 새 결과 발견 시 'newResult' 이벤트 발생
 *
 * 이벤트:
 *   - 'log'          : { timestamp, message }
 *   - 'newResult'    : { event, competition, date, venue, wind, results }
 *   - 'statusChange' : { status, message, timestamp }
 *   - 'error'        : { message, timestamp }
 *
 * 사용법 (CLI):
 *   node src/watcher.js --url "http://result.kaaf.or.kr/..." --interval 300
 *   node src/watcher.js --url "http://..." --interval 60
 *
 * 사용법 (모듈):
 *   const { ResultWatcher } = require('./watcher');
 *   const watcher = new ResultWatcher({ url, interval: 300 });
 *   watcher.on('newResult', (data) => { ... });
 *   watcher.start();
 *   // 나중에: watcher.stop();
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { scrapeResults } = require('./scraper');
const { assertCollectionUrlAllowed } = require('../lib/crawlPolicy');

// ============================================
// 설정
// ============================================

const KNOWN_RESULTS_PATH = path.join(config.dirs.data, 'known_results.json');

// ============================================
// 유틸리티
// ============================================

function now() {
  return new Date().toISOString();
}

/**
 * 이벤트 결과의 고유 키를 생성합니다.
 * 종목명 + 선수 수 + 1위 기록으로 유일성 판별
 */
function makeEventKey(event) {
  const resultStr = (event.results || [])
    .map(r => `${r.rank}:${r.name}:${r.record}`)
    .join('|');
  return `${event.event}::${resultStr}`;
}

// ============================================
// ResultWatcher 클래스
// ============================================

class ResultWatcher extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} options.url - KAAF 종목 목록 URL
   * @param {number} [options.interval=300] - 감시 주기 (초)
   * @param {boolean} [options.finalsOnly=true] - 결승만 감시
   * @param {number} [options.maxEvents=0] - 최대 종목 수 (0=전체)
   */
  constructor(options = {}) {
    super();
    this.url = options.url;
    assertCollectionUrlAllowed(this.url, 'KAAF result watcher');

    this.interval = (options.interval || 300) * 1000; // 초 → ms
    this.finalsOnly = options.finalsOnly !== false;
    this.maxEvents = options.maxEvents || 0;
    this.knownResults = new Map();
    this.timer = null;
    this.isRunning = false;
    this.scanCount = 0;
    this.status = 'idle'; // idle, scanning, watching, stopped, error

    this._loadKnownResults();
  }

  /**
   * 기존 known_results.json 로드
   */
  _loadKnownResults() {
    try {
      if (fs.existsSync(KNOWN_RESULTS_PATH)) {
        const data = JSON.parse(fs.readFileSync(KNOWN_RESULTS_PATH, 'utf-8'));
        if (data && typeof data === 'object' && data.results) {
          for (const [key, value] of Object.entries(data.results)) {
            this.knownResults.set(key, value);
          }
          this._log(`기존 결과 ${this.knownResults.size}건 로드 완료`);
        }
      }
    } catch (error) {
      this._log(`known_results.json 로드 실패: ${error.message}`);
    }
  }

  /**
   * known_results.json 저장
   */
  _saveKnownResults() {
    try {
      const dirPath = path.dirname(KNOWN_RESULTS_PATH);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const data = {
        lastUpdated: now(),
        totalEvents: this.knownResults.size,
        scanCount: this.scanCount,
        results: Object.fromEntries(this.knownResults),
      };

      fs.writeFileSync(KNOWN_RESULTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      this._log(`known_results.json 저장 실패: ${error.message}`);
    }
  }

  /**
   * 로그 이벤트 발생
   */
  _log(message) {
    this.emit('log', { timestamp: now(), message });
  }

  /**
   * 상태 변경 이벤트 발생
   */
  _setStatus(status, message) {
    this.status = status;
    this.emit('statusChange', { status, message, timestamp: now() });
  }

  /**
   * 단일 스캔 실행
   */
  async scan() {
    this.scanCount++;
    this._setStatus('scanning', `스캔 #${this.scanCount} 시작`);
    this._log(`📡 스캔 #${this.scanCount} 시작 (URL: ${this.url})`);

    try {
      const scraped = await scrapeResults(this.url, {
        finalsOnly: this.finalsOnly,
        maxEvents: this.maxEvents,
      });

      const events = scraped.events || [];
      this._log(`📊 ${events.length}개 종목 결과 수집 완료`);

      let newCount = 0;
      let updatedCount = 0;

      for (const event of events) {
        const key = makeEventKey(event);
        const existingKey = `${event.event}`;

        if (!this.knownResults.has(existingKey)) {
          // 완전히 새로운 종목
          this.knownResults.set(existingKey, {
            key,
            event: event.event,
            competition: event.competition,
            date: event.date,
            venue: event.venue,
            wind: event.wind,
            resultCount: (event.results || []).length,
            firstSeen: now(),
            lastUpdated: now(),
          });
          newCount++;

          this.emit('newResult', {
            type: 'new',
            event: event.event,
            competition: event.competition,
            date: event.date,
            venue: event.venue,
            wind: event.wind,
            results: event.results,
            timestamp: now(),
          });
        } else {
          // 기존 종목: 결과 변경 여부 확인
          const existing = this.knownResults.get(existingKey);
          if (existing.key !== key) {
            // 결과가 업데이트됨
            existing.key = key;
            existing.resultCount = (event.results || []).length;
            existing.lastUpdated = now();
            updatedCount++;

            this.emit('newResult', {
              type: 'updated',
              event: event.event,
              competition: event.competition,
              date: event.date,
              venue: event.venue,
              wind: event.wind,
              results: event.results,
              timestamp: now(),
            });
          }
        }
      }

      this._saveKnownResults();

      if (newCount > 0 || updatedCount > 0) {
        this._log(`🆕 새 결과: ${newCount}건, 업데이트: ${updatedCount}건`);
      } else {
        this._log(`ℹ️ 변경 사항 없음 (기존 ${this.knownResults.size}건)`);
      }

      this._setStatus('watching', `스캔 #${this.scanCount} 완료 — 다음 스캔까지 ${this.interval / 1000}초`);

      return { newCount, updatedCount, totalEvents: events.length };

    } catch (error) {
      this._setStatus('error', `스캔 실패: ${error.message}`);
      this.emit('error', { message: error.message, timestamp: now() });
      return { newCount: 0, updatedCount: 0, totalEvents: 0, error: error.message };
    }
  }

  /**
   * 감시 시작
   */
  async start() {
    if (this.isRunning) {
      this._log('⚠️ 이미 감시 중입니다.');
      return;
    }

    if (!this.url) {
      throw new Error('URL이 지정되지 않았습니다.');
    }

    this.isRunning = true;
    this._setStatus('scanning', '최초 스캔 시작');
    this._log(`🚀 감시 시작 — 주기: ${this.interval / 1000}초`);

    // 최초 스캔
    await this.scan();

    // 주기적 스캔 설정
    this.timer = setInterval(async () => {
      if (this.isRunning) {
        await this.scan();
      }
    }, this.interval);

    this._log(`⏰ 다음 스캔: ${this.interval / 1000}초 후`);
  }

  /**
   * 감시 중지
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this._setStatus('stopped', '감시 중지됨');
    this._log('🛑 감시를 중지했습니다.');
  }

  /**
   * 현재 상태 반환
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      status: this.status,
      url: this.url,
      interval: this.interval / 1000,
      scanCount: this.scanCount,
      knownEvents: this.knownResults.size,
      lastScan: this.scanCount > 0 ? now() : null,
    };
  }

  /**
   * known_results 초기화
   */
  reset() {
    this.knownResults.clear();
    this.scanCount = 0;
    this._saveKnownResults();
    this._log('🔄 감시 데이터를 초기화했습니다.');
  }
}

// ============================================
// CLI
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  let url = null;
  let interval = 300;
  let maxEvents = 0;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': case '-u':
        url = args[++i];
        break;
      case '--interval': case '-t':
        interval = parseInt(args[++i], 10) || 300;
        break;
      case '--max':
        maxEvents = parseInt(args[++i], 10) || 0;
        break;
      case '--help':
        console.log(`
사용법: node src/watcher.js --url "http://result.kaaf.or.kr/..." [옵션]

옵션:
  --url, -u         종목 목록 페이지 URL (필수)
  --interval, -t    감시 주기 (초, 기본: 300)
  --max N           최대 N개 종목만 감시 (기본: 전체)
  --help            도움말

예시:
  node src/watcher.js --url "http://result.kaaf.or.kr/tourInfo/resultInfo.do?..." --interval 60
  node src/watcher.js --url "http://..." --interval 300 --max 10
        `);
        process.exit(0);
    }
  }

  if (!url) {
    console.error('❌ URL을 지정해주세요.');
    console.log('   사용법: node src/watcher.js --url "http://..." --interval 300');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   👁️  실시간 경기결과 감시기                  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  let watcher;
  try {
    watcher = new ResultWatcher({ url, interval, maxEvents });
  } catch (err) {
    console.error(`Watcher blocked: ${err.message}`);
    process.exit(1);
  }

  // 이벤트 리스너 등록
  watcher.on('log', ({ timestamp, message }) => {
    console.log(`[${timestamp.slice(11, 19)}] ${message}`);
  });

  watcher.on('newResult', (data) => {
    const icon = data.type === 'new' ? '🆕' : '🔄';
    console.log(`\n${icon} [${data.type.toUpperCase()}] ${data.event}`);
    console.log(`   대회: ${data.competition}`);
    console.log(`   일자: ${data.date}, 장소: ${data.venue}`);
    if (data.wind) console.log(`   풍속: ${data.wind}`);
    console.log(`   결과: ${data.results.length}명`);
    data.results.slice(0, 3).forEach(r => {
      console.log(`      ${r.rank}위 ${r.name} (${r.affiliation}) — ${r.record}`);
    });
    console.log('');
  });

  watcher.on('statusChange', ({ status, message }) => {
    console.log(`   [상태] ${status}: ${message}`);
  });

  watcher.on('error', ({ message }) => {
    console.error(`   ❌ 오류: ${message}`);
  });

  // Ctrl+C 시 정상 종료
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Ctrl+C — 감시를 종료합니다.');
    watcher.stop();
    const status = watcher.getStatus();
    console.log(`   총 스캔: ${status.scanCount}회`);
    console.log(`   확인된 종목: ${status.knownEvents}개`);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    watcher.stop();
    process.exit(0);
  });

  // 시작
  watcher.start().catch(err => {
    console.error(`💥 감시 시작 실패: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { ResultWatcher, KNOWN_RESULTS_PATH };
