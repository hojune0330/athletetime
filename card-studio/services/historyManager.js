/**
 * 히스토리 관리 모듈 (Generation History Manager)
 * 
 * 생성된 이미지의 이력을 JSON 파일로 저장/조회/관리합니다.
 * 
 * v1.0.0
 */

const fs = require('fs');
const path = require('path');

const HISTORY_DIR = path.join(__dirname, '../../data/history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'generations.json');
const IMAGES_DIR = path.join(HISTORY_DIR, 'images');
const MAX_HISTORY = 500; // 최대 보관 수

// ─── 초기화 ─────────────────────────────────────

function ensureDirs() {
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function loadHistory() {
  ensureDirs();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  ensureDirs();
  // 최대 수 제한
  const trimmed = entries.slice(0, MAX_HISTORY);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}

// ─── 공개 API ───────────────────────────────────

/**
 * 새 생성 이력 추가
 * @param {object} entry - { type, event, competition, size, filename, meta }
 * @param {Buffer} imageBuffer - PNG 이미지 버퍼
 * @returns {object} 저장된 이력 항목
 */
function addEntry(entry, imageBuffer) {
  ensureDirs();
  
  const id = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const imageFilename = `${id}.png`;
  const imagePath = path.join(IMAGES_DIR, imageFilename);
  
  // 이미지 파일 저장
  if (imageBuffer) {
    fs.writeFileSync(imagePath, imageBuffer);
  }

  const historyEntry = {
    id,
    type: entry.type || 'result',          // result | schedule | notice
    event: entry.event || '',
    competition: entry.competition || '',
    size: entry.size || 'post',
    filename: entry.filename || imageFilename,
    imageFile: imageFilename,
    meta: entry.meta || {},
    createdAt: new Date().toISOString(),
  };

  const history = loadHistory();
  history.unshift(historyEntry);
  saveHistory(history);

  return historyEntry;
}

/**
 * 이력 목록 조회
 * @param {object} options - { type, limit, offset, q }
 */
function getEntries(options = {}) {
  let history = loadHistory();
  
  // 타입 필터
  if (options.type) {
    history = history.filter(h => h.type === options.type);
  }
  
  // 검색
  if (options.q) {
    const q = options.q.toLowerCase();
    history = history.filter(h => {
      const searchable = `${h.event} ${h.competition} ${h.filename}`.toLowerCase();
      return searchable.includes(q);
    });
  }

  const total = history.length;
  const offset = parseInt(options.offset) || 0;
  const limit = parseInt(options.limit) || 50;
  
  return {
    total,
    offset,
    limit,
    entries: history.slice(offset, offset + limit),
  };
}

/**
 * 개별 이력 조회
 */
function getEntry(id) {
  const history = loadHistory();
  return history.find(h => h.id === id) || null;
}

/**
 * 이미지 파일 경로 반환
 */
function getImagePath(id) {
  const entry = getEntry(id);
  if (!entry) return null;
  const imagePath = path.join(IMAGES_DIR, entry.imageFile);
  if (!fs.existsSync(imagePath)) return null;
  return imagePath;
}

/**
 * 이력 삭제
 */
function deleteEntry(id) {
  const history = loadHistory();
  const idx = history.findIndex(h => h.id === id);
  if (idx === -1) return false;
  
  // 이미지 파일도 삭제
  const entry = history[idx];
  const imagePath = path.join(IMAGES_DIR, entry.imageFile);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
  
  history.splice(idx, 1);
  saveHistory(history);
  return true;
}

/**
 * 이력 전체 초기화
 */
function clearAll() {
  ensureDirs();
  // 이미지 파일 삭제
  const files = fs.readdirSync(IMAGES_DIR);
  for (const f of files) {
    fs.unlinkSync(path.join(IMAGES_DIR, f));
  }
  saveHistory([]);
}

module.exports = {
  addEntry,
  getEntries,
  getEntry,
  getImagePath,
  deleteEntry,
  clearAll,
};
