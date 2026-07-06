/**
 * 템플릿 엔진 모듈
 *
 * JSON 경기 데이터를 HTML 템플릿에 동적으로 삽입합니다.
 * Mustache 스타일 치환:
 *   {{변수}} → 단순 값 치환
 *   {{#섹션}}...{{/섹션}} → 배열 반복 또는 조건부 블록
 */

const fs = require('fs');
const config = require('./config');
const { classifyEvent, needsWind, usesMeterUnit } = require('./eventClassifier');

/**
 * 경기 데이터를 템플릿에 삽입할 수 있는 형태로 가공합니다.
 * @param {Object} data - 원본 JSON 데이터
 * @returns {Object} 템플릿용 가공 데이터
 */
function prepareTemplateData(data) {
  const results = data.results || [];
  const eventName = data.event || '';
  const eventType = classifyEvent(eventName);
  const hasWind = needsWind(eventName) && data.wind && data.wind !== '-' && data.wind !== null;
  const isMeter = usesMeterUnit(eventName);

  return {
    competition: data.competition || '',
    event: eventName,
    date: data.date || '',
    venue: data.venue || '',
    wind: data.wind || '-',
    hasWind,
    recordHeader: isMeter ? '기록 (m)' : '기록',
    all_results: results,
  };
}

/**
 * Mustache 스타일 템플릿 렌더링
 *
 * @param {string} template - HTML 템플릿 문자열
 * @param {Object} data - 삽입할 데이터
 * @returns {string} 렌더링된 HTML
 */
function renderTemplate(template, data) {
  let html = template;

  // 1단계: 섹션 블록 처리 ({{#key}}...{{/key}})
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const value = data[key];

    if (value === null || value === undefined || value === false) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map(item => renderTemplate(content, item)).join('');
    }

    if (typeof value === 'object') {
      return renderTemplate(content, value);
    }

    // truthy 값이면 블록 1회 렌더링
    return renderTemplate(content, data);
  });

  // 2단계: 단순 변수 치환 ({{key}})
  html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    if (value !== undefined && value !== null) {
      return escapeHtml(String(value));
    }
    return '';
  });

  return html;
}

/**
 * HTML 특수문자 이스케이프
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 템플릿 파일을 로드하고 데이터를 삽입하여 완성된 HTML을 반환합니다.
 *
 * @param {Object} data - 경기 데이터 JSON
 * @returns {string} 완성된 HTML 문자열
 */
function buildHtml(data) {
  const templatePath = config.files.template;

  if (!fs.existsSync(templatePath)) {
    throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templatePath}`);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  const templateData = prepareTemplateData(data);
  const renderedHtml = renderTemplate(templateHtml, templateData);

  return renderedHtml;
}

module.exports = {
  prepareTemplateData,
  renderTemplate,
  buildHtml,
};
