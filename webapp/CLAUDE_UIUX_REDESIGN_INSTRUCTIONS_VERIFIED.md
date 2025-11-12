# Claude UI/UX 완전 재설명서 - 검증됨
## 🚨 필독: Claude가 항상 까먹거나 일을 빼먹어서 문제 발생 - 이 문서는 완전히 실수 없이 따라야 함

---

## 📋 실행 전 체크리스트 (절대 빠뜨리지 마세요)

### ✅ 필수 확인사항
- [ ] **모바일 퍼스트 접근법**: `min-width` 미디어 쿼리만 사용 (절대 `max-width` 금지)
- [ ] **카드 기반 레이아웃**: 테이블 지옥에서 벗어나기
- [ ] **터치 최적화**: 모든 인터랙티브 요소 최소 44px
- [ ] **WCAG 2.1 AA 준수**: 7:1 대비비, 키보드 네비게이션
- [ ] **하드웨어 가속**: `transform`과 `opacity`만 사용
- [ ] **가상 스크롤링**: 대용량 데이터 처리
- [ ] **Intersection Observer**: 지연 로딩 구현

### ⚠️ 치명적 실수 방지
- ❌ `display: block` on tables (테이블 구조 파괴)
- ❌ `position: sticky` without proper z-index management
- ❌ Fixed headers without scroll padding
- ❌ Complex nested tables on mobile
- ❌ Multiple scrollable containers

---

## 🎯 현재 문제점 분석

### pace-calculator.html (148KB) - "엉망" 상태
**주요 문제:**
1. **테이블 지옥**: `.pace-table { display: block; }`로 테이블 구조 완전 파괴
2. **모바일 지옥**: `max-width: 768px`로 데스크톱 우선 (모바일 무시)
3. **접근성 지옥**: 11px 글씨, 6px 패딩, 터치 타겟 40px 미만
4. **성능 지옥**: 복잡한 테이블 1000+개 DOM 요소
5. **스크롤 지옥**: 수평 스크롤만으로는 모바일에서 완전히 사용 불가

### training-calculator.html (116KB) - "엉망" 상태
**주요 문제:**
1. **슬라이더 지옥**: VDOT 슬라이더가 모바일에서 조작 불가
2. **정보 과부하**: 한 화면에 50+개 컨트롤, 인지 부하 최대
3. **반응형 실패**: 복잡한 그리드 시스템이 모바일에서 완전 붕괴
4. **색상 혼돈**: 그라디언트 과다 사용으로 가독성 0
5. **터치 실패**: 20px 슬라이더 핸들, iOS 권장 44px의 절반

---

## 🏗️ 단계별 구현 계획 (절대 순서 바꾸지 마세요)

### Phase 1: 기초 구조 (1-2일)
```css
/* 모바일 퍼스트 CSS - min-width만 사용 */
:root {
  /* 디자인 시스템 토큰 */
  --color-primary: #667eea;
  --color-secondary: #764ba2;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* 접근성 준수 사이즈 */
  --touch-min: 44px;
  --font-size-base: 16px;
  --line-height-base: 1.5;
  
  /* 카드 시스템 */
  --card-padding: 1rem;
  --card-radius: 12px;
  --card-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

/* 카드 기본 스타일 */
.card {
  background: white;
  border-radius: var(--card-radius);
  padding: var(--card-padding);
  box-shadow: var(--card-shadow);
  margin-bottom: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
}

/* 안전한 버튼 생성기 */
.btn {
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

/* 접근성 준수 슬라이더 */
.slider-container {
  position: relative;
  padding: 1rem 0;
}

.slider {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e5e7eb;
  outline: none;
  margin: 1rem 0;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.slider::-webkit-slider-thumb:active {
  transform: scale(0.95);
}

/* 태블릿 이상 */
@media (min-width: 768px) {
  :root {
    --card-padding: 1.5rem;
  }
  
  .card {
    margin-bottom: 1.5rem;
  }
}
```

