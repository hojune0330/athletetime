const express = require('express');
const fs = require('fs');
const path = require('path');

const profileCardService = require('../services/profileCardService');
const { generateLimiter, publicLimiter, searchLimiter } = require('../middleware/rateLimiter');
const { usesMeterUnit } = require('../eventClassifier');
const cardEngine = require('../card-engine');
const { sendPublicServiceError } = require('./publicErrorResponse');

const router = express.Router();

router.get('/search', searchLimiter, (req, res) => {
  const { q, type } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, error: '선수명을 2글자 이상 입력해주세요.' });
  }
  const sanitizedQuery = q.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 100);
  const validTypes = ['name', 'affiliation', 'all'];
  const searchType = validTypes.includes(type) ? type : 'name';
  const records = profileCardService.searchAthleteRecords(sanitizedQuery, searchType);
  const enrichedRecords = records.map((record) => ({
    ...record,
    recordUnit: usesMeterUnit(record.pureEvent || record.event || '') ? 'm' : '',
  }));
  return res.json({ success: true, data: enrichedRecords });
});

router.post('/generate', generateLimiter, express.json({ limit: '15mb' }), async (req, res) => {
  try {
    const { photo, photoMimeType, athleteRecord, layout, ratio, theme, comment } = req.body || {};
    if (!photo) return res.status(400).json({ success: false, error: '사진을 업로드해주세요.' });
    if (!athleteRecord || !athleteRecord.name) {
      return res.status(400).json({ success: false, error: '선수 기록을 선택해주세요.' });
    }
    const validLayouts = ['stamp', 'corner', 'fullcard', 'stamp-v2', 'corner-v2', 'fullcard-v2', 'bold-bw', 'dark-center', 'split-magazine'];
    const requestLayout = layout || 'stamp';
    if (!validLayouts.includes(requestLayout)) {
      return res.status(400).json({ success: false, error: `유효하지 않은 레이아웃: ${requestLayout}. 사용 가능: ${validLayouts.join(', ')}` });
    }
    const validRatios = ['1:1', '9:16', '4:5'];
    const requestRatio = ratio || '1:1';
    if (!validRatios.includes(requestRatio)) {
      return res.status(400).json({ success: false, error: `유효하지 않은 비율: ${requestRatio}. 사용 가능: ${validRatios.join(', ')}` });
    }
    const photoBuffer = Buffer.from(photo.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (photoBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: '사진 크기는 10MB 이하여야 합니다.' });
    }
    const result = await profileCardService.generate({
      photoBuffer,
      photoMimeType: photoMimeType || 'image/jpeg',
      athleteRecord,
      layout: requestLayout,
      ratio: requestRatio,
      theme: theme || 'dark',
      comment: comment || '',
    });
    return res.json({
      success: true,
      data: {
        image: `data:image/png;base64,${result.imageBuffer.toString('base64')}`,
        filename: result.filename,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    console.error('프로필 카드 생성 오류:', error);
    return sendPublicServiceError(res);
  }
});

router.get('/templates', publicLimiter, (req, res) => {
  try {
    const templatesDir = path.join(__dirname, '../../templates/profile-card');
    if (!fs.existsSync(templatesDir)) return res.json({ success: true, data: [] });
    const templates = fs.readdirSync(templatesDir)
      .filter((fileName) => fileName.endsWith('.html'))
      .map((fileName) => {
        const id = fileName.replace('.html', '');
        const isV2 = id.endsWith('-v2');
        const base = isV2 ? id.replace('-v2', '') : id;
        return {
          id,
          filename: fileName,
          name: base.charAt(0).toUpperCase() + base.slice(1) + (isV2 ? ' V2' : ''),
          version: isV2 ? 2 : 1,
          path: `/templates/profile-card/${fileName}`,
        };
      });
    return res.json({ success: true, data: templates });
  } catch (error) {
    return sendPublicServiceError(res);
  }
});

router.get('/layouts', publicLimiter, (req, res) => {
  return res.json({ success: true, data: profileCardService.getAvailableLayouts() });
});

router.get('/presets', publicLimiter, (req, res) => {
  return res.json({ success: true, data: profileCardService.getModularPresets() });
});

router.get('/presets/:presetId/options', publicLimiter, (req, res) => {
  const options = profileCardService.getToggleOptions(req.params.presetId);
  if (options.length === 0) {
    return res.status(404).json({ success: false, error: '프리셋을 찾을 수 없거나 토글 가능한 요소가 없습니다.' });
  }
  return res.json({ success: true, data: options });
});

router.post('/generate-modular', generateLimiter, express.json({ limit: '15mb' }), async (req, res) => {
  try {
    const { photo, photoMimeType, athleteRecord, preset, ratio, overrides, comment } = req.body || {};
    if (!photo) return res.status(400).json({ success: false, error: '사진을 업로드해주세요.' });
    if (!athleteRecord || !athleteRecord.name) {
      return res.status(400).json({ success: false, error: '선수 기록을 선택해주세요.' });
    }
    if (!preset) return res.status(400).json({ success: false, error: '프리셋을 선택해주세요.' });
    const photoBuffer = Buffer.from(photo.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (photoBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: '사진 크기는 10MB 이하여야 합니다.' });
    }
    const result = await profileCardService.generate({
      photoBuffer,
      photoMimeType: photoMimeType || 'image/jpeg',
      athleteRecord,
      layout: preset,
      ratio: ratio || '1:1',
      theme: 'dark',
      comment: comment || '',
      overrides: overrides || {},
    });
    return res.json({
      success: true,
      data: {
        image: `data:image/png;base64,${result.imageBuffer.toString('base64')}`,
        filename: result.filename,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    console.error('모듈러 카드 생성 오류:', error);
    return sendPublicServiceError(res);
  }
});

router.post('/preview-html', publicLimiter, express.json({ limit: '1mb' }), (req, res) => {
  try {
    const { preset, ratio, overrides, data } = req.body || {};
    if (!preset) return res.status(400).json({ success: false, error: '프리셋을 선택해주세요.' });
    const availablePresets = cardEngine.listPresets().map((item) => item.id);
    if (!availablePresets.includes(preset)) {
      return res.status(400).json({ success: false, error: `유효하지 않은 프리셋: ${preset}. 사용 가능: ${availablePresets.join(', ')}` });
    }
    const dimensions = cardEngine.getRatioDimensions(ratio || '1:1');
    const cardData = {
      width: dimensions.width,
      height: dimensions.height,
      photoUrl: data?.photoUrl || '',
      competition: data?.competition || '',
      event: data?.event || '',
      date: data?.date || '',
      venue: data?.venue || '',
      name: data?.name || '',
      affiliation: data?.affiliation || '',
      rank: data?.rank || '-',
      record: data?.record || '',
      recordUnit: data?.recordUnit || '',
      wind: data?.wind || '',
      hasWind: !!data?.hasWind && !!data?.wind,
      comment: data?.comment || '',
      hasComment: !!data?.comment,
    };
    return res.json({ success: true, data: { html: cardEngine.render(preset, cardData, overrides || {}) } });
  } catch (error) {
    console.error('모듈러 프리뷰 오류:', error);
    return sendPublicServiceError(res);
  }
});

module.exports = router;
