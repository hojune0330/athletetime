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
    
    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // 활성 사용자 시스템 초기화
    if (typeof ActiveUsers !== 'undefined') {
      ActiveUsers.initSession();
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
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      this.threads = data.threads || {};
    }
  },
  
  // 데이터 저장
  saveData() {
    const data = {
      threads: this.threads,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
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
    
    this.saveData();
    this.renderThreadList();
    this.selectThread(threadId);
    this.closeCreateThreadModal();
    
    this.showToast('채팅방이 생성되었습니다! 30분간 활동이 없으면 자동 삭제됩니다.');
  },
  
  // 스레드 선택
  selectThread(threadId) {
    if (!this.threads[threadId]) return;
    
    this.currentThread = threadId;
    const thread = this.threads[threadId];
    
    // 헤더 업데이트
    document.getElementById('currentThreadName').textContent = thread.name;
    document.getElementById('currentThreadUsers').textContent = thread.users.length || 1;
    
    // 메시지 렌더링
    this.renderMessages();
    
    // 스레드 목록 선택 상태 업데이트
    this.updateThreadListSelection();
    
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
    
    let html = '';
    
    // 환영 메시지
    if (thread.messages.length === 0) {
      html = `
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
        <div onclick="selectThread('${thread.id}')" class="thread-card p-3 hover:bg-gray-50 cursor-pointer border-b">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <div class="text-2xl">${thread.icon}</div>
              <div>
                <h4 class="font-medium text-sm">${this.escapeHtml(thread.name)}</h4>
                ${thread.description ? `<p class="text-xs text-gray-500">${this.escapeHtml(thread.description)}</p>` : ''}
              </div>
            </div>
            ${minutes <= 5 ? `<span class="text-xs text-red-500 font-medium">${minutes}분 남음</span>` : ''}
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-500 ml-10">
            <span><i class="fas fa-users"></i> ${thread.users.length || 0}</span>
            <span><i class="fas fa-comment"></i> ${thread.messages.length}</span>
            <span><i class="fas fa-clock"></i> ${this.formatTimeAgo(thread.lastActivity)}</span>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
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
    }, this.UPDATE_INTERVAL);
  },
  
  // 새 메시지 확인
  checkForNewMessages() {
    const thread = this.threads[this.currentThread];
    if (!thread) return;
    
    // 데이터 다시 로드
    this.loadData();
    
    const currentThread = this.threads[this.currentThread];
    if (!currentThread) return;
    
    // 메시지 수가 다르면 렌더링
    if (currentThread.messages.length !== thread.messages.length) {
      this.renderMessages();
    }
  },
  
  // 온라인 수 업데이트
  updateOnlineCount() {
    const count = ActiveUsers ? ActiveUsers.getActiveCount() : 1;
    document.getElementById('onlineCount').textContent = count;
  },
  
  // 유틸리티 함수들
  getCurrentNickname() {
    return this.currentUser.customNickname || this.currentUser.nickname;
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
function goBack() {
  window.location.href = 'index.html';
}

function toggleThreadList() {
  const list = document.getElementById('threadList');
  list.classList.toggle('hidden');
  
  // 모바일에서 스레드 선택 시 자동으로 닫기
  if (window.innerWidth < 768) {
    document.querySelectorAll('.thread-card').forEach(card => {
      const originalOnclick = card.onclick;
      card.onclick = function(e) {
        if (originalOnclick) originalOnclick.call(this, e);
        list.classList.add('hidden');
      };
    });
  }
}

function openCreateThreadModal() {
  document.getElementById('createThreadModal').classList.remove('hidden');
}

function closeCreateThreadModal() {
  document.getElementById('createThreadModal').classList.add('hidden');
  document.getElementById('threadName').value = '';
  document.getElementById('threadDescription').value = '';
}

function selectThread(threadId) {
  ChatSystem.selectThread(threadId);
}

function selectThreadIcon(icon) {
  document.getElementById('selectedIcon').value = icon;
  
  // 선택된 아이콘 표시
  document.querySelectorAll('.grid button').forEach(btn => {
    if (btn.textContent === icon) {
      btn.classList.add('bg-purple-100', 'border-purple-500');
    } else {
      btn.classList.remove('bg-purple-100', 'border-purple-500');
    }
  });
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