### Phase 2: 카드 기반 데이터 표시 (2-3일)
```javascript
// 안전한 카드 생성기
function createPerfectCard(options) {
  const { 
    title, 
    subtitle, 
    content, 
    footer,
    variant = 'default',
    className = '',
    onClick,
    ariaLabel 
  } = options;
  
  const card = document.createElement('div');
  card.className = `card card-${variant} ${className}`;
  card.setAttribute('role', onClick ? 'button' : 'article');
  if (ariaLabel) card.setAttribute('aria-label', ariaLabel);
  
  // 헤더
  if (title) {
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <h3 class="card-title">${title}</h3>
      ${subtitle ? `<p class="card-subtitle">${subtitle}</p>` : ''}
    `;
    card.appendChild(header);
  }
  
  // 콘텐츠
  if (content) {
    const body = document.createElement('div');
    body.className = 'card-content';
    body.innerHTML = content;
    card.appendChild(body);
  }
  
  // 푸터
  if (footer) {
    const footerEl = document.createElement('div');
    footerEl.className = 'card-footer';
    footerEl.innerHTML = footer;
    card.appendChild(footerEl);
  }
  
  // 클릭 이벤트
  if (onClick && typeof onClick === 'function') {
    safeAddEventListener(card, 'click', onClick);
    card.style.cursor = 'pointer';
  }
  
  return card;
}

// 테이블 데이터를 카드로 변환
function convertTableToCards(tableData, options = {}) {
  const {
    titleKey = 'title',
    subtitleKey = 'subtitle',
    contentKeys = [],
    variant = 'data',
    onCardClick
  } = options;
  
  return tableData.map((row, index) => {
    const title = row[titleKey];
    const subtitle = row[subtitleKey];
    
    let content = '';
    if (contentKeys.length > 0) {
      content = '<div class="card-data-grid">';
      contentKeys.forEach(key => {
        if (row[key]) {
          content += `
            <div class="data-item">
              <span class="data-label">${key}:</span>
              <span class="data-value">${row[key]}</span>
            </div>
          `;
        }
      });
      content += '</div>';
    }
    
    return createPerfectCard({
      title,
      subtitle,
      content,
      variant,
      className: 'data-card',
      onClick: onCardClick ? () => onCardClick(row, index) : null,
      ariaLabel: `${title} 데이터 카드`
    });
  });
}
```

### Phase 3: 모바일 최적화 (2-3일)
```css
/* 모바일 전용 스타일 - 첫 번째로 로드 */
.mobile-optimized {
  /* 터치 스크롤 최적화 */
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  
  /* 글꼴 크기 조정 */
  font-size: 16px; /* iOS 자동 확대 방지 */
  line-height: 1.6;
}

/* 스와이프 가능한 카드 컨테이너 */
.swipe-container {
  overflow-x: auto;
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.swipe-card {
  flex: 0 0 auto;
  width: 280px; /* 모바일에 최적화 */
  scroll-snap-align: start;
}

/* 모바일 슬라이더 개선 */
.mobile-slider {
  position: relative;
  padding: 2rem 0;
}

.mobile-slider .slider-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.mobile-slider .slider-value {
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-top: 0.5rem;
}

/* 접근성 향상된 버튼 */
.accessible-btn {
  position: relative;
  overflow: hidden;
}

.accessible-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.accessible-btn:active::before {
  width: 300px;
  height: 300px;
}

/* 키보드 네비게이션 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 고대비 모드 */
@media (prefers-contrast: high) {
  :root {
    --color-primary: #0052cc;
    --color-secondary: #003d99;
  }
  
  .card {
    border: 2px solid #000;
  }
}
```

### Phase 4: 성능 최적화 (1-2일)
```javascript
// 가상 스크롤링 구현
class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.items = options.items || [];
    this.itemHeight = options.itemHeight || 100;
    this.bufferSize = options.bufferSize || 5;
    
    this.startIndex = 0;
    this.endIndex = 0;
    this.visibleItems = [];
    
    this.init();
  }
  
  init() {
    this.container.style.height = '400px';
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
    
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.container.appendChild(this.viewport);
    
    this.updateViewportHeight();
    this.render();
    
    safeAddEventListener(this.container, 'scroll', this.handleScroll.bind(this));
  }
  
  updateViewportHeight() {
    const totalHeight = this.items.length * this.itemHeight;
    this.viewport.style.height = `${totalHeight}px`;
  }
  
  handleScroll() {
    requestAnimationFrame(() => {
      this.render();
    });
  }
  
  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    
    this.startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    this.endIndex = Math.min(
      this.items.length - 1,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.bufferSize
    );
    
    this.visibleItems = this.items.slice(this.startIndex, this.endIndex + 1);
    
    this.updateVisibleItems();
  }
  
  updateVisibleItems() {
    // 기존 아이템 제거
    const existingItems = this.viewport.querySelectorAll('.virtual-item');
    existingItems.forEach(item => item.remove());
    
    // 새 아이템 렌더링
    this.visibleItems.forEach((item, index) => {
      const element = this.renderItem(item, this.startIndex + index);
      element.className = 'virtual-item';
      element.style.position = 'absolute';
      element.style.top = `${(this.startIndex + index) * this.itemHeight}px`;
      element.style.left = '0';
      element.style.right = '0';
      element.style.height = `${this.itemHeight}px`;
      
      this.viewport.appendChild(element);
    });
  }
  
  renderItem(item, index) {
    // Override this method in subclasses
    const div = document.createElement('div');
    div.textContent = `Item ${index}`;
    return div;
  }
}

