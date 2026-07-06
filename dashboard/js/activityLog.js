/**
 * 활동 로그 컴포넌트
 */

const activityLog = {
  maxEntries: 100,

  add(type, message) {
    const container = document.getElementById('activity-log');
    if (!container) return;

    const time = new Date().toLocaleTimeString('ko-KR');
    const typeClass = {
      'info': 'log-entry--info',
      'success': 'log-entry--success',
      'warning': 'log-entry--warning',
      'error': 'log-entry--error',
      'new': 'log-entry--new',
    }[type] || 'log-entry--info';

    const entry = document.createElement('div');
    entry.className = `log-entry ${typeClass}`;
    entry.innerHTML = `<span class="log-time">${time}</span>${this.escapeHtml(message)}`;

    container.appendChild(entry);

    // 최대 개수 제한
    while (container.children.length > this.maxEntries) {
      container.removeChild(container.firstChild);
    }

    // 스크롤 하단으로
    container.scrollTop = container.scrollHeight;
  },

  clear() {
    const container = document.getElementById('activity-log');
    if (container) {
      container.innerHTML = '<div class="log-entry log-entry--info">로그가 초기화되었습니다.</div>';
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
