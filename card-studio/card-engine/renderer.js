/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Profile Card Modular Engine – Layout Renderer              ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  JSON 프리셋을 받아 완전한 HTML 카드를 조립합니다.              ║
 * ║                                                              ║
 * ║  프리셋 구조:                                                 ║
 * ║  {                                                           ║
 * ║    id, name, description,                                    ║
 * ║    card: { background, ... },                                ║
 * ║    layers: [                                                 ║
 * ║      { id, type, position, style, children }                 ║
 * ║    ]                                                         ║
 * ║  }                                                           ║
 * ║                                                              ║
 * ║  레이어 타입:                                                 ║
 * ║    "component" → 단일 컴포넌트 렌더                           ║
 * ║    "group"     → children 을 감싸는 컨테이너                   ║
 * ║    "absolute"  → 절대 위치 배치 컨테이너                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const { renderComponent, styleObj } = require('./components');

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap');`;

/**
 * JSON 프리셋 + 데이터 → 완전한 HTML 문자열
 *
 * @param {Object} preset - 레이아웃 프리셋 JSON
 * @param {Object} data   - 카드 데이터 (record, name, photoUrl, …)
 * @param {Object} [overrides] - 사용자 오버라이드 (요소 on/off, 스타일 변경)
 * @returns {string} 렌더 가능한 HTML
 */
