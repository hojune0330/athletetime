// 채팅 Firebase 연동
class ChatFirebase {
  constructor() {
    this.rooms = {};
    this.currentRoom = 'main';
    this.currentUser = null;
    this.listeners = {};
    this.isOnline = false;
    this.typingTimers = {};
  }

  // 초기화
  async init() {
    this.initUser();
    
    // Firebase 초기화 시도
    if (typeof initializeFirebase !== 'undefined' && initializeFirebase()) {
      this.isOnline = true;
      console.log('Firebase chat mode activated');
      await this.setupRealtimeListeners();
      await this.initMainRoom();
    } else {
      this.isOnline = false;
      console.log('Offline chat mode - using localStorage');
      this.loadFromLocalStorage();
      this.initMainRoom();
    }
    
    this.selectRoom('main');
    this.startCleanupTimer();
  }

  // 사용자 초기화
  initUser() {
    let user = localStorage.getItem('athlete-time_chat_user');
    
    if (!user) {
      const nicknameParts = {
        adjectives: ['빠른', '강한', '민첩한', '유연한', '끈기있는', '파워풀한', '스피디한', '날렵한'],
        nouns: ['스프린터', '마라토너', '허들러', '점퍼', '투척선수', '육상인', '러너', '선수']
      };
      
      const adj = nicknameParts.adjectives[Math.floor(Math.random() * nicknameParts.adjectives.length)];
      const noun = nicknameParts.nouns[Math.floor(Math.random() * nicknameParts.nouns.length)];
      const num = Math.floor(Math.random() * 100);
      
      user = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nickname: `${adj}${noun}${num}`,
        customNickname: null,
        createdAt: Date.now()
      };
      
      localStorage.setItem('athlete-time_chat_user', JSON.stringify(user));
    } else {
      user = JSON.parse(user);
    }
    
