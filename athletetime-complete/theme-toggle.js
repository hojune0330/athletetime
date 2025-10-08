// 테마 토글 스크립트 - 모든 페이지에 적용
(function() {
  // 테마 토글 버튼 HTML
  const themeToggleHTML = `
    <div id="theme-toggle-container" style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 9999;
    ">
      <button id="theme-toggle" type="button" style="
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        transition: all 0.3s;
        color: white;
        font-size: 20px;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <span id="theme-icon">🌙</span>
      </button>
    </div>
  `;

  // 라이트 모드 스타일
  const lightModeStyles = `
    <style id="light-mode-styles">
      body.light-mode {
        background: #f5f5f5 !important;
        color: #333 !important;
      }
      
      .light-mode .bg-gray-900,
      .light-mode .bg-black {
        background: white !important;
      }
      
      .light-mode .bg-gray-800 {
        background: #f8f9fa !important;
      }
      
      .light-mode .text-white {
        color: #333 !important;
      }
      
      .light-mode .text-gray-300 {
        color: #666 !important;
      }
      
      .light-mode .text-gray-400 {
        color: #888 !important;
      }
      
      .light-mode .border-gray-700 {
        border-color: #ddd !important;
      }
      
      .light-mode .bg-opacity-50 {
        background-color: rgba(255, 255, 255, 0.9) !important;
      }
      
      .light-mode input,
      .light-mode select,
      .light-mode textarea {
        background: white !important;
        color: #333 !important;
        border-color: #ddd !important;
      }
      
      .light-mode .modal-content {
        background: white !important;
        color: #333 !important;
      }
      
      .light-mode .message-text {
        color: #333 !important;
      }
      
      .light-mode .chat-main,
      .light-mode .sidebar {
        background: white !important;
      }
      
      .light-mode .room-item:hover {
        background: #f0f0f0 !important;
      }
      
      .light-mode #messagesContainer {
        background: #f9f9f9 !important;
      }
    </style>
  `;

  // DOM 로드 완료 후 실행
  function initThemeToggle() {
    // 스타일과 버튼 추가
    if (!document.getElementById('light-mode-styles')) {
      document.head.insertAdjacentHTML('beforeend', lightModeStyles);
    }
    
    if (!document.getElementById('theme-toggle-container')) {
      document.body.insertAdjacentHTML('beforeend', themeToggleHTML);
    }
    
    // 저장된 테마 불러오기
    const savedTheme = localStorage.getItem('athleteTimeTheme') || 'dark';
    const themeIcon = document.getElementById('theme-icon');
    
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      if (themeIcon) themeIcon.textContent = '☀️';
    }
    
    // 토글 버튼 이벤트
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function() {
        const isLight = document.body.classList.toggle('light-mode');
        
        if (isLight) {
          themeIcon.textContent = '☀️';
          localStorage.setItem('athleteTimeTheme', 'light');
        } else {
          themeIcon.textContent = '🌙';
          localStorage.setItem('athleteTimeTheme', 'dark');
        }
        
        // 애니메이션 효과
        this.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          this.style.transform = 'rotate(0deg)';
        }, 300);
      });
    }
  }

  // DOM 로드 이벤트
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
  } else {
    initThemeToggle();
  }
})();