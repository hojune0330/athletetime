/**
 * 🎨 Athlete Time 디자인 시스템 JavaScript
 * 모바일 퍼스트 UI/UX를 위한 인터랙션 라이브러리
 * Created: 2025-11-12
 */

// =============================================
// 1. UI 유틸리티
// =============================================
const UIUtils = {
  /**
   * 요소에 페이드인 애니메이션 적용
   */
  fadeIn: (element, duration = 500) => {
    element.style.opacity = '0';
    element.style.display = 'block';
    element.classList.add('animate-fadeIn');
    
    setTimeout(() => {
      element.style.opacity = '1';
    }, duration);
  },

  /**
   * 요소에 페이드아웃 애니메이션 적용
   */
  fadeOut: (element, duration = 500) => {
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.display = 'none';
    }, duration);
  },

  /**
   * 스켈레톤 로딩 생성
   */
  createSkeleton: (type = 'text', count = 3) => {
    const container = document.createElement('div');
    container.className = 'skeleton-container';
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = `skeleton skeleton-${type}`;
      container.appendChild(skeleton);
    }
    
    return container;
  },

  /**
   * 토스트 메시지 표시
   */
  showToast: (message, type = 'info', duration = 3000) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slideInRight`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    // 스타일 적용
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: type === 'success' ? 'var(--success)' : 
                  type === 'error' ? 'var(--danger)' : 
                  type === 'warning' ? 'var(--warning)' : 'var(--primary)',
      color: 'white',
      padding: '1rem 1.5rem',
      borderRadius: 'var(--rounded-lg)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      maxWidth: '90%',
      zIndex: '1300'
    });
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * 로딩 오버레이 표시
   */
  showLoading: (text = '로딩 중...') => {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>${text}</p>
      </div>
    `;
    
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1400'
    });
    
    document.body.appendChild(overlay);
  },

  /**
   * 로딩 오버레이 숨기기
   */
  hideLoading: () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
};

// =============================================
// 2. 모바일 인터랙션
// =============================================
const MobileUtils = {
  /**
   * 스와이프 제스처 감지
   */
  addSwipeDetection: (element, callbacks = {}) => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    element.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    element.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, false);
    
    const handleSwipe = () => {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const threshold = 50;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 수평 스와이프
        if (deltaX > threshold && callbacks.onSwipeRight) {
          callbacks.onSwipeRight();
        } else if (deltaX < -threshold && callbacks.onSwipeLeft) {
          callbacks.onSwipeLeft();
        }
      } else {
        // 수직 스와이프
        if (deltaY > threshold && callbacks.onSwipeDown) {
          callbacks.onSwipeDown();
        } else if (deltaY < -threshold && callbacks.onSwipeUp) {
          callbacks.onSwipeUp();
        }
      }
    };
  },

  /**
   * 풀다운 새로고침 구현
   */
  enablePullToRefresh: (callback) => {
    let startY = 0;
    let isPulling = false;
    
    const pullIndicator = document.createElement('div');
    pullIndicator.className = 'pull-to-refresh-indicator';
    pullIndicator.innerHTML = '<i class="fas fa-arrow-down"></i> 당겨서 새로고침';
    pullIndicator.style.cssText = `
      position: fixed;
      top: -60px;
      left: 0;
      right: 0;
      height: 60px;
      background: var(--primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
      z-index: 100;
    `;
    document.body.appendChild(pullIndicator);
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        isPulling = true;
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (isPulling) {
        const currentY = e.touches[0].pageY;
        const diff = currentY - startY;
        
        if (diff > 0 && diff < 150) {
          const translateY = Math.min(diff * 0.5, 60);
          pullIndicator.style.transform = `translateY(${translateY}px)`;
          
          if (translateY >= 60) {
            pullIndicator.innerHTML = '<i class="fas fa-check"></i> 놓아서 새로고침';
            pullIndicator.classList.add('ready');
          }
        }
      }
    });
    
    document.addEventListener('touchend', () => {
      if (isPulling) {
        if (pullIndicator.classList.contains('ready')) {
          if (callback) callback();
          else location.reload();
        }
        
        pullIndicator.style.transform = 'translateY(-60px)';
        pullIndicator.innerHTML = '<i class="fas fa-arrow-down"></i> 당겨서 새로고침';
        pullIndicator.classList.remove('ready');
        isPulling = false;
      }
    });
  },

  /**
   * 롱프레스 감지
   */
  addLongPress: (element, callback, duration = 500) => {
    let timer;
    
    element.addEventListener('touchstart', () => {
      timer = setTimeout(callback, duration);
    });
    
    element.addEventListener('touchend', () => {
      clearTimeout(timer);
    });
    
    element.addEventListener('touchmove', () => {
      clearTimeout(timer);
    });
  },

  /**
   * 터치 피드백 추가
   */
  addTouchFeedback: (element) => {
    element.classList.add('touch-feedback');
    
    element.addEventListener('touchstart', () => {
      element.style.transform = 'scale(0.95)';
    });
    
    element.addEventListener('touchend', () => {
      element.style.transform = 'scale(1)';
    });
  }
};