    this.currentUser = user;
  }

  // 메인 룸 초기화
  async initMainRoom() {
    const mainRoom = {
      id: 'main',
      name: '메인 채팅방',
      description: '모두가 함께하는 공간',
      icon: '🏠',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isPermanent: true,
      activeUsers: {},
      messages: []
    };

    if (this.isOnline) {
      // Firebase에서 메인 룸 확인
      const existing = await FirebaseDB.read('/chatRooms/main');
      if (!existing) {
        await FirebaseDB.write('/chatRooms/main', mainRoom);
      }
    } else {
      if (!this.rooms.main) {
        this.rooms.main = mainRoom;
        this.saveToLocalStorage();
      }
    }
  }

  // 실시간 리스너 설정
  async setupRealtimeListeners() {
    // 채팅방 목록 리스너
    this.listeners.rooms = FirebaseDB.listen('/chatRooms', (data) => {
      if (data) {
        this.rooms = data;
        this.updateRoomsList();
        this.saveToLocalStorage(); // 로컬 백업
      }
    });

    // 온라인 사용자 추적
    this.trackOnlinePresence();
  }

  // 룸별 메시지 리스너
  listenToRoomMessages(roomId) {
    // 이전 리스너 제거
    if (this.listeners[`room_${roomId}`]) {
      FirebaseDB.unlisten(this.listeners[`room_${roomId}`]);
    }

    // 새 리스너 등록
    this.listeners[`room_${roomId}`] = FirebaseDB.listen(`/chatRooms/${roomId}/messages`, (messages) => {
      if (messages) {
        if (!this.rooms[roomId]) this.rooms[roomId] = {};
        this.rooms[roomId].messages = Object.keys(messages).map(key => ({
          ...messages[key],
          id: key
        }));
        
        if (this.currentRoom === roomId) {
          this.renderMessages();
        }
      }
    });

    // 타이핑 상태 리스너
    this.listeners[`typing_${roomId}`] = FirebaseDB.listen(`/chatRooms/${roomId}/typing`, (typing) => {
      this.updateTypingIndicator(roomId, typing);
    });
  }

  // 메시지 전송
  async sendMessage(content) {
    if (!content || !content.trim()) return;

    const message = {
      userId: this.currentUser.id,
      nickname: this.currentUser.customNickname || this.currentUser.nickname,
      content: content.trim(),
      timestamp: Date.now(),
      type: 'user'
    };

    if (this.isOnline) {
      try {
        await FirebaseDB.push(`/chatRooms/${this.currentRoom}/messages`, message);
        await FirebaseDB.update(`/chatRooms/${this.currentRoom}`, {
          lastActivity: Date.now()
        });
        
        // 타이핑 상태 제거
        await this.setTyping(false);
      } catch (error) {
        console.error('Send message error:', error);
        this.sendMessageOffline(message);
      }
    } else {
      this.sendMessageOffline(message);
    }
  }

  // 오프라인 메시지 전송
  sendMessageOffline(message) {
    if (!this.rooms[this.currentRoom]) {
      this.rooms[this.currentRoom] = { messages: [] };
    }
    
    if (!this.rooms[this.currentRoom].messages) {
      this.rooms[this.currentRoom].messages = [];
    }
    
    this.rooms[this.currentRoom].messages.push(message);
    this.rooms[this.currentRoom].lastActivity = Date.now();
    
    this.saveToLocalStorage();
    this.renderMessages();
    this.showToast('메시지 전송됨 (오프라인 모드)');
  }

  // 룸 생성
  async createRoom(name, description, icon) {
    const roomId = `room_${Date.now()}`;
    const room = {
      id: roomId,
      name: name,
      description: description,
      icon: icon || '💬',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      createdBy: this.currentUser.id,
      isPermanent: false,
      activeUsers: {},
      messages: [{
        type: 'system',
        content: `${this.currentUser.nickname}님이 채팅방을 만들었습니다`,
        timestamp: Date.now()
      }]
    };

    if (this.isOnline) {
      try {
        await FirebaseDB.write(`/chatRooms/${roomId}`, room);
        
        // 메인 채팅방에 알림
        await FirebaseDB.push('/chatRooms/main/messages', {
          type: 'system',
          content: `🎉 새 채팅방 "${name}"이(가) 생성되었습니다!`,
          timestamp: Date.now()
        });
        
        this.selectRoom(roomId);
        this.showToast('채팅방이 생성되었습니다');
      } catch (error) {
        console.error('Create room error:', error);
        this.createRoomOffline(room);
      }
    } else {
      this.createRoomOffline(room);
    }
  }

  // 오프라인 룸 생성
  createRoomOffline(room) {
    this.rooms[room.id] = room;
    
    // 메인 채팅방에 알림
    if (this.rooms.main && this.rooms.main.messages) {
      this.rooms.main.messages.push({
        type: 'system',
        content: `🎉 새 채팅방 "${room.name}"이(가) 생성되었습니다!`,
        timestamp: Date.now()
      });
    }
    
    this.saveToLocalStorage();
    this.selectRoom(room.id);
    this.showToast('채팅방이 생성되었습니다 (오프라인 모드)');
  }

  // 룸 선택
  selectRoom(roomId) {
    if (!this.rooms[roomId]) return;
    
    // 이전 룸에서 나가기
    if (this.isOnline && this.currentRoom) {
      this.leaveRoom(this.currentRoom);
    }
    
    this.currentRoom = roomId;
    
    // 새 룸 입장
    if (this.isOnline) {
      this.joinRoom(roomId);
      this.listenToRoomMessages(roomId);
    }
    
    this.renderMessages();
    this.updateRoomInfo();
  }

  // 룸 입장
  async joinRoom(roomId) {
    if (!this.isOnline) return;
    
    try {
      // 활성 사용자 추가
      await FirebaseDB.write(`/chatRooms/${roomId}/activeUsers/${this.currentUser.id}`, {
        nickname: this.currentUser.nickname,
        joinedAt: Date.now()
      });
    } catch (error) {
      console.error('Join room error:', error);
    }
  }

  // 룸 나가기
  async leaveRoom(roomId) {
    if (!this.isOnline) return;
    
    try {
      // 활성 사용자 제거
      await FirebaseDB.remove(`/chatRooms/${roomId}/activeUsers/${this.currentUser.id}`);
      
      // 타이핑 상태 제거
      await FirebaseDB.remove(`/chatRooms/${roomId}/typing/${this.currentUser.id}`);
    } catch (error) {
      console.error('Leave room error:', error);
    }
  }

  // 타이핑 상태 설정
  async setTyping(isTyping) {
    if (!this.isOnline || !this.currentRoom) return;
    
    const typingPath = `/chatRooms/${this.currentRoom}/typing/${this.currentUser.id}`;
    
    if (isTyping) {
      await FirebaseDB.write(typingPath, {
        nickname: this.currentUser.nickname,
        timestamp: Date.now()
      });
      
      // 3초 후 자동 제거
      if (this.typingTimers[this.currentRoom]) {
        clearTimeout(this.typingTimers[this.currentRoom]);
      }
      
      this.typingTimers[this.currentRoom] = setTimeout(() => {
        this.setTyping(false);
      }, 3000);
    } else {
      await FirebaseDB.remove(typingPath);
      
      if (this.typingTimers[this.currentRoom]) {
        clearTimeout(this.typingTimers[this.currentRoom]);
      }
    }
  }

  // 온라인 상태 추적
  trackOnlinePresence() {
    if (!this.isOnline) return;
    
    const userStatusRef = `/onlineUsers/${this.currentUser.id}`;
    
    // 온라인 상태 설정
    FirebaseDB.write(userStatusRef, {
      nickname: this.currentUser.nickname,
      lastSeen: Date.now(),
      online: true
    });
    
    // 연결 끊김 시 오프라인 설정
    FirebaseDB.listen('/.info/connected', (connected) => {
      if (connected) {
        // 연결 끊김 시 자동 제거
        db.ref(userStatusRef).onDisconnect().remove();
      }
    });
  }

  // 만료된 룸 정리
  async cleanupExpiredRooms() {
    const now = Date.now();
    const ROOM_LIFETIME = 30 * 60 * 1000; // 30분
    
    Object.keys(this.rooms).forEach(async (roomId) => {
      const room = this.rooms[roomId];
      if (!room.isPermanent && (now - room.lastActivity) > ROOM_LIFETIME) {
        if (this.isOnline) {
          await FirebaseDB.remove(`/chatRooms/${roomId}`);
        } else {
          delete this.rooms[roomId];
          this.saveToLocalStorage();
        }
        
        if (this.currentRoom === roomId) {
          this.selectRoom('main');
        }
      }
    });
  }

  // 정리 타이머
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredRooms();
    }, 60000); // 1분마다
  }

  // localStorage 저장/로드
  saveToLocalStorage() {
    try {
      localStorage.setItem('athlete-time_chat_rooms', JSON.stringify(this.rooms));
    } catch (e) {
      console.error('localStorage save error:', e);
    }
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('athlete-time_chat_rooms');
      if (saved) {
        this.rooms = JSON.parse(saved);
      }
    } catch (e) {
      console.error('localStorage load error:', e);
    }
  }

  // UI 업데이트 함수들 (각 페이지에서 구현)
  renderMessages() {
    // Override in implementation
  }

  updateRoomsList() {
    // Override in implementation
  }

  updateRoomInfo() {
    // Override in implementation
  }

  updateTypingIndicator(roomId, typing) {
    // Override in implementation
  }

  showToast(message) {
    if (typeof showToast === 'function') {
      window.showToast(message);
    } else {
      console.log(message);
    }
  }

  // 정리
  cleanup() {
    // 모든 리스너 제거
    Object.values(this.listeners).forEach(ref => {
      if (ref && typeof ref.off === 'function') {
        ref.off();
      }
    });
    
    // 타이머 정리
    Object.values(this.typingTimers).forEach(timer => {
      clearTimeout(timer);
    });
    
    // 룸 나가기
    if (this.currentRoom) {
      this.leaveRoom(this.currentRoom);
    }
  }
}

// 전역 인스턴스
const chatFirebase = new ChatFirebase();

// 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => chatFirebase.init());
} else {
  chatFirebase.init();
}