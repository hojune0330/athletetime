/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Profile Card Modular Engine – Preset Manager               ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  프리셋 JSON을 로드, 목록 조회, 검증합니다.                    ║
 * ║  새 프리셋은 presets/ 폴더에 JSON 추가만으로 등록됩니다.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

const PRESETS_DIR = path.join(__dirname, 'presets');

// 캐시: { [id]: preset }
let _cache = null;

/**
 * 프리셋 디렉토리에서 모든 JSON을 로드합니다.
 * @param {boolean} [force=false] - 캐시 무시 후 새로 로드
 */
function loadPresets(force = false) {
  if (_cache && !force) return _cache;

  _cache = {};

  if (!fs.existsSync(PRESETS_DIR)) {
    console.warn('[PresetManager] presets directory not found:', PRESETS_DIR);
    return _cache;
  }

  const files = fs.readdirSync(PRESETS_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(PRESETS_DIR, file), 'utf-8');
      const preset = JSON.parse(raw);
      if (preset.id) {
        _cache[preset.id] = preset;
      } else {
        console.warn(`[PresetManager] Preset missing id: ${file}`);
      }
    } catch (e) {
      console.warn(`[PresetManager] Failed to load ${file}:`, e.message);
    }
  }

  console.log(`[PresetManager] Loaded ${Object.keys(_cache).length} preset(s): ${Object.keys(_cache).join(', ')}`);
  return _cache;
}

/**
 * ID로 프리셋을 가져옵니다.
 * @param {string} id
 * @returns {Object|null}
 */
function getPreset(id) {
  const presets = loadPresets();
  return presets[id] || null;
}

/**
 * 모든 프리셋 목록을 반환합니다 (UI용 요약).
 * @returns {Array<{id, name, description}>}
 */
function listPresets() {
  const presets = loadPresets();
  return Object.values(presets).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    version: p.version || '1.0.0',
  }));
}

/**
 * 프리셋이 유효한지 기본 검증합니다.
 */
function validatePreset(preset) {
  const errors = [];
  if (!preset.id)     errors.push('id is required');
  if (!preset.name)   errors.push('name is required');
  if (!preset.card)   errors.push('card config is required');
  if (!preset.layers) errors.push('layers array is required');
  if (!Array.isArray(preset.layers)) errors.push('layers must be an array');
  return { valid: errors.length === 0, errors };
}

/**
 * 캐시 초기화 (개발 중 hot-reload 시)
 */
function clearCache() {
  _cache = null;
}

module.exports = { loadPresets, getPreset, listPresets, validatePreset, clearCache, PRESETS_DIR };
