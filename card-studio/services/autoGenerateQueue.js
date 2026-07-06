/**
 * 자동 생성 큐 모듈 (Auto-Generate Queue)
 * 
 * 워처가 새 결과를 감지하면 자동으로 이미지 생성 큐에 추가합니다.
 * 모듈로 분리되어 on/off 가능하고, 큐 상태를 조회할 수 있습니다.
 * 
 * v1.0.0
 */

const EventEmitter = require('events');
const adminContentService = require('./adminContentService');
const historyManager = require('./historyManager');

class AutoGenerateQueue extends EventEmitter {
  constructor() {
    super();
    this.enabled = false;
    this.queue = [];
    this.processing = false;
    this.stats = { queued: 0, completed: 0, failed: 0 };
    this.snsSize = 'post'; // default size
    this.maxConcurrent = 1;
    this.log = [];
    this.maxLog = 100;
  }

  /**
   * 큐 활성화/비활성화
   */
  setEnabled(enabled) {
    this.enabled = !!enabled;
    this._addLog(enabled ? '자동 생성 큐 활성화' : '자동 생성 큐 비활성화');
    this.emit('statusChange', this.getStatus());
    return this.getStatus();
  }

  /**
   * SNS 사이즈 설정
   */
  setSnsSize(size) {
    if (['post', 'story', 'both'].includes(size)) {
      this.snsSize = size;
      this._addLog(`SNS 사이즈 변경: ${size}`);
    }
  }

  /**
   * 새 결과 데이터를 큐에 추가
   * watcherService의 newResult 이벤트에서 호출됨
   */
  enqueue(resultData) {
    if (!this.enabled) return;
    
    const item = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      data: resultData,
      status: 'pending',
      addedAt: new Date().toISOString(),
    };
    
    this.queue.push(item);
    this.stats.queued++;
    this._addLog(`큐 추가: ${resultData.event || 'Unknown'} (대기: ${this.queue.filter(q => q.status === 'pending').length})`);
    this.emit('itemAdded', item);
    
    // 처리 시작
    this._processNext();
    
    return item;
  }

  /**
   * 큐 처리 루프
   */
  async _processNext() {
    if (this.processing) return;
    
    const pending = this.queue.find(q => q.status === 'pending');
    if (!pending) return;
    
    this.processing = true;
    pending.status = 'processing';
    
    try {
      const data = this._prepareResultData(pending.data);
      data.snsSize = this.snsSize;
      
      const result = await adminContentService.generateResult(data);
      
      // 히스토리에 저장
      if (result.post && result.story) {
        for (const sz of ['post', 'story']) {
          historyManager.addEntry({
            type: 'result', event: data.event || data.fullEvent || '',
            competition: data.competitionName || '',
            size: sz, filename: result[sz].filename,
            meta: { auto: true, division: data.division, round: data.round },
          }, result[sz].imageBuffer);
        }
      } else {
        historyManager.addEntry({
          type: 'result', event: data.event || data.fullEvent || '',
          competition: data.competitionName || '',
          size: this.snsSize, filename: result.filename,
          meta: { auto: true, division: data.division, round: data.round },
        }, result.imageBuffer);
      }
      
      pending.status = 'completed';
      this.stats.completed++;
      this._addLog(`생성 완료: ${data.event || 'Unknown'}`);
      this.emit('itemCompleted', { item: pending, result });
      
    } catch (error) {
      pending.status = 'failed';
      pending.error = error.message;
      this.stats.failed++;
      this._addLog(`생성 실패: ${pending.data.event || 'Unknown'} - ${error.message}`);
      this.emit('itemFailed', { item: pending, error });
    }
    
    this.processing = false;
    
    // 다음 항목 처리
    this._processNext();
  }

  /**
   * 워처 결과 데이터 → 생성 서비스용 데이터 변환
   */
  _prepareResultData(watcherData) {
    const eventName = watcherData.event || '';
    let division = '', round = '', pureEvent = eventName;
    
    const genderMatch = eventName.match(/^(남자|여자)\s+/);
    if (genderMatch) pureEvent = eventName.replace(genderMatch[0], '');
    const roundMatch = pureEvent.match(/\s+(결승|예선|준결승|결선|[0-9]+조.*)$/);
    if (roundMatch) { round = roundMatch[1]; pureEvent = pureEvent.replace(roundMatch[0], ''); }
    division = genderMatch ? genderMatch[1] : '';
    
    return {
      competitionName: watcherData.competition || '',
      event: pureEvent.trim() || eventName,
      fullEvent: eventName,
      division, round,
      date: watcherData.date || '',
      venue: watcherData.venue || '',
      wind: watcherData.wind || '',
      results: (watcherData.results || []).map(r => ({
        rank: r.rank || 0, name: r.name || '', affiliation: r.affiliation || '',
        record: r.record || '', note: r.note || r.newRecord || '',
      })),
    };
  }

  /**
   * 상태 조회
   */
  getStatus() {
    return {
      enabled: this.enabled,
      snsSize: this.snsSize,
      queueLength: this.queue.filter(q => q.status === 'pending').length,
      processing: this.processing,
      stats: { ...this.stats },
    };
  }

  /**
   * 로그 조회
   */
  getLog(limit = 50) {
    return this.log.slice(-limit);
  }

  /**
   * 큐 초기화
   */
  clearQueue() {
    this.queue = this.queue.filter(q => q.status === 'processing');
    this._addLog('대기열 초기화');
  }

  /**
   * 통계 초기화
   */
  resetStats() {
    this.stats = { queued: 0, completed: 0, failed: 0 };
    this.log = [];
    this._addLog('통계 초기화');
  }

  _addLog(msg) {
    this.log.push({ timestamp: new Date().toISOString(), message: msg });
    if (this.log.length > this.maxLog) this.log.shift();
  }
}

module.exports = new AutoGenerateQueue();