// =============================================
// 3. 성능 최적화
// =============================================
const PerformanceUtils = {
  /**
   * 지연 로딩 초기화
   */
  initLazyLoading: () => {
    const lazyElements = document.querySelectorAll('.lazy-load');
    
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            
            // 이미지인 경우
            if (element.tagName === 'IMG') {
              element.src = element.dataset.src;
              element.classList.remove('lazy-load');
            }
            // 일반 요소인 경우
            else {
              element.classList.add('loaded');
            }
            
            observer.unobserve(element);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '50px'
      });
      
      lazyElements.forEach(el => observer.observe(el));
    } else {
      // 폴백: IntersectionObserver를 지원하지 않는 브라우저
      lazyElements.forEach(el => {
        if (el.tagName === 'IMG') {
          el.src = el.dataset.src;
        }
        el.classList.add('loaded');
      });
    }
  },

  /**
   * 디바운스 함수
   */
  debounce: (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * 스로틀 함수
   */
  throttle: (func, limit = 300) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * 가상 스크롤링 초기화
   */
  initVirtualScroll: (container, items, itemHeight = 60, renderItem) => {
    const visibleItems = Math.ceil(container.clientHeight / itemHeight);
    const buffer = 5;
    
    const render = (startIndex = 0) => {
      const endIndex = Math.min(startIndex + visibleItems + buffer, items.length);
      const fragment = document.createDocumentFragment();
      
      // 상단 스페이서
      const topSpacer = document.createElement('div');
      topSpacer.style.height = `${startIndex * itemHeight}px`;
      fragment.appendChild(topSpacer);
      
      // 보이는 아이템들 렌더링
      for (let i = startIndex; i < endIndex; i++) {
        const itemElement = renderItem(items[i], i);
        itemElement.style.height = `${itemHeight}px`;
        fragment.appendChild(itemElement);
      }
      
      // 하단 스페이서
      const bottomSpacer = document.createElement('div');
      bottomSpacer.style.height = `${(items.length - endIndex) * itemHeight}px`;
      fragment.appendChild(bottomSpacer);
      
      container.innerHTML = '';
      container.appendChild(fragment);
    };
    
    // 스크롤 이벤트 처리
    container.addEventListener('scroll', PerformanceUtils.throttle(() => {
      const scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / itemHeight);
      render(startIndex);
    }, 100));
    
    // 초기 렌더링
    render();
  }
};

// =============================================
// 4. 테마 관리
// =============================================
const ThemeUtils = {
  /**
   * 다크모드 토글
   */
  toggleDarkMode: () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark);
    return isDark;
  },

  /**
   * 테마 초기화
   */
  initTheme: () => {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
      document.body.classList.add('dark-mode');
    }
    
    // 시스템 테마 감지
    if (!localStorage.getItem('darkMode') && 
        window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-mode');
    }
  },

  /**
   * 커스텀 색상 설정
   */
  setCustomColors: (colors) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }
};

