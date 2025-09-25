// 채팅 시스템 모듈
const ChatSystem = {
  // 상수
  STORAGE_KEY: 'athletetime_chat',
  USER_KEY: 'athletetime_chat_user',
  THREAD_LIFETIME: 30 * 60 * 1000, // 30분
  UPDATE_INTERVAL: 1000, // 1초마다 업데이트
  TYPING_TIMEOUT: 3000, // 3초 후 타이핑 표시 제거
  
  // 상태
  currentThread: 'main',
  currentUser: null,
  threads: {},
  typingUsers: {},
  lastUpdate: 0,
  updateTimer: null,
  
  // 육상 관련 단어 (랜덤 닉네임 생성용)
  athleticsWords: {
    adjectives: ['빠른', '강한', '민첩한', '유연한', '끈기있는', '파워풀한', '스피디한', '날렵한', '탄력있는', '지구력있는'],
    nouns: ['스프린터', '마라토너', '허들러', '점퍼', '투척선수', '육상인', '러너', '선수', '챔피언', '에이스'],
    numbers: () => Math.floor(Math.random() * 100)
  },
  
  // 초기화
  init() {
    this.loadData();
    this.initUser();
    this.initThreads();
    this.renderThreadList();
    this.selectThread('main');
    this.startUpdateLoop();
    this.initEmojis();
    this.requestNotificationPermission();
    
    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // 페이지 포커스/블러 이벤트
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 페이지가 다시 보이면 메시지 업데이트
        this.checkForNewMessages();
      }
    });
    
    // 활성 사용자 시스템 초기화
    if (typeof ActiveUsers !== 'undefined') {
      ActiveUsers.initSession();
    }
  },
  
  // 알림 권한 요청
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },
  
  // 사용자 초기화
  initUser() {
    let user = localStorage.getItem(this.USER_KEY);
    
    if (!user) {
      // 새 사용자 생성
      const nickname = this.generateRandomNickname();
      user = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        nickname: nickname,
        customNickname: null,
        createdAt: Date.now()
      };
      
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } else {
      user = JSON.parse(user);
    }
    
    this.currentUser = user;
    this.updateUserDisplay();
  },
  
  // 랜덤 닉네임 생성
  generateRandomNickname() {
    const adj = this.athleticsWords.adjectives[Math.floor(Math.random() * this.athleticsWords.adjectives.length)];
    const noun = this.athleticsWords.nouns[Math.floor(Math.random() * this.athleticsWords.nouns.length)];
    const num = this.athleticsWords.numbers();
    
    return `${adj}${noun}${num}`;
  },
  
  // 스레드 초기화
  initThreads() {
    // 메인 스레드는 항상 존재
    if (!this.threads.main) {
      this.threads.main = {
        id: 'main',
        name: '메인 채팅방',
        description: '모두가 함께하는 공간',
        icon: '🏠',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        messages: [],
        users: [],
        isPermanent: true
      };
    }
    
    // 만료된 스레드 정리
    this.cleanupExpiredThreads();
    
    // 저장
    this.saveData();
  },
  
  // 데이터 로드
  loadData() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.threads = data.threads || {};
        
        // 데이터 유효성 검증 및 복구
        Object.keys(this.threads).forEach(threadId => {
          const thread = this.threads[threadId];
          if (!thread.messages) thread.messages = [];
          if (!thread.users) thread.users = [];
          if (!thread.id) thread.id = threadId;
          if (!thread.createdAt) thread.createdAt = Date.now();
          if (!thread.lastActivity) thread.lastActivity = thread.createdAt;
        });
      }
    } catch (e) {
      console.error('데이터 로드 실패:', e);
      this.threads = {};
    }
  },
  
  // 데이터 저장
  saveData() {
    const data = {
      threads: this.threads,
      timestamp: Date.now()
    };
    
    try {
      // Set을 배열로 변환 (저장 전에)
      const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
        if (value instanceof Set) {
          return Array.from(value);
        }
        return value;
      }));
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanData));
      this.lastUpdate = Date.now();
    } catch (e) {
      console.error('Failed to save chat data:', e);
      this.handleStorageError();
    }
  },
  
  // 저장소 오류 처리
  handleStorageError() {
    // 오래된 메시지 삭제
    Object.keys(this.threads).forEach(threadId => {
      const thread = this.threads[threadId];
      if (thread.messages && thread.messages.length > 50) {
        thread.messages = thread.messages.slice(-50); // 최근 50개만 유지
      }
    });
    
    // 다시 저장 시도
    try {
      this.saveData();
    } catch (e) {
      console.error('Storage cleanup failed:', e);
      this.showToast('저장 공간 부족! 일부 오래된 메시지가 삭제됩니다.');
    }
  },
  
  // 만료된 스레드 정리
  cleanupExpiredThreads() {
    const now = Date.now();
    const expiredThreads = [];
    
    Object.keys(this.threads).forEach(threadId => {
      const thread = this.threads[threadId];
      
      // 메인 스레드는 삭제하지 않음
      if (thread.isPermanent) return;
      
      // 30분간 활동이 없으면 삭제
      if (now - thread.lastActivity > this.THREAD_LIFETIME) {
        expiredThreads.push(threadId);
      }
    });
    
    expiredThreads.forEach(threadId => {
      delete this.threads[threadId];
      
      // 현재 스레드가 삭제된 경우 메인으로 이동
      if (this.currentThread === threadId) {
        this.selectThread('main');
      }
    });
    
    if (expiredThreads.length > 0) {
      this.saveData();
      this.renderThreadList();
    }
  },
  
  // 새 스레드 생성
  createThread() {
    const nameInput = document.getElementById('threadName');
    const descInput = document.getElementById('threadDescription');
    const iconInput = document.getElementById('selectedIcon');
    
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    const icon = iconInput.value || '🏃';
    
    if (!name) {
      this.showToast('채팅방 이름을 입력해주세요');
      return;
    }
    
    const threadId = 'thread_' + Date.now();
    
    this.threads[threadId] = {
      id: threadId,
      name: name,
      description: description,
      icon: icon,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messages: [],
      users: [],
      createdBy: this.currentUser.id,
      isPermanent: false
    };
    
    // 환영 메시지
    this.threads[threadId].messages.push({
      id: Date.now(),
      type: 'system',
      content: `${this.getCurrentNickname()}님이 채팅방을 만들었습니다`,
      timestamp: Date.now()
    });
    
    // 메인 채팅방에 알림 메시지 추가
    if (this.threads.main) {
      this.threads.main.messages.push({
        id: Date.now() + 1,
        type: 'system',
        content: `🎉 새로운 채팅방 "${name}"이(가) 생성되었습니다!`,
        timestamp: Date.now()
      });
    }
    
    this.saveData();
    this.renderThreadList();
    this.selectThread(threadId);
    this.closeCreateThreadModal();
    
    this.showToast('채팅방이 생성되었습니다! 30분간 활동이 없으면 자동 삭제됩니다.');
  },
  
  // 스레드 선택
  selectThread(threadId) {
    if (!this.threads[threadId]) {
      console.error('Thread not found:', threadId);
      return;
    }
    
    // 이전 스레드에서 사용자 제거
    if (this.currentThread && this.threads[this.currentThread]) {
      const oldThread = this.threads[this.currentThread];
      const userIndex = oldThread.users.indexOf(this.currentUser.id);
      if (userIndex > -1) {
        oldThread.users.splice(userIndex, 1);
      }
    }
    
    this.currentThread = threadId;
    const thread = this.threads[threadId];
    
    // 현재 스레드에 사용자 추가
    if (!thread.users.includes(this.currentUser.id)) {
      thread.users.push(this.currentUser.id);
    }
    
    // 헤더 업데이트
    document.getElementById('currentThreadName').textContent = thread.name || '채팅방';
    document.getElementById('currentThreadUsers').textContent = thread.users.length || 1;
    
    // 메시지 렌더링
    this.renderMessages();
    
    // 스레드 목록 선택 상태 업데이트
    this.updateThreadListSelection();
    
    // 모바일에서 스레드 리스트 숨기기
    if (window.innerWidth < 768) {
      document.getElementById('threadList').classList.add('hidden');
    }
    
    // 활동 시간 업데이트
    thread.lastActivity = Date.now();
    this.saveData();
  },
  
  // 스레드 목록 선택 상태 업데이트
  updateThreadListSelection() {
    // 모든 스레드 카드에서 선택 상태 제거
    document.querySelectorAll('.thread-card').forEach(card => {
      card.classList.remove('ring-2', 'ring-purple-500', 'bg-opacity-50');
    });
    
    // 현재 선택된 스레드 하이라이트
    if (this.currentThread === 'main') {
      const mainCard = document.querySelector('.main-thread');
      if (mainCard) {
        mainCard.classList.add('ring-2', 'ring-purple-500');
      }
    } else {
      const cards = document.querySelectorAll('.thread-card');
      cards.forEach(card => {
        if (card.onclick && card.onclick.toString().includes(this.currentThread)) {
          card.classList.add('ring-2', 'ring-purple-500', 'bg-opacity-50');
        }
      });
    }
  },
  
  // 메시지 전송
  sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    const thread = this.threads[this.currentThread];
    if (!thread) return;
    
    const message = {
      id: Date.now() + Math.random(),
      userId: this.currentUser.id,
      nickname: this.getCurrentNickname(),
      content: content,
      timestamp: Date.now(),
      type: 'user'
    };
    
    thread.messages.push(message);
    thread.lastActivity = Date.now();
    
    // 사용자 목록 업데이트
    if (!thread.users.includes(this.currentUser.id)) {
      thread.users.push(this.currentUser.id);
    }
    
    this.saveData();
    this.renderMessages();
    
    // 입력창 초기화
    input.value = '';
    input.style.height = 'auto';
    
    // 스크롤 최하단으로
    this.scrollToBottom();
  },
  
  // 메시지 렌더링
  renderMessages() {
    const container = document.getElementById('messagesContainer');
    const thread = this.threads[this.currentThread];
    
    if (!thread) return;
    
    // Room Discovery Panel 표시 여부
    const roomDiscoveryPanel = document.getElementById('roomDiscoveryPanel');
    if (this.currentThread === 'main') {
      roomDiscoveryPanel.classList.remove('hidden');
      this.updateRoomDiscovery();
    } else {
      roomDiscoveryPanel.classList.add('hidden');
    }
    
    let html = '';
    
    // Room Discovery Panel을 위한 placeholder (메인 채팅방에서만)
    if (this.currentThread === 'main') {
      html = '<div id="roomDiscoveryPlaceholder"></div>';
    }
    
    // 환영 메시지
    if (thread.messages.length === 0) {
      html += `
        <div class="text-center py-8">
          <div class="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 inline-block">
            <div class="text-4xl mb-2">${thread.icon}</div>
            <h3 class="text-lg font-bold mb-2">${thread.name}</h3>
            <p class="text-sm text-gray-600">${thread.description || '대화를 시작해보세요!'}</p>
          </div>
        </div>
      `;
    }
    
    // 메시지 표시
    thread.messages.forEach(msg => {
      if (msg.type === 'system') {
        html += `
          <div class="text-center">
            <span class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              ${msg.content}
            </span>
          </div>
        `;
      } else {
        const isMe = msg.userId === this.currentUser.id;
        
        html += `
          <div class="chat-message ${isMe ? 'text-right' : ''}">
            <div class="inline-block max-w-[70%]">
              ${!isMe ? `<div class="text-xs text-gray-500 mb-1">${this.escapeHtml(msg.nickname)}</div>` : ''}
              <div class="${isMe ? 'bg-purple-500 text-white' : 'bg-white'} px-4 py-2 rounded-lg shadow-sm">
                <p class="text-sm break-words">${this.linkifyText(msg.content)}</p>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                ${this.formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        `;
      }
    });
    
    container.innerHTML = html;
    
    // Room Discovery Panel을 placeholder 위치에 이동
    if (this.currentThread === 'main' && document.getElementById('roomDiscoveryPlaceholder')) {
      const placeholder = document.getElementById('roomDiscoveryPlaceholder');
      placeholder.parentNode.replaceChild(roomDiscoveryPanel, placeholder);
    }
    
    this.scrollToBottom();
  },
  
  // 스레드 목록 렌더링
  renderThreadList() {
    const container = document.getElementById('userThreads');
    const threads = Object.values(this.threads).filter(t => !t.isPermanent);
    
    // 메인 스레드 통계 업데이트
    const mainThread = this.threads.main;
    if (mainThread) {
      document.getElementById('mainUsers').textContent = mainThread.users.length || 0;
      document.getElementById('mainMessages').textContent = mainThread.messages.length;
    }
    
    if (threads.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-400">
          <i class="fas fa-comments text-4xl mb-2"></i>
          <p class="text-sm">아직 생성된 채팅방이 없습니다</p>
        </div>
      `;
      return;
    }
    
    // 활동 시간순 정렬
    threads.sort((a, b) => b.lastActivity - a.lastActivity);
    
    let html = '';
    threads.forEach(thread => {
      const timeLeft = Math.max(0, this.THREAD_LIFETIME - (Date.now() - thread.lastActivity));
      const minutes = Math.floor(timeLeft / 60000);
      
      html += `
        <div onclick="ChatSystem.selectThread('${thread.id}')" class="thread-card p-3 hover:bg-gray-50 cursor-pointer border-b" data-thread-id="${thread.id}">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <div class="text-2xl">${thread.icon || '🏃'}</div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm truncate">${this.escapeHtml(thread.name)}</h4>
                ${thread.description ? `<p class="text-xs text-gray-500 truncate">${this.escapeHtml(thread.description)}</p>` : ''}
              </div>
            </div>
            ${minutes <= 5 ? `<span class="text-xs text-red-500 font-medium whitespace-nowrap">${minutes}분 남음</span>` : ''}
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-500 ml-10">
            <span><i class="fas fa-users"></i> ${thread.users?.length || 0}</span>
            <span><i class="fas fa-comment"></i> ${thread.messages?.length || 0}</span>
            <span><i class="fas fa-clock"></i> ${this.formatTimeAgo(thread.lastActivity)}</span>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
    // Room discovery panel도 업데이트
    if (this.currentThread === 'main') {
      this.updateRoomDiscovery();
    }
  },
  
  // Room Discovery 패널 업데이트
  updateRoomDiscovery() {
    const threads = Object.values(this.threads).filter(t => !t.isPermanent);
    
    if (threads.length === 0) {
      document.getElementById('popularRooms').innerHTML = `
        <div class="col-span-2 text-center text-xs text-gray-400 py-2">
          아직 생성된 채팅방이 없습니다
        </div>
      `;
      document.getElementById('newRooms').innerHTML = `
        <div class="col-span-2 text-center text-xs text-gray-400 py-2">
          첫 번째 채팅방을 만들어보세요!
        </div>
      `;
      
      // 통계 업데이트
      document.getElementById('totalRoomsCount').textContent = '0';
      document.getElementById('activeUsersCount').textContent = ActiveUsers ? ActiveUsers.getActiveCount() : 1;
      document.getElementById('totalMessagesCount').textContent = this.getTotalMessagesToday();
      return;
    }
    
    // 인기 채팅방 (메시지가 많은 순)
    const popularThreads = [...threads]
      .sort((a, b) => {
        // 먼저 메시지 수로 정렬
        const msgDiff = b.messages.length - a.messages.length;
        if (msgDiff !== 0) return msgDiff;
        // 메시지 수가 같으면 사용자 수로 정렬
        return (b.users?.length || 0) - (a.users?.length || 0);
      })
      .slice(0, 4);
    
    // 새로운 채팅방 (최근 생성순)
    const newThreads = [...threads]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 4);
    
    // 인기 채팅방 렌더링
    let popularHtml = '';
    if (popularThreads.length > 0) {
      popularThreads.forEach((thread, index) => {
        const timeLeft = Math.max(0, this.THREAD_LIFETIME - (Date.now() - thread.lastActivity));
        const minutes = Math.floor(timeLeft / 60000);
        const isHot = thread.messages.length >= 10 || (thread.users?.length || 0) >= 3;
        
        popularHtml += `
          <div onclick="ChatSystem.selectThread('${thread.id}')" class="room-card bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-2 hover:shadow-md">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2 flex-1">
                <div class="text-lg">${thread.icon}</div>
                <div class="flex-1 min-w-0">
                  <h5 class="text-xs font-bold truncate">${this.escapeHtml(thread.name)}</h5>
                  <div class="flex items-center gap-2 text-[10px] text-gray-600 mt-1">
                    <span><i class="fas fa-users"></i> ${thread.users?.length || 0}</span>
                    <span><i class="fas fa-comment"></i> ${thread.messages.length}</span>
                    ${minutes <= 10 ? `<span class="text-red-500 font-medium">${minutes}분</span>` : ''}
                  </div>
                </div>
              </div>
              ${isHot ? '<span class="room-badge text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">🔥</span>' : ''}
              ${index === 0 && thread.messages.length > 0 ? '<span class="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-bold">#1</span>' : ''}
            </div>
          </div>
        `;
      });
    } else {
      popularHtml = `
        <div class="col-span-2 text-center text-xs text-gray-400 py-2">
          채팅이 활발해지면 여기에 표시됩니다
        </div>
      `;
    }
    
    // 새로운 채팅방 렌더링
    let newHtml = '';
    if (newThreads.length > 0) {
      newThreads.forEach(thread => {
        const timeLeft = Math.max(0, this.THREAD_LIFETIME - (Date.now() - thread.lastActivity));
        const minutes = Math.floor(timeLeft / 60000);
        const isNew = (Date.now() - thread.createdAt) < 5 * 60000; // 5분 이내 생성
        
        newHtml += `
          <div onclick="ChatSystem.selectThread('${thread.id}')" class="room-card bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-2 hover:shadow-md ${isNew ? 'bounce-in' : ''}">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2 flex-1">
                <div class="text-lg">${thread.icon}</div>
                <div class="flex-1 min-w-0">
                  <h5 class="text-xs font-bold truncate">${this.escapeHtml(thread.name)}</h5>
                  <div class="text-[10px] text-gray-500 truncate">${thread.description || '새로운 채팅방'}</div>
                  <div class="flex items-center gap-2 text-[10px] text-gray-600 mt-1">
                    <span><i class="fas fa-clock"></i> ${this.formatTimeAgo(thread.createdAt)}</span>
                    ${minutes <= 10 ? `<span class="text-red-500 font-medium">${minutes}분 남음</span>` : ''}
                  </div>
                </div>
              </div>
              ${isNew ? '<span class="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">NEW</span>' : ''}
            </div>
          </div>
        `;
      });
    } else {
      newHtml = `
        <div class="col-span-2 text-center text-xs text-gray-400 py-2">
          새로운 채팅방을 만들어보세요!
        </div>
      `;
    }
    
    document.getElementById('popularRooms').innerHTML = popularHtml;
    document.getElementById('newRooms').innerHTML = newHtml;
    
    // 통계 업데이트
    document.getElementById('totalRoomsCount').textContent = threads.length;
    document.getElementById('activeUsersCount').textContent = ActiveUsers ? ActiveUsers.getActiveCount() : 1;
    document.getElementById('totalMessagesCount').textContent = this.getTotalMessagesToday();
  },
  
  // 오늘 총 메시지 수 계산
  getTotalMessagesToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    let totalMessages = 0;
    Object.values(this.threads).forEach(thread => {
      if (thread.messages && Array.isArray(thread.messages)) {
        thread.messages.forEach(msg => {
          if (msg && msg.timestamp >= todayTime && msg.type === 'user') {
            totalMessages++;
          }
        });
      }
    });
    
    return totalMessages;
  },
  
  // 업데이트 루프
  startUpdateLoop() {
    this.updateTimer = setInterval(() => {
      this.cleanupExpiredThreads();
      this.updateOnlineCount();
      
      // 다른 사용자의 메시지 확인
      this.checkForNewMessages();
      
      // 스레드 목록 업데이트 (시간 표시)
      this.renderThreadList();
      
      // Room Discovery 패널 업데이트 (메인 채팅방인 경우)
      if (this.currentThread === 'main' && !document.getElementById('roomDiscoveryPanel').classList.contains('hidden')) {
        this.updateRoomDiscovery();
      }
    }, this.UPDATE_INTERVAL);
  },
  
  // 새 메시지 확인
  checkForNewMessages() {
    const oldMessageCount = this.threads[this.currentThread]?.messages?.length || 0;
    
    // 데이터 다시 로드
    this.loadData();
    
    const currentThread = this.threads[this.currentThread];
    if (!currentThread) return;
    
    const newMessageCount = currentThread.messages?.length || 0;
    
    // 메시지 수가 다르면 렌더링
    if (newMessageCount !== oldMessageCount) {
      this.renderMessages();
      
      // 새 메시지가 있으면 알림
      if (newMessageCount > oldMessageCount && document.hidden) {
        const lastMessage = currentThread.messages[currentThread.messages.length - 1];
        if (lastMessage && lastMessage.userId !== this.currentUser.id) {
          // 브라우저 알림 (document.hidden일 때만)
          this.showNotification(lastMessage);
        }
      }
    }
  },
  
  // 브라우저 알림 표시
  showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('애슬리트 타임 - 새 메시지', {
        body: `${message.nickname}: ${message.content.substring(0, 50)}...`,
        icon: '/favicon.ico',
        tag: 'athletetime-chat'
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      setTimeout(() => notification.close(), 5000);
    }
  },
  
  // 온라인 수 업데이트
  updateOnlineCount() {
    const count = ActiveUsers ? ActiveUsers.getActiveCount() : 1;
    document.getElementById('onlineCount').textContent = count;
  },
  
  // 유틸리티 함수들
  getCurrentNickname() {
    if (!this.currentUser) {
      this.initUser();
    }
    return this.currentUser.customNickname || this.currentUser.nickname || '익명';
  },
  
  // HTML 이스케이프
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  // URL을 링크로 변환
  linkifyText(text) {
    if (!text) return '';
    
    // HTML 이스케이프 먼저
    text = this.escapeHtml(text);
    
    // URL 패턴
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/g;
    
    return text.replace(urlPattern, (url) => {
      return `<a href="${url}" target="_blank" class="text-blue-500 hover:underline">${url}</a>`;
    });
  },
  
  updateUserDisplay() {
    const nickname = this.getCurrentNickname();
    const nicknameEl = document.getElementById('currentNickname');
    if (nicknameEl) {
      nicknameEl.textContent = nickname;
    }
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  linkifyText(text) {
    let escaped = this.escapeHtml(text);
    
    // URL 변환
    const urlPattern = /(https?:\/\/[^\s<]+)/gi;
    escaped = escaped.replace(urlPattern, '<a href="$1" target="_blank" class="text-blue-500 underline">$1</a>');
    
    return escaped;
  },
  
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },
  
  formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  },
  
  scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  },
  
  showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  },
  
  cleanup() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
  },
  
  // 이모지 초기화
  initEmojis() {
    const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤔', '🤫', '🤭', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🤲', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '👀', '👁️', '👅', '👄', '💋', '💯', '💢', '💥', '💫', '💦', '💨', '🎈', '🎉', '🎊', '🎁', '🏃', '🏃‍♀️', '🤸', '🤸‍♀️', '⛹️', '⛹️‍♀️', '🤾', '🤾‍♀️', '🏋️', '🏋️‍♀️', '🚴', '🚴‍♀️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎯', '⚡', '🔥', '💥', '✨', '🌟', '⭐', '🌈'];
    
    const picker = document.getElementById('emojiPicker');
    picker.innerHTML = emojis.map(emoji => 
      `<button onclick="insertEmoji('${emoji}')" class="emoji-btn">${emoji}</button>`
    ).join('');
  }
};