function renderCard(preset, data, overrides = {}) {
  const merged = applyOverrides(preset, overrides);
  const { card, layers } = merged;

  const width  = data.width  || 1080;
  const height = data.height || 1080;
  const ratio = height / width; // 1.0 = 1:1, 1.25 = 4:5, 1.778 = 9:16

  const cardStyle = {
    width,
    height,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter','Noto Sans KR',-apple-system,sans-serif",
    background: card.background || '#FFFFFF',
    ...(card.style || {}),
  };

  // 비율 정보를 데이터에 주입 (컴포넌트에서 활용 가능)
  const enrichedData = { ...data, _ratio: ratio, _width: width, _height: height };

  // 레이어 렌더
  const layersHtml = layers
    .filter(layer => layer.visible !== false)
    .map(layer => renderLayer(layer, enrichedData))
    .join('\n');

  // 비율별 적응형 CSS 생성
  const adaptiveCss = generateAdaptiveCss(ratio, preset.id);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}">
  <style>
    ${FONT_IMPORT}
    * { margin:0; padding:0; box-sizing:border-box; }
    body { margin:0; padding:0; background:#000; }
    ${card.css || ''}
    ${adaptiveCss}
  </style>
</head>
<body>
<div class="profile-card" style="${styleObj(cardStyle)}">
${layersHtml}
</div>
</body>
</html>`;
}

/**
 * 단일 레이어를 렌더합니다.
 */
function renderLayer(layer, data) {
  if (layer.visible === false) return '';

  const { type = 'component', componentId, style = {}, position = {}, children } = layer;

  // position → CSS 스타일 변환
  const posStyle = positionToStyle(position);
  const mergedStyle = { ...posStyle, ...style };

  if (type === 'component') {
    // 단일 컴포넌트
    const wrapper = Object.keys(mergedStyle).length > 0
      ? `<div style="${styleObj(mergedStyle)}">${renderComponent(componentId, data, layer.componentStyle || {})}</div>`
      : renderComponent(componentId, data, layer.componentStyle || {});
    return wrapper;
  }

  if (type === 'group') {
    // 자식 그룹
    const containerStyle = {
      display: 'flex',
      flexDirection: style.direction || 'column',
      gap: style.gap || 0,
      ...mergedStyle,
    };
    const inner = (children || [])
      .filter(c => c.visible !== false)
      .map(c => renderLayer(c, data))
      .join('\n');
    return `<div class="pc-group${layer.id ? ` pc-${layer.id}` : ''}" style="${styleObj(containerStyle)}">
${inner}
</div>`;
  }

  if (type === 'absolute') {
    // 절대 위치 컨테이너
    const absStyle = { position: 'absolute', zIndex: style.zIndex || 3, ...mergedStyle };
    const inner = (children || [])
      .filter(c => c.visible !== false)
      .map(c => renderLayer(c, data))
      .join('\n');
    return `<div class="pc-abs${layer.id ? ` pc-${layer.id}` : ''}" style="${styleObj(absStyle)}">
${inner}
</div>`;
  }

  if (type === 'row') {
    const rowStyle = {
      display: 'flex',
      justifyContent: style.justify || 'space-between',
      alignItems: style.align || 'flex-end',
      gap: style.gap || 0,
      ...mergedStyle,
    };
    const inner = (children || [])
      .filter(c => c.visible !== false)
      .map(c => renderLayer(c, data))
      .join('\n');
    return `<div class="pc-row${layer.id ? ` pc-${layer.id}` : ''}" style="${styleObj(rowStyle)}">
${inner}
</div>`;
  }

  return `<!-- unknown layer type: ${type} -->`;
}

/**
 * position 객체 → CSS 스타일 변환
 * position: { slot: "bottom-left", padding: [0,72,64] }
 * → { position: absolute, bottom: 0, left: 0, padding: "0 72px 64px" }
 */
function positionToStyle(pos) {
  if (!pos || Object.keys(pos).length === 0) return {};

  const s = {};

  // 슬롯 기반 배치
  if (pos.slot) {
    s.position = 'absolute';
    s.zIndex = pos.zIndex || 3;

    const slotMap = {
      'top-left':      { top: 0, left: 0 },
      'top-right':     { top: 0, right: 0 },
      'top-center':    { top: 0, left: '50%', transform: 'translateX(-50%)' },
      'bottom-left':   { bottom: 0, left: 0 },
      'bottom-right':  { bottom: 0, right: 0 },
      'bottom-center': { bottom: 0, left: '50%', transform: 'translateX(-50%)' },
      'center':        { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
      'full':          { top: 0, left: 0, right: 0, bottom: 0 },
    };

    Object.assign(s, slotMap[pos.slot] || {});
  }

  // 명시적 위치값
  if (pos.top !== undefined)    s.top = pos.top;
  if (pos.right !== undefined)  s.right = pos.right;
  if (pos.bottom !== undefined) s.bottom = pos.bottom;
  if (pos.left !== undefined)   s.left = pos.left;

  // 패딩
  if (pos.padding) {
    if (Array.isArray(pos.padding)) {
      s.padding = pos.padding.map(v => typeof v === 'number' ? `${v}px` : v).join(' ');
    } else {
      s.padding = pos.padding;
    }
  }

  if (pos.width)  s.width = pos.width;
  if (pos.height) s.height = pos.height;

  return s;
}

/**
 * 사용자 오버라이드를 프리셋에 적용합니다.
 *
 * overrides 형식:
 * {
 *   "record":      { visible: true, componentStyle: { fontSize: 160 } },
 *   "rank":        { visible: false },
 *   "wind":        { visible: true },
 *   "card":        { background: "#000" }
 * }
 */
function applyOverrides(preset, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return preset;

  const result = JSON.parse(JSON.stringify(preset)); // deep clone

  // 카드 수준 오버라이드
  if (overrides.card) {
    Object.assign(result.card, overrides.card);
  }

  // 레이어별 오버라이드 (재귀적)
  function patchLayers(layers) {
    for (const layer of layers) {
      if (layer.id && overrides[layer.id]) {
        const ov = overrides[layer.id];
        if (ov.visible !== undefined) layer.visible = ov.visible;
        if (ov.componentStyle) {
          layer.componentStyle = { ...(layer.componentStyle || {}), ...ov.componentStyle };
        }
        if (ov.style) {
          layer.style = { ...(layer.style || {}), ...ov.style };
        }
        if (ov.position) {
          layer.position = { ...(layer.position || {}), ...ov.position };
        }
      }
      if (layer.children) patchLayers(layer.children);
    }
  }

  patchLayers(result.layers);
  return result;
}

/**
 * 프리셋에서 토글 가능한 요소 목록을 추출합니다 (UI용).
 */
function getToggleableElements(preset) {
  const elements = [];

  function walk(layers) {
    for (const layer of layers) {
      if (layer.id && layer.type === 'component') {
        elements.push({
          id: layer.id,
          componentId: layer.componentId,
          visible: layer.visible !== false,
          label: layer.label || layer.id,
        });
      }
      if (layer.children) walk(layer.children);
    }
  }

  walk(preset.layers);
  return elements;
}

/**
 * 비율에 따른 적응형 CSS를 생성합니다.
 * 세로가 긴 형식(4:5, 9:16)에서 여백과 폰트를 보정합니다.
 */
function generateAdaptiveCss(ratio, presetId) {
  const rules = [];

  if (ratio > 1.1) {
    // 세로형 카드 (4:5 또는 9:16) — 하단 컨텐츠 여백 확보
    rules.push(`
      /* 세로형 적응 CSS (ratio: ${ratio.toFixed(2)}) */
      .pc-record { word-break: keep-all; }
      .pc-name { word-break: keep-all; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pc-aff { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    `);
  }

  if (ratio >= 1.7) {
    // 9:16 스토리형 — 추가 여백 및 폰트 보정
    rules.push(`
      /* 9:16 스토리형 보정 */
      .pc-rank--inline { margin-bottom: 4px; }
    `);
  }

  // split-magazine 프리셋 비율별 적응 CSS
  if (presetId === 'split-magazine') {
    if (ratio >= 1.7) {
      // 9:16: 좌우 분할 → 우측 영역이 매우 길어지므로 space-between 대신 적절한 간격 배분
      rules.push(`
        /* split-magazine 9:16 적응 */
        .pc-right-data {
          justify-content: flex-start !important;
          gap: 0px !important;
        }
        .pc-top-section { margin-bottom: auto; }
        .pc-middle-section { margin-top: auto; margin-bottom: auto; }
        .pc-bottom-section { margin-top: auto; padding-bottom: 16px; }
      `);
    } else if (ratio >= 1.2) {
      // 4:5: 약간 세로로 길어짐 — 섹션 간격 보정
      rules.push(`
        /* split-magazine 4:5 적응 */
        .pc-right-data {
          justify-content: flex-start !important;
          gap: 0px !important;
        }
        .pc-top-section { margin-bottom: auto; }
        .pc-middle-section { margin-top: auto; margin-bottom: auto; }
        .pc-bottom-section { margin-top: auto; }
      `);
    }
    // 모든 비율에서 하단 섹션 오버플로우 방지
    rules.push(`
      /* split-magazine 공통 — 오버플로우 방지 */
      .pc-right-data { overflow: hidden; }
      .pc-bottom-section { flex-shrink: 0; }
    `);
  }

  return rules.join('\n');
}

module.exports = { renderCard, renderLayer, applyOverrides, getToggleableElements };