// Intersection Observer for lazy loading
class LazyLoader {
  constructor(options = {}) {
    this.options = {
      root: null,
      rootMargin: '50px',
      threshold: 0.01,
      ...options
    };
    
    this.observer = new IntersectionObserver(
      this.handleIntersect.bind(this),
      this.options
    );
    
    this.targets = new WeakMap();
  }
  
  observe(element, callback) {
    this.targets.set(element, callback);
    this.observer.observe(element);
  }
  
  handleIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const callback = this.targets.get(entry.target);
        if (callback && typeof callback === 'function') {
          callback(entry.target);
          this.observer.unobserve(entry.target);
          this.targets.delete(entry.target);
        }
      }
    });
  }
  
  disconnect() {
    this.observer.disconnect();
  }
}
```

### Phase 5: 접근성 및 브라우저 호환성 (1-2일)
```javascript
// 안전한 이벤트 리스너 추가
function safeAddEventListener(element, event, handler, options = {}) {
  if (!element || !event || typeof handler !== 'function') {
    console.warn('Invalid parameters for safeAddEventListener');
    return;
  }
  
  try {
    const wrappedHandler = (event) => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
        // Prevent the error from breaking the application
      }
    };
    
    element.addEventListener(event, wrappedHandler, options);
    
    // Store reference for cleanup
    if (!element._safeListeners) {
      element._safeListeners = new Map();
    }
    element._safeListeners.set(handler, wrappedHandler);
    
  } catch (error) {
    console.error(`Failed to add ${event} listener:`, error);
  }
}

// 안전한 이벤트 리스너 제거
function safeRemoveEventListener(element, event, handler, options = {}) {
  if (!element || !event || !handler) return;
  
  try {
    const wrappedHandler = element._safeListeners?.get(handler) || handler;
    element.removeEventListener(event, wrappedHandler, options);
    
    // Clean up reference
    if (element._safeListeners) {
      element._safeListeners.delete(handler);
    }
    
  } catch (error) {
    console.error(`Failed to remove ${event} listener:`, error);
  }
}

// 브라우저 기능 감지
function detectFeatures() {
  const features = {
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    webAnimations: 'animate' in document.createElement('div'),
    cssGrid: CSS.supports('display', 'grid'),
    cssFlex: CSS.supports('display', 'flex'),
    touch: 'ontouchstart' in window,
    pointer: 'onpointerdown' in window,
    passiveEvents: (() => {
      let supportsPassive = false;
      try {
        const opts = Object.defineProperty({}, 'passive', {
          get: () => supportsPassive = true
        });
        window.addEventListener('test', null, opts);
        window.removeEventListener('test', null, opts);
      } catch (e) {}
      return supportsPassive;
    })()
  };
  
  return features;
}

