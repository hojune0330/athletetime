// 모바일 최적화 채팅 시스템
const MobileChatSystem = {
  // 상수
  STORAGE_KEY: 'athlete-time_chat',
  USER_KEY: 'athlete-time_chat_user',
  THREAD_LIFETIME: 30 * 60 * 1000, // 30분
  UPDATE_INTERVAL: 1000,
  
  // 상태
  currentRoom: 'main',
  currentUser: null,
  rooms: {},
  lastUpdate: 0,
  updateTimer: null,
  soundEnabled: false,
  
  // 육상 관련 랜덤 닉네임 생성용
  nicknameParts: {
    adjectives: ['빠른', '강한', '민첩한', '유연한', '끈기있는', '파워풀한', '스피디한', '날렵한', '탄력있는', '지구력있는'],
    nouns: ['스프린터', '마라토너', '허들러', '점퍼', '투척선수', '육상인', '러너', '선수', '챔피언', '에이스']
  },
  
  // 초기화
  init() {
    this.loadData();
    this.initUser();
    this.initRooms();
    this.initEventListeners();
    this.selectRoom('main');
    this.startUpdateLoop();
    this.initEmojis();
    this.checkNotificationPermission();
    
    // 활성 사용자 시스템
    if (typeof ActiveUsers !== 'undefined') {
      ActiveUsers.initSession();
    }
    
    // 페이지 나갈 때 정리
    window.addEventListener('beforeunload', () => this.cleanup());
    
    // 가시성 변경 감지
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForNewMessages();
      }
    });
  },
  
  // 사용자 초기화
  initUser() {
    let user = localStorage.getItem(this.USER_KEY);
    
    if (!user) {
      const nickname = this.generateRandomNickname();
      user = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    const adj = this.nicknameParts.adjectives[Math.floor(Math.random() * this.nicknameParts.adjectives.length)];
    const noun = this.nicknameParts.nouns[Math.floor(Math.random() * this.nicknameParts.nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
  },
  
  // 현재 닉네임 가져오기
  getCurrentNickname() {
    if (!this.currentUser) {
      this.initUser();
    }
    return this.currentUser.customNickname || this.currentUser.nickname || '익명';
  },
  
  // 사용자 정보 표시 업데이트
  updateUserDisplay() {
    const nickname = this.getCurrentNickname();
    const el = document.getElementById('currentNickname');
    if (el) el.textContent = nickname;
  },
  
  // 채팅방 초기화
  initRooms() {
    // 메인 룸은 항상 존재
    if (!this.rooms.main) {
      this.rooms.main = {
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
    
    // 만료된 룸 정리
    this.cleanupExpiredRooms();
    this.saveData();
  },
  
  // 이벤트 리스너 초기화
  initEventListeners() {
    // 메시지 입력
    const input = document.getElementById('messageInput');
    if (input) {
      input.addEventListener('input', (e) => {
        this.adjustTextareaHeight(e.target);
        this.updateCharCount();
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
    
    // 이모지 피커 외부 클릭 감지
    document.addEventListener('click', (e) => {
      const picker = document.getElementById('emojiPicker');
      if (picker && !picker.contains(e.target) && !e.target.closest('[onclick*="showEmojiPicker"]')) {
        picker.classList.add('hidden');
      }
    });
  },
  
  // 텍스트 영역 높이 자동 조절
  adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  },
  
  // 문자 수 업데이트
  updateCharCount() {
    const input = document.getElementById('messageInput');
    const counter = document.getElementById('charCount');
    if (input && counter) {
      const count = input.value.length;
      counter.textContent = `${count}/500`;
      counter.classList.toggle('hidden', count === 0);
    }
  },
  
  // 메시지 전송
  sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    const room = this.rooms[this.currentRoom];
    if (!room) return;
    
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.currentUser.id,
      nickname: this.getCurrentNickname(),
      content: content,
      timestamp: Date.now(),
      type: 'user'
    };
    
    // 메시지 추가
    room.messages.push(message);
    room.lastActivity = Date.now();
    
    // 사용자 목록 업데이트
    if (!room.users.includes(this.currentUser.id)) {
      room.users.push(this.currentUser.id);
    }
    
    // 저장 및 렌더링
    this.saveData();
    this.renderMessages();
    this.updateRoomsList();
    
    // 입력창 초기화
    input.value = '';
    this.adjustTextareaHeight(input);
    this.updateCharCount();
    
    // 스크롤 최하단
    this.scrollToBottom();
    
    // 이모지 피커 숨기기
    document.getElementById('emojiPicker').classList.add('hidden');
  },
  
  // 메시지 렌더링
  renderMessages() {
    const room = this.rooms[this.currentRoom];
    if (!room) return;
    
    const container = document.getElementById('messagesList');
    if (!container) return;
    
    // Room Discovery 표시 (메인 룸만)
    const discovery = document.getElementById('roomDiscovery');
    if (discovery) {
      if (this.currentRoom === 'main') {
        discovery.classList.remove('hidden');
        this.updateRoomDiscovery();
      } else {
        discovery.classList.add('hidden');
      }
    }
    
    let html = '';
    
    // 환영 메시지 (메시지가 없을 때)
    if (room.messages.length === 0) {
      html = `
        <div class="text-center py-8 fade-in">
          <div class="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 inline-block max-w-xs">
            <div class="text-4xl mb-3">${room.icon || '💬'}</div>
            <h3 class="font-bold text-gray-800 mb-2">${room.name}</h3>
            <p class="text-sm text-gray-600 mb-3">${room.description || '대화를 시작해보세요!'}</p>
            <div class="bg-white/80 rounded-lg p-2 text-xs text-gray-500">
              <i class="fas fa-info-circle text-blue-500 mr-1"></i>
              닉네임 설정: 우측 상단 ⚙️ 설정 버튼
            </div>
          </div>
        </div>
      `;
    }
    
    // 메시지 표시
    let lastDate = null;
    room.messages.forEach(msg => {
      // 날짜 구분선
      const msgDate = new Date(msg.timestamp).toLocaleDateString();
      if (msgDate !== lastDate) {
        html += `
          <div class="text-center my-4">
            <span class="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              ${msgDate}
            </span>
          </div>
        `;
        lastDate = msgDate;
      }
      
      if (msg.type === 'system') {
        // 시스템 메시지
        html += `
          <div class="text-center my-2">
            <span class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              ${this.escapeHtml(msg.content)}
            </span>
          </div>
        `;
      } else {
        // 사용자 메시지
        const isOwnMessage = msg.userId === this.currentUser.id;
        
        html += `
          <div class="flex ${isOwnMessage ? 'justify-end' : 'justify-start'} slide-in">
            <div class="message-bubble ${isOwnMessage ? 'own' : 'other'} px-4 py-2 rounded-2xl ${isOwnMessage ? 'rounded-br-sm' : 'rounded-bl-sm'}">
              ${!isOwnMessage ? `
                <div class="text-xs font-medium mb-1 ${isOwnMessage ? 'text-white/80' : 'text-purple-600'}">
                  ${this.escapeHtml(msg.nickname)}
                </div>
              ` : ''}
              <p class="text-sm break-words">${this.linkifyText(msg.content)}</p>
              <div class="text-xs ${isOwnMessage ? 'text-white/60' : 'text-gray-400'} mt-1 text-right">
                ${this.formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        `;
      }
    });
    
    container.innerHTML = html;
    
    // 새 메시지면 스크롤
    if (room.messages.length > 0) {
      this.scrollToBottom();
    }
  },
  
  // 채팅방 목록 업데이트
  updateRoomsList() {
    const userRooms = Object.values(this.rooms).filter(r => !r.isPermanent);
    const container = document.getElementById('userRoomsList');
    
    if (!container) return;
    
    // 메인 룸 통계 업데이트
    const mainRoom = this.rooms.main;
    if (mainRoom) {
      document.getElementById('mainUsers').textContent = mainRoom.users.length || 0;
      document.getElementById('mainMsgs').textContent = mainRoom.messages.length || 0;
    }
    
    if (userRooms.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-400">
          <i class="fas fa-comments text-3xl mb-2"></i>
          <p class="text-sm">아직 생성된 채팅방이 없습니다</p>
        </div>
      `;
      return;
    }
    
    // 최신순 정렬
    userRooms.sort((a, b) => b.lastActivity - a.lastActivity);
    
    container.innerHTML = userRooms.map(room => {
      const timeLeft = Math.max(0, this.THREAD_LIFETIME - (Date.now() - room.lastActivity));
      const minutes = Math.floor(timeLeft / 60000);
      const isActive = this.currentRoom === room.id;
      
      return `
        <div onclick="selectRoom('${room.id}')" class="room-card p-3 rounded-lg border cursor-pointer ${isActive ? 'active' : ''}" data-room="${room.id}">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">${room.icon || '💬'}</span>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm truncate">${this.escapeHtml(room.name)}</h4>
                ${room.description ? `<p class="text-xs text-gray-500 truncate">${this.escapeHtml(room.description)}</p>` : ''}
              </div>
            </div>
            ${minutes <= 5 ? `<span class="text-xs text-red-500 font-medium">${minutes}분</span>` : ''}
          </div>
          <div class="flex items-center gap-3 mt-2 text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}">
            <span><i class="fas fa-users"></i> ${room.users?.length || 0}</span>
            <span><i class="fas fa-comment"></i> ${room.messages?.length || 0}</span>
            <span><i class="fas fa-clock"></i> ${this.formatTimeAgo(room.lastActivity)}</span>
          </div>
        </div>
      `;
    }).join('');
  },
  
  // Room Discovery 업데이트
  updateRoomDiscovery() {
    const activeRooms = Object.values(this.rooms)
      .filter(r => !r.isPermanent)
      .filter(r => r.messages.length > 0 || r.users.length > 0)
      .sort((a, b) => {
        // 활동성 기준 정렬
        const scoreA = (a.messages.length * 2) + a.users.length;
        const scoreB = (b.messages.length * 2) + b.users.length;
        return scoreB - scoreA;
      })
      .slice(0, 5);
    
    const container = document.getElementById('activeRooms');
    if (!container) return;
    
    if (activeRooms.length === 0) {
      container.innerHTML = `
        <div class="text-xs text-gray-400 py-2">
          아직 활발한 채팅방이 없습니다
        </div>
      `;
      return;
    }
    
    container.innerHTML = activeRooms.map(room => `
      <div onclick="selectRoom('${room.id}')" class="flex-shrink-0 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-2 min-w-[120px] cursor-pointer">
        <div class="flex items-center gap-1 mb-1">
          <span class="text-sm">${room.icon}</span>
          <h5 class="text-xs font-medium truncate">${this.escapeHtml(room.name)}</h5>
        </div>
        <div class="flex items-center gap-2 text-[10px] text-gray-600">
          <span><i class="fas fa-users"></i> ${room.users.length}</span>
          <span><i class="fas fa-comment"></i> ${room.messages.length}</span>
        </div>
      </div>
    `).join('');
  },
  
  // 룸 선택
  selectRoom(roomId) {
    if (!this.rooms[roomId]) return;
    
    // 이전 룸에서 사용자 제거
    if (this.currentRoom && this.rooms[this.currentRoom]) {
      const oldRoom = this.rooms[this.currentRoom];
      const userIdx = oldRoom.users.indexOf(this.currentUser.id);
      if (userIdx > -1) {
        oldRoom.users.splice(userIdx, 1);
      }
    }
    
    this.currentRoom = roomId;
    const room = this.rooms[roomId];
    
    // 새 룸에 사용자 추가
    if (!room.users.includes(this.currentUser.id)) {
      room.users.push(this.currentUser.id);
    }
    
    // UI 업데이트
    this.updateRoomInfo(room);
    this.renderMessages();
    this.updateRoomsList();
    
    // 룸 목록 패널 닫기
    this.toggleRoomList(false);
    
    // 활동 시간 업데이트
    room.lastActivity = Date.now();
    this.saveData();
  },
  
  // 룸 정보 업데이트
  updateRoomInfo(room) {
    document.getElementById('roomIcon').textContent = room.icon || '💬';
    document.getElementById('roomName').textContent = room.name;
    document.getElementById('roomDesc').textContent = room.description || '';
    
    // 타이머 표시 (임시 룸만)
    const timer = document.getElementById('roomTimer');
    if (!room.isPermanent) {
      timer.classList.remove('hidden');
      this.updateRoomTimer(room);
    } else {
      timer.classList.add('hidden');
    }
    
    // 룸 카드 활성화 상태
    document.querySelectorAll('.room-card').forEach(card => {
      card.classList.toggle('active', card.dataset.room === room.id);
    });
  },
  
  // 룸 타이머 업데이트
  updateRoomTimer(room) {
    const timeLeft = Math.max(0, this.THREAD_LIFETIME - (Date.now() - room.lastActivity));
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    const timerEl = document.getElementById('timeLeft');
    if (timerEl) {
      timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // 5분 이하일 때 경고
      if (minutes < 5) {
        timerEl.parentElement.classList.add('bg-red-500/20');
      }
    }
  },
  
  // 새 룸 생성
  createRoom() {
    const nameInput = document.getElementById('newRoomName');
    const descInput = document.getElementById('newRoomDesc');
    const iconInput = document.getElementById('selectedIcon');
    
    const name = nameInput.value.trim();
    if (!name) {
      this.showToast('채팅방 이름을 입력하세요');
      return;
    }
    
    const roomId = `room_${Date.now()}`;
    
    this.rooms[roomId] = {
      id: roomId,
      name: name,
      description: descInput.value.trim(),
      icon: iconInput.value || '🏃',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messages: [],
      users: [],
      createdBy: this.currentUser.id,
      isPermanent: false
    };
    
    // 환영 메시지
    this.rooms[roomId].messages.push({
      id: Date.now(),
      type: 'system',
      content: `${this.getCurrentNickname()}님이 채팅방을 만들었습니다`,
      timestamp: Date.now()
    });
    
    // 메인 채팅방에 알림
    if (this.rooms.main) {
      this.rooms.main.messages.push({
        id: Date.now() + 1,
        type: 'system',
        content: `🎉 새 채팅방 "${name}"이(가) 생성되었습니다!`,
        timestamp: Date.now()
      });
    }
    
    this.saveData();
    this.selectRoom(roomId);
    this.closeCreateRoom();
    this.showToast('채팅방이 생성되었습니다!');
  },
  
  // 만료된 룸 정리
  cleanupExpiredRooms() {
    const now = Date.now();
    const expired = [];
    
    Object.keys(this.rooms).forEach(roomId => {
      const room = this.rooms[roomId];
      if (!room.isPermanent && (now - room.lastActivity) > this.THREAD_LIFETIME) {
        expired.push(roomId);
        delete this.rooms[roomId];
      }
    });
    
    if (expired.length > 0) {
      // 만료된 룸에 있었다면 메인으로 이동
      if (expired.includes(this.currentRoom)) {
        this.selectRoom('main');
      }
      this.saveData();
    }
  },
  
  // 새 메시지 확인
  checkForNewMessages() {
    const oldCount = this.rooms[this.currentRoom]?.messages?.length || 0;
    this.loadData();
    const newCount = this.rooms[this.currentRoom]?.messages?.length || 0;
    
    if (newCount > oldCount) {
      this.renderMessages();
      
      // 알림음 재생
      if (this.soundEnabled && document.hidden) {
        this.playNotificationSound();
      }
    }
  },
  
  // 업데이트 루프
  startUpdateLoop() {
    this.updateTimer = setInterval(() => {
      this.cleanupExpiredRooms();
      this.updateOnlineCount();
      this.checkForNewMessages();
      this.updateRoomsList();
      
      // 타이머 업데이트 (임시 룸인 경우)
      if (this.currentRoom !== 'main' && this.rooms[this.currentRoom] && !this.rooms[this.currentRoom].isPermanent) {
        this.updateRoomTimer(this.rooms[this.currentRoom]);
      }
    }, this.UPDATE_INTERVAL);
  },
  
  // 온라인 수 업데이트
  updateOnlineCount() {
    const count = ActiveUsers ? ActiveUsers.getActiveCount() : 1;
    document.getElementById('onlineCount').textContent = count;
  },
  
  // 데이터 로드
  loadData() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.rooms = data.rooms || {};
      }
    } catch (e) {
      console.error('데이터 로드 실패:', e);
      this.rooms = {};
    }
  },
  
  // 데이터 저장
  saveData() {
    try {
      const data = {
        rooms: this.rooms,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('데이터 저장 실패:', e);
      this.handleStorageError();
    }
  },
  
  // 저장소 오류 처리
  handleStorageError() {
    // 오래된 메시지 정리
    Object.values(this.rooms).forEach(room => {
      if (room.messages && room.messages.length > 50) {
        room.messages = room.messages.slice(-50);
      }
    });
    
    try {
      this.saveData();
    } catch (e) {
      this.showToast('저장 공간이 부족합니다');
    }
  },
  
  // 유틸리티 함수들
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  linkifyText(text) {
    if (!text) return '';
    text = this.escapeHtml(text);
    const urlPattern = /https?:\/\/[^\s]+/g;
    return text.replace(urlPattern, url => 
      `<a href="${url}" target="_blank" class="underline">${url}</a>`
    );
  },
  
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },
  
  formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금';
  },
  
  scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('messagesList');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  },
  
  showToast(message) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    
    msg.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  },
  
  // 이모지 초기화
  initEmojis() {
    const emojis = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤗','🤔','🤫','🤭','😐','😑','😶','😏','😒','🙄','😬','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👏','🙌','👐','🤲','🙏','💪','🦾','🦿','🦵','🦶','👂','👃','👀','👁️','👅','👄','💋','💯','💢','💥','💫','💦','💨','🏃','🏃‍♀️','🤸','🤸‍♀️','⛹️','⛹️‍♀️','🤾','🤾‍♀️','🏋️','🏋️‍♀️','🚴','🚴‍♀️','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎯','⚡','🔥','💥','✨','🌟','⭐','🌈'];
    
    const picker = document.getElementById('emojiPicker');
    if (picker) {
      const grid = picker.querySelector('.grid');
      if (grid) {
        grid.innerHTML = emojis.map(emoji => 
          `<button onclick="insertEmoji('${emoji}')" class="p-2 text-xl hover:bg-gray-100 rounded">${emoji}</button>`
        ).join('');
      }
    }
  },
  
  // 알림 권한 요청
  checkNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },
  
  // 알림음 재생
  playNotificationSound() {
    // 간단한 비프음
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  },
  
  cleanup() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    // 현재 룸에서 사용자 제거
    if (this.currentRoom && this.rooms[this.currentRoom]) {
      const room = this.rooms[this.currentRoom];
      const userIdx = room.users.indexOf(this.currentUser.id);
      if (userIdx > -1) {
        room.users.splice(userIdx, 1);
      }
      this.saveData();
    }
  }
};

// 전역 함수들
function goBack() {
  window.location.href = 'index.html';
}

// 네비게이션 메뉴
function showNavMenu() {
  const modal = document.getElementById('navMenuModal');
  const panel = document.getElementById('navMenuPanel');
  modal.classList.remove('hidden');
  setTimeout(() => {
    panel.classList.remove('translate-x-full');
  }, 10);
}

function hideNavMenu() {
  const modal = document.getElementById('navMenuModal');
  const panel = document.getElementById('navMenuPanel');
  panel.classList.add('translate-x-full');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

function toggleRoomList(show = null) {
  const panel = document.getElementById('roomListPanel');
  if (show === null) {
    panel.classList.toggle('hidden');
  } else {
    panel.classList.toggle('hidden', !show);
  }
  
  // 리스트 업데이트
  if (!panel.classList.contains('hidden')) {
    MobileChatSystem.updateRoomsList();
  }
}

function showSettings() {
  document.getElementById('settingsModal').classList.remove('hidden');
  const input = document.getElementById('nicknameInput');
  if (input) {
    input.value = MobileChatSystem.currentUser?.customNickname || '';
  }
  MobileChatSystem.updateUserDisplay();
  
  // 알림음 설정 로드
  const soundCheckbox = document.getElementById('soundEnabled');
  if (soundCheckbox) {
    soundCheckbox.checked = localStorage.getItem('chatSoundEnabled') === 'true';
  }
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveSettings() {
  const nicknameInput = document.getElementById('nicknameInput');
  const newNickname = nicknameInput.value.trim();
  
  if (MobileChatSystem.currentUser) {
    MobileChatSystem.currentUser.customNickname = newNickname || null;
    localStorage.setItem(MobileChatSystem.USER_KEY, JSON.stringify(MobileChatSystem.currentUser));
    MobileChatSystem.updateUserDisplay();
  }
  
  // 알림음 설정 저장
  const soundCheckbox = document.getElementById('soundEnabled');
  if (soundCheckbox) {
    MobileChatSystem.soundEnabled = soundCheckbox.checked;
    localStorage.setItem('chatSoundEnabled', soundCheckbox.checked);
  }
  
  closeSettings();
  MobileChatSystem.showToast('설정이 저장되었습니다');
}

function showCreateRoom() {
  document.getElementById('createRoomModal').classList.remove('hidden');
  // 폼 초기화
  document.getElementById('newRoomName').value = '';
  document.getElementById('newRoomDesc').value = '';
  document.getElementById('selectedIcon').value = '🏃';
  
  // 아이콘 선택 초기화
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.classList.remove('bg-purple-100', 'ring-2', 'ring-purple-600');
    if (btn.dataset.icon === '🏃') {
      btn.classList.add('bg-purple-100', 'ring-2', 'ring-purple-600');
    }
  });
}

function closeCreateRoom() {
  document.getElementById('createRoomModal').classList.add('hidden');
}

function createRoom() {
  MobileChatSystem.createRoom();
}

function selectIcon(icon) {
  document.getElementById('selectedIcon').value = icon;
  
  // 버튼 하이라이트
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.classList.remove('bg-purple-100', 'ring-2', 'ring-purple-600');
    if (btn.dataset.icon === icon) {
      btn.classList.add('bg-purple-100', 'ring-2', 'ring-purple-600');
    }
  });
}

function selectRoom(roomId) {
  MobileChatSystem.selectRoom(roomId);
}

function sendMessage() {
  MobileChatSystem.sendMessage();
}

function showEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  picker.classList.toggle('hidden');
}

function insertEmoji(emoji) {
  const input = document.getElementById('messageInput');
  if (input) {
    input.value += emoji;
    input.focus();
    MobileChatSystem.updateCharCount();
    MobileChatSystem.adjustTextareaHeight(input);
  }
}

function toggleRoomDiscovery() {
  const rooms = document.getElementById('activeRooms');
  const icon = event.target.querySelector('i');
  
  if (rooms.style.display === 'none') {
    rooms.style.display = 'flex';
    icon.className = 'fas fa-chevron-down';
  } else {
    rooms.style.display = 'none';
    icon.className = 'fas fa-chevron-up';
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  MobileChatSystem.init();
});