// =============================================
// 5. 폼 유틸리티
// =============================================
const FormUtils = {
  /**
   * 폼 검증
   */
  validateForm: (formElement) => {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
        input.classList.add('error');
        
        // 에러 메시지 표시
        let errorMsg = input.nextElementSibling;
        if (!errorMsg || !errorMsg.classList.contains('error-message')) {
          errorMsg = document.createElement('span');
          errorMsg.className = 'error-message text-danger text-sm';
          errorMsg.textContent = '이 필드는 필수입니다.';
          input.parentNode.insertBefore(errorMsg, input.nextSibling);
        }
      } else {
        input.classList.remove('error');
        const errorMsg = input.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('error-message')) {
          errorMsg.remove();
        }
      }
    });
    
    return isValid;
  },

  /**
   * 입력 필드 포맷팅
   */
  formatInput: (input, format) => {
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      
      switch (format) {
        case 'phone':
          if (value.length > 3 && value.length <= 7) {
            value = `${value.slice(0, 3)}-${value.slice(3)}`;
          } else if (value.length > 7) {
            value = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
          }
          break;
          
        case 'time':
          if (value.length > 2) {
            value = `${value.slice(0, 2)}:${value.slice(2, 4)}`;
          }
          if (value.length > 5) {
            value = `${value.slice(0, 5)}:${value.slice(5, 7)}`;
          }
          break;
          
        case 'date':
          if (value.length > 4 && value.length <= 6) {
            value = `${value.slice(0, 4)}-${value.slice(4)}`;
          } else if (value.length > 6) {
            value = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
          }
          break;
      }
      
      e.target.value = value;
    });
  }
};

// =============================================
// 6. 애니메이션 유틸리티
// =============================================
const AnimationUtils = {
  /**
   * 숫자 카운트 애니메이션
   */
  animateNumber: (element, start, end, duration = 1000) => {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        element.textContent = end;
        clearInterval(timer);
      } else {
        element.textContent = Math.round(current);
      }
    }, 16);
  },

  /**
   * 프로그레스 바 애니메이션
   */
  animateProgress: (element, percent, duration = 1000) => {
    element.style.width = '0%';
    
    setTimeout(() => {
      element.style.transition = `width ${duration}ms ease`;
      element.style.width = `${percent}%`;
    }, 10);
  },

  /**
   * 순차적 애니메이션
   */
  staggerAnimation: (elements, className, delay = 100) => {
    elements.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add(className);
      }, index * delay);
    });
  }
};

// =============================================
// 7. 초기화 함수
// =============================================
const DesignSystem = {
  init: () => {
    // 테마 초기화
    ThemeUtils.initTheme();
    
    // 지연 로딩 초기화
    PerformanceUtils.initLazyLoading();
    
    // 모바일 터치 피드백 추가
    document.querySelectorAll('.btn, .card, .data-item').forEach(element => {
      MobileUtils.addTouchFeedback(element);
    });
    
    // FAB 메뉴 토글
    const fabMain = document.querySelector('.fab-main');
    const fabMenu = document.querySelector('.fab-menu');
    if (fabMain && fabMenu) {
      fabMain.addEventListener('click', () => {
        fabMenu.classList.toggle('active');
        fabMain.querySelector('i').classList.toggle('fa-times');
        fabMain.querySelector('i').classList.toggle('fa-plus');
      });
    }
    
    // 모바일 탭 바 활성화
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
    
    console.log('✨ Design System Initialized');
  }
};

// DOM 준비 완료시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DesignSystem.init);
} else {
  DesignSystem.init();
}

// 전역 객체로 내보내기
window.UIUtils = UIUtils;
window.MobileUtils = MobileUtils;
window.PerformanceUtils = PerformanceUtils;
window.ThemeUtils = ThemeUtils;
window.FormUtils = FormUtils;
window.AnimationUtils = AnimationUtils;
window.DesignSystem = DesignSystem;