/**
 * 운영자 전용 API 라우트 (Admin Routes)
 * 
 * requireAdmin 미들웨어를 통해 인증된 관리자만 접근 가능합니다.
 * 대시보드, 창작 콘텐츠 제작, 시스템 모니터링, 파이프라인,
 * 감시(Watcher), 갤러리 관리, 히스토리 등을 포함합니다.
 * 
 * ═══════════════════════════════════════════════════════════════
 * 엔드포인트 목록 (32개)
 * ═══════════════════════════════════════════════════════════════
 * 
 * [시스템 모니터링] (4개)
 * GET  /status                    - 전체 시스템 상태
 * GET  /system/info               - 시스템 상세 정보
 * 
 * [갤러리 관리] (3개)
 * GET  /gallery                   - 카드뉴스 이미지 목록
 * GET  /gallery/:filename         - 단일 이미지 정보
 * DELETE /gallery/:filename       - 이미지 삭제
 * 
 * [파이프라인] (3개)
 * GET  /pipeline/status           - 파이프라인 실행 상태
 * GET  /pipeline/history          - 파이프라인 실행 기록
 * POST /pipeline/run              - 파이프라인 실행
 * 
 * [감시 (Watcher)] (5개)
 * GET  /watcher/status            - 감시 상태
 * GET  /watcher/logs              - 감시 로그
 * POST /watcher/start             - 감시 시작
 * POST /watcher/stop              - 감시 중지
 * POST /watcher/scan              - 수동 스캔 1회
 * POST /watcher/reset             - 감시 데이터 초기화
 * 
 * [창작 콘텐츠 제작] (13개)
 * POST /admin/schedule/parse-pdf         - 시간표 PDF 파싱
 * POST /admin/schedule/parse-and-generate - 시간표 일괄 생성
 * POST /admin/schedule/preview           - 시간표 미리보기
 * POST /admin/schedule/generate          - 시간표 생성
 * POST /admin/notice/preview             - 공지사항 미리보기
 * POST /admin/notice/generate            - 공지사항 생성
 * GET  /admin/result/events              - 경기결과 종목 목록
 * GET  /admin/result/event-detail        - 종목 상세 결과
 * POST /admin/result/preview             - 경기결과 미리보기
 * POST /admin/result/batch-generate      - 경기결과 일괄 생성
 * POST /admin/result/generate            - 경기결과 생성
 * GET  /competitions/:id/events          - 대회 종목 목록 (관리자)
 * POST /competitions/import-kaaf         - KAAF 데이터 임포트
 * 
 * [자동 생성 큐] (4개)
 * GET  /admin/auto-queue/status          - 큐 상태
 * POST /admin/auto-queue/toggle          - 큐 활성/비활성
 * GET  /admin/auto-queue/log             - 큐 로그
 * POST /admin/auto-queue/clear           - 큐 초기화
 * 
 * [히스토리 관리] (4개)
 * GET  /admin/history                    - 생성 이력 목록
 * GET  /admin/history/:id/image          - 생성 이미지 조회
 * DELETE /admin/history/:id              - 이력 삭제
 * DELETE /admin/history                  - 전체 이력 삭제
 * 
 * [프리셋 관리] (1개)
 * POST /profile-card/presets/reload      - 프리셋 캐시 새로고침
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { execFile } = require('child_process');
const path = require('path');

// PDF 업로드용 multer (메모리 저장, 최대 20MB)
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const pipelineService = require('../services/pipelineService');
const watcherService = require('../services/watcherService');
const galleryService = require('../services/galleryService');
const systemService = require('../services/systemService');
const profileCardService = require('../services/profileCardService');
const adminContentService = require('../services/adminContentService');
const competitionService = require('../services/competitionService');
const dataRequestService = require('../services/dataRequestService');
const { OPERATOR_GUIDE } = require('../operatorGuidePolicy');
const wsManager = require('../websocket/wsManager');

// ============================================
// 시스템 모니터링 (System Monitoring)
// ============================================

router.get('/status', (req, res) => {
  const system = systemService.getInfo();
  const pipeline = pipelineService.getStatus();
  const watcher = watcherService.getStatus();
  const gallery = galleryService.getStats();

  res.json({
    success: true,
    data: {
      system,
      pipeline,
      watcher,
      gallery,
      wsClients: wsManager.getClientCount(),
    },
  });
});

router.get('/system/info', (req, res) => {
  try {
    const info = systemService.getInfo();
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/operator-guide', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: OPERATOR_GUIDE });
});

// ============================================
// 갤러리 관리 (Gallery Management)
// ============================================

router.get('/gallery', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const sort = req.query.sort || 'newest';

  const result = galleryService.getImages({ limit, offset, sort });
  res.json({ success: true, data: result });
});

router.get('/gallery/:filename', (req, res) => {
  const image = galleryService.getImage(req.params.filename);
  if (!image) {
    return res.status(404).json({ success: false, error: '이미지를 찾을 수 없습니다.' });
  }
  res.json({ success: true, data: image });
});

router.delete('/gallery/:filename', (req, res) => {
  const deleted = galleryService.deleteImage(req.params.filename);
  if (!deleted) {
    return res.status(404).json({ success: false, error: '이미지를 찾을 수 없습니다.' });
  }
  wsManager.broadcast('galleryUpdate', { action: 'delete', filename: req.params.filename });
  res.json({ success: true, message: '이미지가 삭제되었습니다.' });
});

// ============================================
// 파이프라인 (Pipeline)
// ============================================

router.get('/pipeline/status', (req, res) => {
  res.json({ success: true, data: pipelineService.getStatus() });
});

router.get('/pipeline/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({ success: true, data: pipelineService.getHistory(limit) });
});

router.post('/pipeline/run', async (req, res) => {
  try {
    const { mode, url, input, maxEvents } = req.body || {};
    wsManager.broadcast('pipelineStatus', { status: 'starting', mode });

    pipelineService.run({ mode, url, input, maxEvents })
      .then((result) => {
        wsManager.broadcast('pipelineStatus', { status: 'completed', jobId: result.jobId });
        wsManager.broadcast('galleryUpdate', { action: 'refresh' });
      })
      .catch((error) => {
        wsManager.broadcast('pipelineStatus', { status: 'failed', error: error.message });
      });

    res.json({
      success: true,
      message: '파이프라인 실행이 시작되었습니다.',
      data: pipelineService.getStatus(),
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// 감시 (Watcher)
// ============================================

router.get('/watcher/status', (req, res) => {
  res.json({ success: true, data: watcherService.getStatus() });
});

router.get('/watcher/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ success: true, data: watcherService.getLogs(limit) });
});

router.post('/watcher/start', async (req, res) => {
  try {
    const { url, interval, maxEvents } = req.body || {};
    await watcherService.start({ url, interval, maxEvents });
    res.json({ success: true, message: '감시가 시작되었습니다.', data: watcherService.getStatus() });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/watcher/stop', (req, res) => {
  watcherService.stop();
  res.json({ success: true, message: '감시가 중지되었습니다.' });
});

router.post('/watcher/scan', async (req, res) => {
  try {
    const result = await watcherService.scanOnce();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/watcher/reset', (req, res) => {
  watcherService.reset();
  res.json({ success: true, message: '감시 데이터가 초기화되었습니다.' });
});

// ============================================
// 운영자 콘텐츠 (시간표, 공지사항, 경기결과)
// ============================================

// 시간표 PDF 파싱
router.post('/admin/schedule/parse-pdf', pdfUpload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'PDF 파일을 업로드해주세요.' });
  }

  const parserPath = path.resolve(__dirname, '../../tools/parse_schedule_pdf.py');
  const child = execFile('python3', [parserPath, '--stdin'], {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf-8',
  }, (error, stdout, stderr) => {
    if (error) {
      console.error('PDF 파싱 오류:', stderr || error.message);
      return res.status(500).json({ success: false, error: 'PDF 파싱에 실패했습니다: ' + (stderr || error.message) });
    }
    try {
      const schedules = JSON.parse(stdout);
      const summary = schedules.map(s => {
        const trackCount = s.trackEvents.filter(e => e.type !== 'break').length;
        const fieldCount = s.fieldEvents.filter(e => e.type !== 'break').length;
        return `${s.day}일차: 트랙 ${trackCount}개, 필드 ${fieldCount}개`;
      }).join(' / ');

      res.json({
        success: true,
        data: { schedules, summary, dayCount: schedules.length },
      });
    } catch (e) {
      console.error('JSON 파싱 오류:', e.message);
      res.status(500).json({ success: false, error: 'PDF 파싱 결과를 처리할 수 없습니다.' });
    }
  });

  child.stdin.write(req.file.buffer);
  child.stdin.end();
});

// 시간표 PDF → 전체 이미지 일괄 생성
router.post('/admin/schedule/parse-and-generate', pdfUpload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'PDF 파일을 업로드해주세요.' });
  }

  const parserPath = path.resolve(__dirname, '../../tools/parse_schedule_pdf.py');

  let parseResult;
  try {
    parseResult = await new Promise((resolve, reject) => {
      const child = execFile('python3', [parserPath, '--stdin'], {
        timeout: 30000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf-8',
      }, (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        try { resolve(JSON.parse(stdout)); } catch (e) { reject(e); }
      });
      child.stdin.write(req.file.buffer);
      child.stdin.end();
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'PDF 파싱 실패: ' + err.message });
  }

  const results = [];
  for (const schedule of parseResult) {
    try {
      const result = await adminContentService.generateSchedule(schedule);
      const imageBase64 = result.imageBuffer.toString('base64');
      results.push({
        day: schedule.day, date: schedule.date,
        image: `data:image/png;base64,${imageBase64}`,
        filename: result.filename,
        trackCount: schedule.trackEvents.filter(e => e.type !== 'break').length,
        fieldCount: schedule.fieldEvents.filter(e => e.type !== 'break').length,
      });
    } catch (err) {
      results.push({ day: schedule.day, date: schedule.date, error: err.message });
    }
  }

  res.json({
    success: true,
    data: { results, totalDays: parseResult.length, successCount: results.filter(r => !r.error).length },
  });
});

// 시간표 미리보기 HTML
router.post('/admin/schedule/preview', express.json({ limit: '2mb' }), (req, res) => {
  try {
    const html = adminContentService.getSchedulePreviewHtml(req.body);
    res.json({ success: true, data: { html } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 시간표 이미지 생성
router.post('/admin/schedule/generate', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    const result = await adminContentService.generateSchedule(req.body);
    if (result.post && result.story) {
      const data = {};
      for (const sz of ['post', 'story']) {
        data[sz] = {
          image: `data:image/png;base64,${result[sz].imageBuffer.toString('base64')}`,
          filename: result[sz].filename,
        };
      }
      return res.json({ success: true, data });
    }
    const imageBase64 = result.imageBuffer.toString('base64');
    res.json({
      success: true,
      data: {
        image: `data:image/png;base64,${imageBase64}`,
        filename: result.filename,
      },
    });
  } catch (error) {
    console.error('시간표 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 공지사항 미리보기 HTML
router.post('/admin/notice/preview', express.json({ limit: '2mb' }), (req, res) => {
  try {
    const html = adminContentService.getNoticePreviewHtml(req.body);
    res.json({ success: true, data: { html } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 공지사항 이미지 생성
router.post('/admin/notice/generate', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    const result = await adminContentService.generateNotice(req.body);
    if (result.post && result.story) {
      const data = {};
      for (const sz of ['post', 'story']) {
        data[sz] = {
          image: `data:image/png;base64,${result[sz].imageBuffer.toString('base64')}`,
          filename: result[sz].filename,
        };
      }
      return res.json({ success: true, data });
    }
    const imageBase64 = result.imageBuffer.toString('base64');
    res.json({
      success: true,
      data: {
        image: `data:image/png;base64,${imageBase64}`,
        filename: result.filename,
      },
    });
  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 경기결과 데이터 브라우징
// ============================================

router.get('/admin/result/events', (req, res) => {
  try {
    const { comp, q } = req.query;
    const fs = require('fs');
    const rawDir = path.join(__dirname, '../../data/raw');

    if (!fs.existsSync(rawDir)) {
      return res.json({ success: true, data: { competitions: [], events: [] } });
    }

    const files = fs.readdirSync(rawDir).filter(f => f.endsWith('_raw.json')).sort().reverse();
    const competitions = [];
    const allEvents = [];
    const seenComps = new Set();

    for (const file of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf-8'));
        const compName = raw.meta?.competition || raw.events?.[0]?.competition || file;
        const compDate = raw.meta?.date || raw.meta?.period || '';

        if (seenComps.has(compName)) continue;
        seenComps.add(compName);

        if (!competitions.find(c => c.name === compName)) {
          competitions.push({ name: compName, date: compDate, file });
        }

        if (comp && compName !== comp) continue;

        for (let i = 0; i < (raw.events || []).length; i++) {
          const ev = raw.events[i];
          const eventEntry = {
            index: i,
            file,
            competition: ev.competition || compName,
            event: ev.event || '',
            date: ev.date || '',
            venue: ev.venue || '',
            wind: ev.wind || '',
            resultCount: (ev.results || []).length,
            topResult: ev.results?.[0] ? `${ev.results[0].name} ${ev.results[0].record}` : '',
          };

          if (q) {
            const query = q.toLowerCase();
            const searchable = `${eventEntry.event} ${eventEntry.competition} ${eventEntry.topResult}`.toLowerCase();
            if (!searchable.includes(query)) continue;
          }

          allEvents.push(eventEntry);
        }
      } catch (e) { /* skip corrupt files */ }
    }

    res.json({ success: true, data: { competitions, events: allEvents } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admin/result/event-detail', (req, res) => {
  try {
    const { file, index } = req.query;
    if (!file || index === undefined) {
      return res.status(400).json({ success: false, error: 'file과 index 파라미터가 필요합니다.' });
    }

    const fs = require('fs');
    const filePath = path.join(__dirname, '../../data/raw', path.basename(file));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '파일을 찾을 수 없습니다.' });
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const ev = raw.events?.[parseInt(index)];

    if (!ev) {
      return res.status(404).json({ success: false, error: '해당 종목을 찾을 수 없습니다.' });
    }

    const eventName = ev.event || '';
    let division = '', round = '', pureEvent = eventName;

    const genderMatch = eventName.match(/^(남자|여자)\s+/);
    if (genderMatch) {
      pureEvent = eventName.replace(genderMatch[0], '');
    }

    const roundMatch = pureEvent.match(/\s+(결승|예선|준결승|결선|7조.*|[0-9]+조.*)$/);
    if (roundMatch) {
      round = roundMatch[1];
      pureEvent = pureEvent.replace(roundMatch[0], '');
    }

    division = genderMatch ? genderMatch[1] : '';

    res.json({
      success: true,
      data: {
        competition: ev.competition || raw.meta?.competition || '',
        event: pureEvent.trim() || eventName,
        fullEvent: eventName,
        division,
        round,
        date: ev.date || '',
        venue: ev.venue || '',
        wind: ev.wind || '',
        results: (ev.results || []).map(r => ({
          rank: r.rank || 0,
          name: r.name || '',
          affiliation: r.affiliation || '',
          record: r.record || '',
          note: r.note || r.newRecord || '',
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admin/result/preview', express.json({ limit: '2mb' }), (req, res) => {
  try {
    const html = adminContentService.getResultPreviewHtml(req.body);
    res.json({ success: true, data: { html } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admin/result/batch-generate', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { file, snsSize = 'post', indices } = req.body;
    const historyManager = require('../services/historyManager');

    if (!file) {
      return res.status(400).json({ success: false, error: 'file 파라미터가 필요합니다.' });
    }

    const fs = require('fs');
    const filePath = path.join(__dirname, '../../data/raw', path.basename(file));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '파일을 찾을 수 없습니다.' });
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const events = raw.events || [];
    const compName = raw.meta?.competition || '';

    const targetIndices = indices || events.map((_, i) => i);

    const results = [];
    let successCount = 0;

    for (const idx of targetIndices) {
      const ev = events[idx];
      if (!ev) { results.push({ index: idx, error: 'Event not found' }); continue; }

      const eventName = ev.event || '';
      let division = '', round = '', pureEvent = eventName;
      const genderMatch = eventName.match(/^(남자|여자)\s+/);
      if (genderMatch) pureEvent = eventName.replace(genderMatch[0], '');
      const roundMatch = pureEvent.match(/\s+(결승|예선|준결승|결선|[0-9]+조.*)$/);
      if (roundMatch) { round = roundMatch[1]; pureEvent = pureEvent.replace(roundMatch[0], ''); }
      division = genderMatch ? genderMatch[1] : '';

      const data = {
        competitionName: ev.competition || compName,
        event: pureEvent.trim() || eventName,
        fullEvent: eventName,
        division, round,
        date: ev.date || '',
        venue: ev.venue || '',
        wind: ev.wind || '',
        snsSize,
        results: (ev.results || []).map(r => ({
          rank: r.rank || 0, name: r.name || '', affiliation: r.affiliation || '',
          record: r.record || '', note: r.note || r.newRecord || '',
        })),
      };

      try {
        const result = await adminContentService.generateResult(data);

        if (result.post && result.story) {
          for (const sz of ['post', 'story']) {
            historyManager.addEntry({
              type: 'result', event: eventName, competition: compName,
              size: sz, filename: result[sz].filename, meta: { division, round, venue: data.venue, batch: true },
            }, result[sz].imageBuffer);
          }
          results.push({
            index: idx, event: eventName,
            post: { image: `data:image/png;base64,${result.post.imageBuffer.toString('base64')}`, filename: result.post.filename },
            story: { image: `data:image/png;base64,${result.story.imageBuffer.toString('base64')}`, filename: result.story.filename },
          });
        } else {
          historyManager.addEntry({
            type: 'result', event: eventName, competition: compName,
            size: snsSize, filename: result.filename, meta: { division, round, venue: data.venue, batch: true },
          }, result.imageBuffer);
          results.push({
            index: idx, event: eventName,
            image: `data:image/png;base64,${result.imageBuffer.toString('base64')}`,
            filename: result.filename,
          });
        }
        successCount++;
      } catch (err) {
        results.push({ index: idx, event: eventName, error: err.message });
      }
    }

    res.json({
      success: true,
      data: { results, totalEvents: targetIndices.length, successCount, competition: compName },
    });
  } catch (error) {
    console.error('일괄 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admin/result/generate', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    const historyManager = require('../services/historyManager');
    const result = await adminContentService.generateResult(req.body);
    const eventName = req.body.event || '';
    const compName = req.body.competitionName || '';

    if (result.post && result.story) {
      const data = {};
      for (const sz of ['post', 'story']) {
        historyManager.addEntry({
          type: 'result', event: eventName, competition: compName,
          size: sz, filename: result[sz].filename, meta: { division: req.body.division, round: req.body.round },
        }, result[sz].imageBuffer);
        data[sz] = {
          image: `data:image/png;base64,${result[sz].imageBuffer.toString('base64')}`,
          filename: result[sz].filename,
        };
      }
      return res.json({ success: true, data });
    }
    historyManager.addEntry({
      type: 'result', event: eventName, competition: compName,
      size: req.body.snsSize || 'post', filename: result.filename, meta: { division: req.body.division, round: req.body.round },
    }, result.imageBuffer);
    const imageBase64 = result.imageBuffer.toString('base64');
    res.json({
      success: true,
      data: {
        image: `data:image/png;base64,${imageBase64}`,
        filename: result.filename,
      },
    });
  } catch (error) {
    console.error('경기결과 생성 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 대회 관리 (관리자 전용)
// ============================================

router.get('/competitions/:id/events', (req, res) => {
  try {
    const rawFiles = competitionService.getCompetitionRawFiles(req.params.id);
    if (rawFiles.length === 0) {
      return res.json({ success: true, data: { events: [], total: 0 } });
    }

    const latestFile = rawFiles.sort().reverse()[0];
    const fs = require('fs');
    const rawPath = path.join(__dirname, '../../data/raw', latestFile);
    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

    const events = (rawData.events || []).map((ev, idx) => ({
      index: idx,
      event: ev.event || '',
      division: ev.division || '',
      round: ev.round || '',
      resultCount: (ev.results || []).length,
      wind: ev.wind || '',
      date: ev.date || ''
    }));

    res.json({
      success: true,
      data: {
        competition: rawData.competition || req.params.id,
        file: latestFile,
        events,
        total: events.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/competitions/import-kaaf', (req, res) => {
  try {
    const { year, entries } = req.body;
    if (!year || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, error: 'year와 entries 배열이 필요합니다.' });
    }
    const result = competitionService.importKaafData(year, entries);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// 실업연맹 데이터 동기화 (PaceRise → data/raw)
// 결과적으로 KAAF raw JSON과 동일한 형식으로 저장되므로
// 기존 결과 탭, 일괄 생성, 카드뉴스 파이프라인이 그대로 작동
// ============================================

router.get('/admin/data-sync/status', async (req, res) => {
  try {
    const paceriseImporter = require('../../src/services/paceriseImporter');
    const prClient = require('../../src/pacerise-client');

    const existing = paceriseImporter.getExistingPaceriseFiles();
    let health, competitions;
    try {
      health = await prClient.healthCheck();
      competitions = await prClient.getCompetitions();
    } catch (e) {
      health = { status: 'error', error: e.message };
      competitions = [];
    }

    // completed + active 대회 중 아직 임포트되지 않은 것 표시
    const importable = competitions
      .filter(c => c.status === 'completed' || c.status === 'active')
      .map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        venue: c.venue || '',
        start_date: c.start_date || '',
        end_date: c.end_date || '',
        imported: existing.some(e => e.paceriseId === c.id),
      }));

    res.json({
      success: true,
      data: {
        connected: health.status === 'connected',
        latency: health.latency_ms || null,
        competitions: importable,
        importedCount: existing.length,
        totalAvailable: importable.length,
        newAvailable: importable.filter(c => !c.imported).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/data-sync/import', express.json(), async (req, res) => {
  try {
    const paceriseImporter = require('../../src/services/paceriseImporter');
    const { competitionId, force } = req.body || {};

    let result;
    if (competitionId) {
      result = await paceriseImporter.importCompetition(Number(competitionId));
    } else {
      // 전체 동기화 (미임포트 대회만)
      result = await paceriseImporter.importAll({ force: !!force });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// 자동 생성 큐
// ============================================

const autoGenerateQueue = require('../services/autoGenerateQueue');

router.get('/admin/auto-queue/status', (req, res) => {
  res.json({ success: true, data: autoGenerateQueue.getStatus() });
});

router.post('/admin/auto-queue/toggle', express.json(), (req, res) => {
  const { enabled, snsSize } = req.body;
  if (snsSize) autoGenerateQueue.setSnsSize(snsSize);
  const status = autoGenerateQueue.setEnabled(enabled !== false);
  res.json({ success: true, data: status });
});

router.get('/admin/auto-queue/log', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ success: true, data: autoGenerateQueue.getLog(limit) });
});

router.post('/admin/auto-queue/clear', (req, res) => {
  autoGenerateQueue.clearQueue();
  res.json({ success: true, data: autoGenerateQueue.getStatus() });
});

// ============================================
// 히스토리 관리
// ============================================

const historyManager = require('../services/historyManager');

router.get('/admin/history', (req, res) => {
  try {
    const { type, q, limit, offset } = req.query;
    const result = historyManager.getEntries({ type, q, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admin/history/:id/image', (req, res) => {
  try {
    const imagePath = historyManager.getImagePath(req.params.id);
    if (!imagePath) {
      return res.status(404).json({ success: false, error: '이미지를 찾을 수 없습니다.' });
    }
    res.sendFile(imagePath);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/admin/history/:id', (req, res) => {
  try {
    const deleted = historyManager.deleteEntry(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: '이력을 찾을 수 없습니다.' });
    res.json({ success: true, message: '삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/admin/history', (req, res) => {
  try {
    historyManager.clearAll();
    res.json({ success: true, message: '전체 이력이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 프리셋 관리 (개발자/관리자)
// ============================================

router.post('/profile-card/presets/reload', (req, res) => {
  profileCardService.reloadPresets();
  res.json({ success: true, message: '프리셋이 새로고침되었습니다.', data: profileCardService.getModularPresets() });
});

// ============================================
// WebSocket 이벤트 연결 (서비스 → WS)
// ============================================

pipelineService.on('jobStart', (data) => wsManager.broadcast('pipelineStatus', { ...data, status: 'running' }));
pipelineService.on('jobLog', (data) => wsManager.broadcast('pipelineLog', data));
pipelineService.on('jobEnd', (data) => wsManager.broadcast('pipelineStatus', data));

watcherService.on('log', (data) => wsManager.broadcast('watcherLog', data));
watcherService.on('newResult', (data) => {
  wsManager.broadcast('newResult', data);
  autoGenerateQueue.enqueue(data);
});
watcherService.on('statusChange', (data) => wsManager.broadcast('watcherStatus', data));
watcherService.on('error', (data) => wsManager.broadcast('watcherError', data));

autoGenerateQueue.on('itemCompleted', (data) => {
  wsManager.broadcast('autoGenComplete', { event: data.item.data.event, status: 'completed' });
  wsManager.broadcast('galleryUpdate', { action: 'refresh' });
});
autoGenerateQueue.on('itemFailed', (data) => {
  wsManager.broadcast('autoGenFailed', { event: data.item.data.event, error: data.error?.message });
});

// ============================================
// 데이터 정정/삭제/이의제기 요청 — 관리자 처리
//   "Notice & Graduated Takedown" 4층(단계별 처리)
// ============================================

/**
 * 요청 목록 (상태 필터 선택)
 * GET /api/card-studio/admin/data-requests?status=received
 */
router.get('/data-requests', (req, res) => {
  try {
    const list = dataRequestService.listRequests({ status: req.query.status });
    const suppressions = dataRequestService.getActiveSuppressions();
    res.json({ success: true, data: list, suppressions, total: list.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 요청 상태 변경 (검토중/삭제/유지)
 * PATCH /api/card-studio/admin/data-requests/:ticketId
 * body: { status: 'under_review'|'search_hidden'|'corrected'|'removed'|'restored', note? }
 */
router.patch('/data-requests/:ticketId', (req, res) => {
  try {
    const { status, note } = req.body || {};
    const result = dataRequestService.updateStatus(req.params.ticketId, status, note || '');
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