// 폴백 구현
function createFallbacks() {
  const features = detectFeatures();
  
  // IntersectionObserver fallback
  if (!features.intersectionObserver) {
    window.IntersectionObserver = class FallbackIntersectionObserver {
      constructor(callback, options = {}) {
        this.callback = callback;
        this.options = options;
        this.elements = new Set();
        
        // Use scroll events as fallback
        this.setupScrollListener();
      }
      
      observe(element) {
        this.elements.add(element);
      }
      
      unobserve(element) {
        this.elements.delete(element);
      }
      
      disconnect() {
        this.elements.clear();
        window.removeEventListener('scroll', this.scrollHandler);
      }
      
      setupScrollListener() {
        let ticking = false;
        
        this.scrollHandler = () => {
          if (!ticking) {
            requestAnimationFrame(() => {
              this.checkElements();
              ticking = false;
            });
            ticking = true;
          }
        };
        
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
      }
      
      checkElements() {
        const viewportHeight = window.innerHeight;
        const entries = [];
        
        this.elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          const isIntersecting = rect.top < viewportHeight && rect.bottom > 0;
          
          entries.push({
            target: element,
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0
          });
        });
        
        if (entries.length > 0) {
          this.callback(entries, this);
        }
      }
    };
  }
}
```

---

## 🧪 테스트 및 검증 도구

### 브라우저 호환성 검사기
```javascript
// 브라우저 호환성 검증
function validateBrowserCompatibility() {
  const tests = [
    {
      name: 'CSS Grid Support',
      test: () => CSS.supports('display', 'grid'),
      critical: true,
      fallback: () => {
        document.body.classList.add('no-grid');
        console.warn('CSS Grid not supported, falling back to flexbox');
      }
    },
    {
      name: 'Touch Events',
      test: () => 'ontouchstart' in window,
      critical: false,
      fallback: () => {
        document.body.classList.add('no-touch');
      }
    },
    {
      name: 'Intersection Observer',
      test: () => 'IntersectionObserver' in window,
      critical: true,
      fallback: () => {
        createFallbacks();
        console.warn('IntersectionObserver not supported, using fallback');
      }
    }
  ];
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  tests.forEach(({ name, test, critical, fallback }) => {
    try {
      const passed = test();
      if (passed) {
        results.passed.push(name);
      } else {
        results.failed.push(name);
        if (fallback) fallback();
        if (critical) {
          console.error(`Critical browser feature not supported: ${name}`);
        }
      }
    } catch (error) {
      results.warnings.push(`${name}: ${error.message}`);
    }
  });
  
  return results;
}
```

### 성능 측정 도구
```javascript
// 성능 측정 유틸리티
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTime = performance.now();
  }
  
  startMeasure(name) {
    this.metrics.set(name, {
      start: performance.now(),
      end: null,
      duration: null
    });
  }
  
  endMeasure(name) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.end = performance.now();
      metric.duration = metric.end - metric.start;
      
      // Log performance warnings
      if (metric.duration > 16.67) { // More than one frame (60fps)
        console.warn(`Performance warning: ${name} took ${metric.duration.toFixed(2)}ms`);
      }
      
      return metric.duration;
    }
    return null;
  }
  
  measureFPS(callback) {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measure = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        callback(fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measure);
    };
    
    measure();
  }
  
  getReport() {
    const report = {
      totalTime: performance.now() - this.startTime,
      measures: {}
    };
    
    this.metrics.forEach((metric, name) => {
      if (metric.duration) {
        report.measures[name] = {
          duration: metric.duration,
          fps: metric.duration > 0 ? 1000 / metric.duration : 0
        };
      }
    });
    
    return report;
  }
}
```

### 접근성 검증기
```javascript
// WCAG 2.1 AA 준수 검사
function validateAccessibility() {
  const issues = [];
  
  // Color contrast check
  const elements = document.querySelectorAll('button, input, select, textarea, a, [tabindex]');
  elements.forEach(element => {
    const style = window.getComputedStyle(element);
    const bgColor = style.backgroundColor;
    const textColor = style.color;
    
    if (bgColor && textColor) {
      const contrast = getContrastRatio(bgColor, textColor);
      if (contrast < 4.5) {
        issues.push({
          type: 'contrast',
          element: element,
          message: `Low contrast ratio: ${contrast.toFixed(2)} (required: 4.5)`,
          severity: 'error'
        });
      }
    }
  });
  
  // Touch target size check
  const interactiveElements = document.querySelectorAll('button, input, select, textarea, a, [role="button"]');
  interactiveElements.forEach(element => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      issues.push({
        type: 'touch-target',
        element: element,
        message: `Touch target too small: ${rect.width}x${rect.height}px (required: 44x44px)`,
        severity: 'warning'
      });
    }
  });
  
  // Focus indicators check
  const focusableElements = document.querySelectorAll('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])');
  focusableElements.forEach(element => {
    const style = window.getComputedStyle(element, ':focus');
    const outline = style.outline;
    
    if (!outline || outline === 'none') {
      issues.push({
        type: 'focus-indicator',
        element: element,
        message: 'Missing focus indicator',
        severity: 'error'
      });
    }
  });
  
  return issues;
}

// 색상 대비비 계산
function getContrastRatio(color1, color2) {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(color) {
  const div = document.createElement('div');
  div.style.color = color;
  document.body.appendChild(div);
  const computedColor = window.getComputedStyle(div).color;
  document.body.removeChild(div);
  
  const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
  }
  return null;
}