// 전역 함수들
function toggleDiscoveryExpand(type) {
  const roomsDiv = document.getElementById(type === 'popular' ? 'popularRooms' : 'newRooms');
  const icon = document.getElementById(type === 'popular' ? 'popularExpandIcon' : 'newExpandIcon');
  
  if (roomsDiv.classList.contains('hidden')) {
    roomsDiv.classList.remove('hidden');
    icon.className = 'fas fa-chevron-down';
  } else {
    roomsDiv.classList.add('hidden');
    icon.className = 'fas fa-chevron-right';
  }
}

function goBack() {
  window.location.href = 'index.html';
}

function toggleThreadList() {
  const list = document.getElementById('threadList');
  const isHidden = list.classList.contains('hidden');
  
  if (isHidden) {
    list.classList.remove('hidden');
    // 모바일에서 배경 클릭 시 닫기를 위한 backdrop
    if (window.innerWidth < 768) {
      const backdrop = document.createElement('div');
      backdrop.id = 'threadListBackdrop';
      backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-25';
      backdrop.onclick = toggleThreadList;
      document.body.appendChild(backdrop);
    }
  } else {
    list.classList.add('hidden');
    // backdrop 제거
    const backdrop = document.getElementById('threadListBackdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }
}

function openCreateThreadModal() {
  const modal = document.getElementById('createThreadModal');
  modal.classList.remove('hidden');
  
  // 폼 초기화
  document.getElementById('threadName').value = '';
  document.getElementById('threadDescription').value = '';
  document.getElementById('selectedIcon').value = '🏃';
  
  // 기본 아이콘 선택 표시
  document.querySelectorAll('.icon-selector').forEach(btn => {
    btn.classList.remove('ring-2', 'ring-purple-500');
    if (btn.dataset.icon === '🏃') {
      btn.classList.add('ring-2', 'ring-purple-500');
    }
  });
  
  // 포커스
  setTimeout(() => {
    document.getElementById('threadName').focus();
  }, 100);
}

function closeCreateThreadModal() {
  document.getElementById('createThreadModal').classList.add('hidden');
  document.getElementById('threadName').value = '';
  document.getElementById('threadDescription').value = '';
}

function selectThread(threadId) {
  ChatSystem.selectThread(threadId);
  
  // 모바일에서 스레드 리스트 자동 닫기
  if (window.innerWidth < 768) {
    const list = document.getElementById('threadList');
    if (!list.classList.contains('hidden')) {
      toggleThreadList();
    }
  }
}

function selectThreadIcon(icon) {
  document.getElementById('selectedIcon').value = icon;
  
  // 모든 아이콘에서 선택 표시 제거
  document.querySelectorAll('.icon-selector').forEach(btn => {
    btn.classList.remove('ring-2', 'ring-purple-500', 'bg-purple-100');
  });
  
  // 현재 선택된 아이콘 표시
  const selectedBtn = document.querySelector(`.icon-selector[data-icon="${icon}"]`);
  if (selectedBtn) {
    selectedBtn.classList.add('ring-2', 'ring-purple-500', 'bg-purple-100');
  }
}

function createThread() {
  ChatSystem.createThread();
}

function sendMessage() {
  ChatSystem.sendMessage();
}

function handleMessageKeypress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function handleTyping() {
  // 입력창 높이 자동 조절
  const input = document.getElementById('messageInput');
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
}

function toggleEmoji() {
  const picker = document.getElementById('emojiPicker');
  picker.classList.toggle('hidden');
}

function insertEmoji(emoji) {
  const input = document.getElementById('messageInput');
  input.value += emoji;
  input.focus();
}

function showSettings() {
  document.getElementById('settingsModal').classList.remove('hidden');
  document.getElementById('nicknameInput').value = ChatSystem.currentUser.customNickname || '';
  ChatSystem.updateUserDisplay();
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveSettings() {
  const nicknameInput = document.getElementById('nicknameInput');
  const newNickname = nicknameInput.value.trim();
  
  if (newNickname) {
    ChatSystem.currentUser.customNickname = newNickname;
  } else {
    ChatSystem.currentUser.customNickname = null;
    ChatSystem.currentUser.nickname = ChatSystem.generateRandomNickname();
  }
  
  localStorage.setItem(ChatSystem.USER_KEY, JSON.stringify(ChatSystem.currentUser));
  ChatSystem.updateUserDisplay();
  closeSettings();
  ChatSystem.showToast('설정이 저장되었습니다');
}

function showThreadInfo() {
  const thread = ChatSystem.threads[ChatSystem.currentThread];
  if (!thread) return;
  
  const timeLeft = Math.max(0, ChatSystem.THREAD_LIFETIME - (Date.now() - thread.lastActivity));
  const minutes = Math.floor(timeLeft / 60000);
  
  let info = `${thread.name}\n`;
  if (thread.description) info += `${thread.description}\n`;
  info += `\n참여자: ${thread.users.length}명\n`;
  info += `메시지: ${thread.messages.length}개\n`;
  
  if (!thread.isPermanent) {
    info += `\n⏰ ${minutes}분 후 자동 삭제됩니다`;
  }
  
  alert(info);
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
  ChatSystem.init();
});