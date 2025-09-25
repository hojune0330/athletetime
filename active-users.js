// 활성 사용자 추적 시스템
const ActiveUsers = {
  STORAGE_KEY: 'athletetime_active_users',
  SESSION_KEY: 'athletetime_session',
  HEARTBEAT_INTERVAL: 30000, // 30초마다 활성 상태 업데이트
  INACTIVE_THRESHOLD: 120000, // 2분 동안 활동 없으면 비활성으로 간주
  
  // 현재 세션 초기화
  initSession() {
    let sessionId = sessionStorage.getItem(this.SESSION_KEY);
    
    if (!sessionId) {
      // 새 세션 생성
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem(this.SESSION_KEY, sessionId);
      
      // 새 사용자 등록
      this.registerUser(sessionId);
    } else {
      // 기존 세션 활성화
      this.updateActivity(sessionId);
    }
    
    // 주기적으로 활성 상태 업데이트
    this.startHeartbeat(sessionId);
    
    // 페이지 떠날 때 처리
    window.addEventListener('beforeunload', () => {
      this.removeUser(sessionId);
    });
    
    // 페이지 포커스/블러 이벤트
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setInactive(sessionId);
      } else {
        this.updateActivity(sessionId);
      }
    });
    
    // 사용자 활동 추적
    ['click', 'scroll', 'keypress', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        this.updateActivity(sessionId);
      }, { passive: true });
    });
    
    return sessionId;
  },
  
  // 사용자 등록
  registerUser(sessionId) {
    const users = this.getActiveUsers();
    
    users[sessionId] = {
      id: sessionId,
      lastActive: Date.now(),
      isActive: true,
      page: window.location.pathname,
      startTime: Date.now()
    };
    
    this.saveActiveUsers(users);
  },
  
  // 활동 업데이트
  updateActivity(sessionId) {
    const users = this.getActiveUsers();
    
    if (users[sessionId]) {
      users[sessionId].lastActive = Date.now();
      users[sessionId].isActive = true;
      users[sessionId].page = window.location.pathname;
    } else {
      this.registerUser(sessionId);
    }
    
    this.saveActiveUsers(users);
  },
  
  // 비활성 상태 설정
  setInactive(sessionId) {
    const users = this.getActiveUsers();
    
    if (users[sessionId]) {
      users[sessionId].isActive = false;
      this.saveActiveUsers(users);
    }
  },
  
  // 사용자 제거
  removeUser(sessionId) {
    const users = this.getActiveUsers();
    delete users[sessionId];
    this.saveActiveUsers(users);
  },
  
  // 활성 사용자 목록 가져오기
  getActiveUsers() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const users = saved ? JSON.parse(saved) : {};
    
    // 오래된 세션 정리
    const now = Date.now();
    Object.keys(users).forEach(id => {
      if (now - users[id].lastActive > this.INACTIVE_THRESHOLD) {
        delete users[id];
      }
    });
    
    return users;
  },
  
  // 활성 사용자 저장
  saveActiveUsers(users) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
  },
  
  // 활성 사용자 수 계산
  getActiveCount() {
    const users = this.getActiveUsers();
    const now = Date.now();
    
    // 실제 활성 사용자만 카운트 (2분 이내 활동)
    const activeUsers = Object.values(users).filter(user => 
      user.isActive && (now - user.lastActive < this.INACTIVE_THRESHOLD)
    );
    
    return activeUsers.length;
  },
  
  // 페이지별 활성 사용자
  getActiveByPage(page) {
    const users = this.getActiveUsers();
    const now = Date.now();
    
    const pageUsers = Object.values(users).filter(user => 
      user.isActive && 
      user.page === page && 
      (now - user.lastActive < this.INACTIVE_THRESHOLD)
    );
    
    return pageUsers.length;
  },
  
  // Heartbeat 시작
  startHeartbeat(sessionId) {
    // 주기적으로 활성 상태 전송
    setInterval(() => {
      if (!document.hidden) {
        this.updateActivity(sessionId);
      }
      
      // UI 업데이트 트리거 (커스텀 이벤트)
      window.dispatchEvent(new CustomEvent('activeUsersUpdate', {
        detail: { count: this.getActiveCount() }
      }));
    }, this.HEARTBEAT_INTERVAL);
  },
  
  // 통계 정보
  getStats() {
    const users = this.getActiveUsers();
    const now = Date.now();
    
    const activeUsers = Object.values(users).filter(user => 
      user.isActive && (now - user.lastActive < this.INACTIVE_THRESHOLD)
    );
    
    const stats = {
      total: activeUsers.length,
      pages: {
        '/': 0,
        '/index.html': 0,
        '/community.html': 0
      }
    };
    
    activeUsers.forEach(user => {
      const page = user.page || '/';
      if (stats.pages[page] !== undefined) {
        stats.pages[page]++;
      }
    });
    
    return stats;
  }
};

// 전역에서 사용 가능하도록
window.ActiveUsers = ActiveUsers;