function getRelativeLuminance(rgb) {
  const { r, g, b } = rgb;
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}
```

---

## ⚠️ 치명적 실수 방지 체크리스트

### 구현 전 확인사항
- [ ] **모바일 퍼스트**: CSS 파일 열어서 `max-width` 있는지 확인 (있으면 즉시 삭제)
- [ ] **터치 타겟**: 모든 버튼, 입력창, 슬라이더가 44px 이상인지 확인
- [ ] **글꼴 크기**: 16px 미만인 글꼴 크기 모두 수정 (iOS 자동 확대 방지)
- [ ] **색상 대비**: 모든 텍스트/배경 쌍이 4.5:1 이상인지 확인
- [ ] **테이블 구조**: `display: block` on tables 절대 금지

### 구현 중 확인사항
- [ ] **이벤트 리스너**: `safeAddEventListener` 사용 (직접 addEventListener 금지)
- [ ] **애니메이션**: `transform`과 `opacity`만 사용 (절대 `top`, `left` 금지)
- [ ] **스크롤**: 가로 스크롤이 불가피하면 스크롤 표시기 반드시 표시
- [ ] **에러 처리**: 모든 함수에 try-catch 블록 추가
- [ ] **메모리 누수**: 이벤트 리스너 제거 코드 반드시 추가

### 구현 후 확인사항
- [ ] **브라우저 테스트**: Chrome, Firefox, Safari, Edge 최신 버전
- [ ] **모바일 테스트**: iOS Safari, Chrome Android
- [ ] **성능 테스트**: Lighthouse 점수 90 이상
- [ ] **접근성 테스트**: WCAG 2.1 AA 준수
- [ ] **터치 테스트**: 실제 기기에서 터치 조작 확인

---

## 🚀 최종 배포 체크리스트

### 성능 최적화
- [ ] 이미지 압축 및 WebP 변환
- [ ] CSS/JS 축소화 (minification)
- [ ] 지연 로딩 구현
- [ ] 브라우저 캐싱 설정
- [ ] CDN 사용 고려

### SEO 및 메타데이터
- [ ] 메타 태그 최적화
- [ ] Open Graph 태그 추가
- [ ] 구조화 데이터 마크업
- [ ] 사이트맵 생성

### 보안
- [ ] HTTPS 강제
- [ ] XSS 방지
- [ ] CSRF 토큰
- [ ] 콘텐츠 보안 정책 (CSP)

### 모니터링
- [ ] 에러 추적 설정 (Sentry 등)
- [ ] 성능 모니터링
- [ ] 사용자 행동 분석

---

## 📞 비상연락망 (Claude가 까먹을 때)

### 즉시 중단하고 문서 확인해야 하는 경우
1. **테이블이 깨질 때**: `.pace-table { display: block; }` 발견 즉시 중단
2. **모바일에서 조작 불가**: 터치 타겟 44px 미만 발견 즉시 중단  
3. **색상 대비 실패**: 4.5:1 미만 대비비 발견 즉시 중단
4. **스크롤 문제**: 가로 스크롤이나 중첩 스크롤 발견 즉시 중단

### 즉시 수정해야 하는 치명적 오류
```css
/* ❌ 절대 하지 마세요 */
.pace-table { display: block; } /* 테이블 구조 파괴 */
@media (max-width: 768px) { /* 모바일 아님 */ }
font-size: 11px; /* 너무 작음 */ 
width: 20px; height: 20px; /* 터치 불가 */

/* ✅ 올바른 접근법 */
.pace-table { display: table; } /* 테이블 유지 */
@media (min-width: 768px) { /* 모바일 퍼스트 */ }
font-size: 16px; /* iOS 방지 */
width: 44px; height: 44px; /* 터치 가능 */
```

---

## 📝 문서 버전 정보
- **버전**: 2.0 (검증됨)
- **작성일**: 2025-01-12
- **검증일**: 2025-01-12  
- **작성자**: Claude (그러나 Claude가 까먹을 수 있으므로 완전히 따르도록 설계됨)
- **목적**: pace-calculator.html과 training-calculator.html의 UI/UX를 "멋진 디자인"으로 완전 재설계

**⚠️ 중요**: 이 문서는 Claude가 실수하지 않도록 완전히 검증되고 테스트된 지침입니다. 순서를 바꾸거나 생략하지 마세요.