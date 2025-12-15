/**
 * 네비게이션 시스템 JavaScript
 */

// 네비게이션 HTML 생성 및 삽입
function initNavigation() {
    // 현재 페이지 확인
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // 네비게이션 HTML
    const navHTML = `
        <!-- 상단 네비게이션 바 -->
        <nav class="top-navbar" id="topNavbar">
            <div class="navbar-container">
                <a href="index.html" class="navbar-brand">
                    <i class="fas fa-running"></i>
                    <span>Athlete Time</span>
                </a>
                
                <div class="navbar-menu">
                    <a href="index.html" class="navbar-item ${currentPage === 'index.html' ? 'active' : ''}">
                        홈
                    </a>
                    <a href="pace-calculator.html" class="navbar-item ${currentPage === 'pace-calculator.html' ? 'active' : ''}">
                        페이스 계산기
                    </a>
                    <a href="training-calculator.html" class="navbar-item ${currentPage === 'training-calculator.html' ? 'active' : ''}">
                        훈련 계산기
                    </a>
                    <a href="competitions-calendar.html" class="navbar-item ${currentPage === 'competitions-calendar.html' ? 'active' : ''}">
                        대회 일정
                    </a>
                </div>
                
                <button class="mobile-menu-btn" id="mobileMenuBtn">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </nav>
        
        <!-- 모바일 드로어 메뉴 -->
        <div class="mobile-drawer" id="mobileDrawer">
            <div class="drawer-menu">
                <a href="index.html" class="drawer-item ${currentPage === 'index.html' ? 'active' : ''}">
                    <i class="fas fa-home"></i>
                    <span>홈</span>
                </a>
                <a href="pace-calculator.html" class="drawer-item ${currentPage === 'pace-calculator.html' ? 'active' : ''}">
                    <i class="fas fa-calculator"></i>
                    <span>페이스 계산기</span>
                </a>
                <a href="training-calculator.html" class="drawer-item ${currentPage === 'training-calculator.html' ? 'active' : ''}">
                    <i class="fas fa-chart-line"></i>
                    <span>훈련 계산기</span>
                </a>
                <a href="competitions-calendar.html" class="drawer-item ${currentPage === 'competitions-calendar.html' ? 'active' : ''}">
                    <i class="fas fa-calendar"></i>
                    <span>대회 일정</span>
                </a>
                <a href="chat.html" class="drawer-item ${currentPage === 'chat.html' ? 'active' : ''}">
                    <i class="fas fa-comments"></i>
                    <span>커뮤니티</span>
                </a>
                <hr style="margin: 1rem 0; border: none; border-top: 1px solid var(--neutral-200);">
                <button class="drawer-item" onclick="toggleDarkMode()">
                    <i class="fas fa-moon"></i>
                    <span>다크모드</span>
                </button>
                <a href="#settings" class="drawer-item">
                    <i class="fas fa-cog"></i>
                    <span>설정</span>
                </a>
            </div>
        </div>
        
        <!-- 오버레이 -->
        <div class="drawer-overlay" id="drawerOverlay"></div>
    `;
    
    // body 시작 부분에 삽입
    document.body.insertAdjacentHTML('afterbegin', navHTML);
    document.body.classList.add('has-navbar');
    
    // 네비게이션 CSS 로드
    if (!document.querySelector('link[href="navigation.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'navigation.css';
        document.head.appendChild(link);
    }
    
    // 이벤트 리스너 설정
    setupNavigationEvents();
}

// 네비게이션 이벤트 설정
function setupNavigationEvents() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    
    // 모바일 메뉴 토글
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            toggleMobileMenu();
        });
    }
    
    // 오버레이 클릭 시 메뉴 닫기
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', () => {
            closeMobileMenu();
        });
    }
    
    // 스크롤 시 네비게이션 숨기기/보이기
    let lastScrollTop = 0;
    let scrollTimer = null;
    
    window.addEventListener('scroll', () => {
        if (scrollTimer !== null) {
            clearTimeout(scrollTimer);
        }
        
        scrollTimer = setTimeout(() => {
            const navbar = document.getElementById('topNavbar');
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // 아래로 스크롤 - 네비게이션 숨기기
                navbar.classList.add('hidden');
            } else {
                // 위로 스크롤 - 네비게이션 보이기
                navbar.classList.remove('hidden');
            }
            
            lastScrollTop = scrollTop;
        }, 100);
    });
    
    // ESC 키로 메뉴 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });
}

// 모바일 메뉴 토글
function toggleMobileMenu() {
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const menuBtn = document.getElementById('mobileMenuBtn');
    
    if (mobileDrawer.classList.contains('open')) {
        closeMobileMenu();
    } else {
        mobileDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
        menuBtn.innerHTML = '<i class="fas fa-times"></i>';
        document.body.style.overflow = 'hidden';
    }
}

// 모바일 메뉴 닫기
function closeMobileMenu() {
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const menuBtn = document.getElementById('mobileMenuBtn');
    
    mobileDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.style.overflow = '';
}

// 다크모드 토글 (임시)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    if (window.UIUtils) {
        window.UIUtils.showToast(isDark ? '다크모드 활성화' : '라이트모드 활성화', 'success');
    }
}

// 페이지 로드 시 네비게이션 초기화
document.addEventListener('DOMContentLoaded', initNavigation);