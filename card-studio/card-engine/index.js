/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Profile Card Modular Engine – Main Entry                   ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║                                                              ║
 * ║  사용법:                                                     ║
 * ║                                                              ║
 * ║  const cardEngine = require('./card-engine');                ║
 * ║                                                              ║
 * ║  // 1. 프리셋 목록 조회                                      ║
 * ║  cardEngine.listPresets();                                   ║
 * ║                                                              ║
 * ║  // 2. 프리셋으로 카드 HTML 생성                              ║
 * ║  const html = cardEngine.render('bold-bw', data);            ║
 * ║                                                              ║
 * ║  // 3. 사용자 오버라이드 (요소 on/off, 스타일 변경)            ║
 * ║  const html = cardEngine.render('bold-bw', data, {           ║
 * ║    rank:  { visible: false },                                ║
 * ║    wind:  { visible: false },                                ║
 * ║    record: { componentStyle: { fontSize: 180 } }             ║
 * ║  });                                                         ║
 * ║                                                              ║
 * ║  // 4. 토글 가능한 요소 목록                                  ║
 * ║  cardEngine.getToggleOptions('bold-bw');                     ║
 * ║                                                              ║
 * ║  // 5. 커스텀 컴포넌트 등록                                   ║
 * ║  cardEngine.registerComponent('myComp', (data, style) =>    ║
 * ║    `<div>Custom: ${data.name}</div>`                        ║
 * ║  );                                                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const { renderCard, getToggleableElements } = require('./renderer');
const { getPreset, listPresets, loadPresets, validatePreset, clearCache } = require('./presetManager');
const { registerComponent, COMPONENTS } = require('./components');

const RATIOS = {
  '1:1':  { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '4:5':  { width: 1080, height: 1350 },
};

/**
 * 프리셋 ID + 데이터 → 완전한 HTML
 *
 * @param {string} presetId   - 프리셋 ID (bold-bw, dark-center, split-magazine 등)
 * @param {Object} data       - 카드 데이터
 * @param {Object} [overrides] - 사용자 오버라이드
 * @returns {string} HTML
 */
function render(presetId, data, overrides = {}) {
  const preset = getPreset(presetId);
  if (!preset) {
    throw new Error(`[CardEngine] Unknown preset: ${presetId}. Available: ${listPresets().map(p => p.id).join(', ')}`);
  }
  return renderCard(preset, data, overrides);
}

/**
 * 프리셋의 토글 가능한 요소 목록
 */
function getToggleOptions(presetId) {
  const preset = getPreset(presetId);
  if (!preset) return [];
  return getToggleableElements(preset);
}

/**
 * 비율 문자열 → 치수
 */
function getRatioDimensions(ratio) {
  return RATIOS[ratio] || RATIOS['1:1'];
}

// 초기 로드
loadPresets();

module.exports = {
  render,
  listPresets,
  getPreset,
  getToggleOptions,
  getRatioDimensions,
  registerComponent,
  validatePreset,
  clearCache,
  reloadPresets: () => loadPresets(true),
  COMPONENTS,
  RATIOS,
};
