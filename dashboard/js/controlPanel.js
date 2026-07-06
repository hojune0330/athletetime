/**
 * 제어 패널 컴포넌트
 */

const controlPanel = {
  init() {
    const modeSelect = document.getElementById('pipeline-mode');
    if (modeSelect) {
      modeSelect.addEventListener('change', () => {
        const urlRow = document.getElementById('url-input-row');
        const inputRow = document.getElementById('input-path-row');
        if (urlRow) {
          urlRow.style.display = modeSelect.value === 'url' ? 'flex' : 'none';
        }
        if (inputRow) {
          inputRow.style.display = modeSelect.value === 'input' ? 'flex' : 'none';
        }
      });
    }
  },

  getPipelineOptions() {
    const mode = document.getElementById('pipeline-mode')?.value || 'input';
    const options = { mode };

    if (mode === 'url') {
      options.url = document.getElementById('pipeline-url')?.value || '';
      options.maxEvents = parseInt(document.getElementById('pipeline-max')?.value) || 0;
    } else if (mode === 'input') {
      options.input = document.getElementById('pipeline-input')?.value || '';
    }

    return options;
  },

  getWatcherOptions() {
    return {
      url: document.getElementById('watcher-url')?.value || '',
      interval: parseInt(document.getElementById('watcher-interval')?.value) || 300,
    };
  },

  setRunning(isRunning) {
    const btn = document.getElementById('btn-pipeline-run');
    if (btn) {
      btn.disabled = isRunning;
      btn.textContent = isRunning ? '⏳ 실행 중...' : '▶ 실행';
    }
  },
};
