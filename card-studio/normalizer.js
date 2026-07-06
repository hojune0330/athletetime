/**
 * 데이터 정규화 모듈
 *
 * 스크래퍼가 수집한 raw 데이터를 카드뉴스 생성에 필요한
 * 표준 JSON 형식으로 변환합니다.
 *
 * 사용법 (CLI):
 *   node src/normalizer.js                              # data/raw/ 전체 처리
 *   node src/normalizer.js --input data/raw/파일.json   # 단일 파일
 *
 * 사용법 (모듈):
 *   const { normalizeData } = require('./normalizer');
 *   const normalized = normalizeData(rawJson);
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { classifyEvent, needsWind } = require('./eventClassifier');

/**
 * 디렉토리 생성 (없으면)
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ============================================
// 기록 정규화
// ============================================

/**
 * 다양한 기록 형식을 통일된 문자열로 정규화합니다.
 *
 * @param {string} record - 원본 기록 문자열
 * @returns {string} 정규화된 기록
 */
function normalizeRecord(record) {
  if (!record || record.trim() === '') return '-';

  let cleaned = record.trim();

  // 특수 상태 처리
  const specialStatuses = ['DNS', 'DNF', 'DQ', 'NM', 'NH', 'FOUL', '-'];
  const upper = cleaned.toUpperCase();
  for (const status of specialStatuses) {
    if (upper === status) return status;
  }

  // 단위 접미사 제거 (m, s 등)
  cleaned = cleaned.replace(/\s*(m|초|s)\s*$/i, '');

  // 쉼표 → 점 (유럽식 표기 대응)
  cleaned = cleaned.replace(/,/g, '.');

  return cleaned;
}

// ============================================
// 데이터 정규화
// ============================================

/**
 * 경기 결과 데이터를 검증하고 정규화합니다.
 *
 * @param {Object} rawData - 스크래퍼에서 추출한 raw JSON
 * @returns {Object} 정규화된 데이터
 */
function normalizeData(rawData) {
  const eventType = classifyEvent(rawData.event || '');
  const hasWind = needsWind(rawData.event || '');

  const normalized = {
    competition: rawData.competition || '알 수 없는 대회',
    event: rawData.event || '알 수 없는 종목',
    date: rawData.date || new Date().toISOString().slice(0, 10),
    venue: rawData.venue || '',
    wind: hasWind ? (rawData.wind || '-') : null,
    eventType,
    results: [],
  };

  const rawResults = rawData.results || [];

  for (let i = 0; i < rawResults.length; i++) {
    const r = rawResults[i];

    let rank = r.rank || (i + 1);
    if (typeof rank === 'string') {
      rank = parseInt(rank, 10) || (i + 1);
    }

    const name = (r.name || '').trim();
    if (!name) continue;

    normalized.results.push({
      rank,
      name,
      affiliation: (r.affiliation || r.team || '').trim(),
      record: normalizeRecord(r.record || r.result || ''),
      personal_best: normalizeRecord(r.personal_best || r.pb || ''),
    });
  }

  // 순위 기준 정렬
  normalized.results.sort((a, b) => a.rank - b.rank);

  return normalized;
}

/**
 * 정규화된 데이터의 유효성을 검사합니다.
 */
function validateData(data) {
  const errors = [];

  if (!data.competition) errors.push('대회명이 없습니다');
  if (!data.event) errors.push('종목명이 없습니다');
  if (!data.results || data.results.length === 0) errors.push('결과 데이터가 없습니다');

  for (const r of data.results || []) {
    if (!r.name) errors.push('선수명 누락');
    if (!r.record || r.record === '-') errors.push(`${r.name || '?'}: 기록 누락`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 단일 JSON 파일을 정규화하여 저장합니다.
 *
 * @param {string} inputPath - 입력 파일 경로
 * @returns {{ normalized: Object, outputPath: string }}
 */
function processFile(inputPath) {
  console.log(`📄 처리 중: ${path.basename(inputPath)}`);

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const normalized = normalizeData(raw);

  const { valid, errors } = validateData(normalized);
  if (!valid) {
    console.warn(`  ⚠️  검증 경고:`);
    errors.forEach(e => console.warn(`      - ${e}`));
  }

  ensureDir(config.dirs.normalized);
  const baseName = path.basename(inputPath, '.json');
  const outputPath = path.join(config.dirs.normalized, `${baseName}_normalized.json`);
  fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2), 'utf-8');
  console.log(`  ✅ 저장: ${outputPath}`);

  return { normalized, outputPath };
}

/**
 * data/raw/ 디렉토리의 모든 JSON 파일을 일괄 처리합니다.
 */
function processAll() {
  ensureDir(config.dirs.raw);

  const files = fs.readdirSync(config.dirs.raw).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('ℹ️  data/raw/ 에 처리할 JSON 파일이 없습니다.');
    return [];
  }

  console.log(`📂 ${files.length}개 파일 일괄 처리\n`);

  const results = [];
  for (const file of files) {
    try {
      results.push(processFile(path.join(config.dirs.raw, file)));
    } catch (error) {
      console.error(`  ❌ 처리 실패 (${file}): ${error.message}`);
    }
  }

  return results;
}

// ============================================
// CLI
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  let input = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') input = args[++i];
    if (args[i] === '--help') {
      console.log(`
사용법:
  node src/normalizer.js                             # data/raw/ 전체 처리
  node src/normalizer.js --input data/raw/파일.json  # 단일 파일
      `);
      process.exit(0);
    }
  }

  console.log('📊 데이터 정규화 프로세서\n');

  if (input) {
    const inputPath = path.resolve(input);
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${inputPath}`);
      process.exit(1);
    }
    processFile(inputPath);
  } else {
    const results = processAll();
    console.log(`\n🎉 처리 완료: ${results.length}개 파일`);
  }
}

module.exports = {
  normalizeRecord,
  normalizeData,
  validateData,
  processFile,
  processAll,
};
