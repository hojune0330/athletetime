// 현대적인 채팅 시스템 모듈
class ModernChatSystem {
  constructor(config = {}) {
    this.config = {
      maxMessages: 200,
      cooldownTime: 3000,
      slowModeTime: 5000,
      autoScroll: true,
      enableEmojis: true,
      enableDonations: true,
      enableReactions: true,
      ...config
    };
    
    this.currentUser = null;
    this.messages = [];
    this.isAtBottom = true;
    this.lastMessageTime = 0;
    this.viewerCount = 0;
    this.unsubscribe = null;
    this.chatMode = 'all'; // all, top, fan, sub
    
    // 이모지 리스트
    this.quickEmojis = ['👍', '❤️', '😂', '🔥', '👏', '💪', '🏃', '⚡', '💯', '🎉'];
    this.reactionEmojis = ['❤️', '🔥', '👍', '😮', '😢', '👏'];
    
    // 배지 타입
    this.badges = {
      streamer: { text: 'LIVE', icon: '🔴', color: 'linear-gradient(90deg, #ef4444, #f97316)' },
      mod: { text: 'MOD', icon: '🛡️', color: '#10b981' },
      vip: { text: 'VIP', icon: '👑', color: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
      sub: { text: 'SUB', icon: '⭐', color: '#8b5cf6' },
      fan: { text: 'FAN', icon: '💜', color: '#ec4899' },
      verified: { text: '✓', icon: '✓', color: '#3b82f6' }
    };
    
    // 사운드 이펙트
    this.sounds = {
      newMessage: new Audio('data:audio/wav;base64,UklGRnQGAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YU'),
      donation: new Audio('data:audio/wav;base64,UklGRnQGAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YU'),
      mention: new Audio('data:audio/wav;base64,UklGRnQGAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YU')
    };
    
    this.initializeSystem();
  }
  
  // 시스템 초기화
  async initializeSystem() {
    try {
      // Firebase 인증
      await this.authenticateUser();
      
      // UI 초기화
      this.setupUI();
      
      // 이벤트 리스너 설정
      this.setupEventListeners();
      
      // 실시간 구독 시작
      this.subscribeToMessages();
      
      // 시청자 수 업데이트
      this.startViewerCounter();
      
      console.log('Chat system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize chat system:', error);
    }
  }
  
  // 사용자 인증
  async authenticateUser() {
    const auth = firebase.auth();
    const result = await auth.signInAnonymously();
    
    this.currentUser = {
      uid: result.user.uid,
      username: this.generateUsername(),
      level: Math.floor(Math.random() * 50) + 1,
      badge: this.getRandomBadge(),
      color: this.generateUserColor(),
      joinedAt: new Date(),
      messageCount: 0,
      reputation: 0
    };
    
    // 로컬 스토리지에 사용자 정보 저장
    localStorage.setItem('chatUser', JSON.stringify(this.currentUser));
  }
  
  // 유저네임 생성
  generateUsername() {
    const prefixes = ['빠른', '강한', '날쌘', '파워', '프로', '슈퍼', '울트라', '메가'];
    const suffixes = ['러너', '스프린터', '마라토너', '챔피언', '선수', '히어로', '마스터'];
    const number = Math.floor(Math.random() * 9999);
    
    return prefixes[Math.floor(Math.random() * prefixes.length)] +
           suffixes[Math.floor(Math.random() * suffixes.length)] +
           number;
  }
  
  // 랜덤 배지
  getRandomBadge() {
    const weights = {
      null: 60,
      fan: 20,
      sub: 10,
      vip: 5,
      mod: 3,
      verified: 2
    };
    
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (const [badge, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return badge === 'null' ? null : badge;
    }
    
    return null;
  }
  
  // 사용자 색상 생성
  generateUserColor() {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // UI 설정
  setupUI() {
    // 이모지 패널 생성
    this.createEmojiPanel();
    
    // 빠른 이모지 바 생성
    this.createQuickEmojiBar();
    
    // 알림 요소 생성
    this.createNotificationElements();
    
    // 채팅 모드 토글 생성
    this.createChatModeToggle();
  }
  
  // 이모지 패널 생성
  createEmojiPanel() {
    const panel = document.getElementById('emojiPanel');
    if (!panel) return;
    
    const categories = {
      '자주 사용': ['😀', '😂', '🥰', '😎', '🤔', '👍', '👏', '💪'],
      '스포츠': ['🏃‍♂️', '🏃‍♀️', '⚡', '💯', '🥇', '🏆', '💨', '🔥'],
      '감정': ['❤️', '😍', '😭', '😱', '🤣', '😮', '😢', '😡'],
      '제스처': ['👋', '🤝', '🙏', '💪', '👊', '✌️', '🤟', '🤙']
    };
    
    Object.entries(categories).forEach(([category, emojis]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'emoji-category mb-3';
      categoryDiv.innerHTML = `
        <div class="text-xs text-gray-400 mb-2">${category}</div>
        <div class="grid grid-cols-8 gap-1">
          ${emojis.map(emoji => `
            <button class="emoji-btn p-2 hover:bg-gray-700 rounded text-xl" 
                    onclick="chatSystem.insertEmoji('${emoji}')">
              ${emoji}
            </button>
          `).join('')}
        </div>
      `;
      panel.appendChild(categoryDiv);
    });
  }
  
  // 빠른 이모지 바
  createQuickEmojiBar() {
    const bar = document.getElementById('quickEmojiBar');
    if (!bar) return;
    
    this.quickEmojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'quick-emoji-btn';
      btn.textContent = emoji;
      btn.onclick = () => this.sendQuickReaction(emoji);
      bar.appendChild(btn);
    });
  }
  
  // 알림 요소 생성
  createNotificationElements() {
    // 토스트 알림 컨테이너
    if (!document.getElementById('toastContainer')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'fixed top-20 right-4 z-50 space-y-2';
      document.body.appendChild(toastContainer);
    }
    
    // 플로팅 이모지 컨테이너
    if (!document.getElementById('floatingEmojiContainer')) {
      const floatingContainer = document.createElement('div');
      floatingContainer.id = 'floatingEmojiContainer';
      floatingContainer.className = 'fixed inset-0 pointer-events-none z-40';
      document.body.appendChild(floatingContainer);
    }
  }
  
  // 채팅 모드 토글
  createChatModeToggle() {
    const modes = ['all', 'top', 'fan', 'sub'];
    modes.forEach(mode => {
      const btn = document.getElementById(`mode-${mode}`);
      if (btn) {
        btn.addEventListener('click', () => this.setChatMode(mode));
      }
    });
  }
  
  // 이벤트 리스너 설정
  setupEventListeners() {
    // 메시지 입력
    const input = document.getElementById('messageInput');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      input.addEventListener('input', () => this.handleInputChange());
    }
    
    // 전송 버튼
    const sendBtn = document.getElementById('sendButton');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }
    
    // 스크롤 감지
    const container = document.getElementById('chatContainer');
    if (container) {
      container.addEventListener('scroll', () => this.handleScroll());
    }
    
    // 새 메시지 알림 클릭
    const newMsgAlert = document.getElementById('newMessageAlert');
    if (newMsgAlert) {
      newMsgAlert.addEventListener('click', () => this.scrollToBottom());
    }
    
    // 창 포커스 이벤트
    window.addEventListener('focus', () => this.handleWindowFocus());
    window.addEventListener('blur', () => this.handleWindowBlur());
  }
  
  // 메시지 구독
  subscribeToMessages() {
    const db = firebase.firestore();
    const query = db.collection('chatMessages')
      .orderBy('timestamp', 'desc')
      .limit(50);
    
    this.unsubscribe = query.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const message = { id: change.doc.id, ...change.doc.data() };
          this.handleNewMessage(message);
        }
      });
    });
  }
  
  // 새 메시지 처리
  handleNewMessage(message) {
    // 메시지 필터링 (채팅 모드에 따라)
    if (!this.shouldShowMessage(message)) return;
    
    // 메시지 표시
    this.displayMessage(message);
    
    // 알림 처리
    this.handleNotifications(message);
    
    // 리액션 처리
    if (message.text && this.config.enableReactions) {
      this.checkForReactions(message.text);
    }
    
    // 메시지 저장
    this.messages.push(message);
    this.trimMessages();
  }
  
  // 메시지 표시 여부 결정
  shouldShowMessage(message) {
    switch (this.chatMode) {
      case 'top':
        return message.likes > 10 || message.isDonation || message.isStreamer;
      case 'fan':
        return message.badge === 'fan' || message.badge === 'sub';
      case 'sub':
        return message.badge === 'sub' || message.badge === 'vip';
      default:
        return true;
    }
  }
  
  // 메시지 표시
  displayMessage(message) {
    const container = document.getElementById('messageList');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = this.getMessageClass(message);
    messageEl.dataset.messageId = message.id;
    
    // 도네이션 메시지
    if (message.isDonation) {
      messageEl.innerHTML = this.renderDonationMessage(message);
      this.playSound('donation');
    }
    // 시스템 메시지
    else if (message.isSystem) {
      messageEl.innerHTML = this.renderSystemMessage(message);
    }
    // 일반 메시지
    else {
      messageEl.innerHTML = this.renderChatMessage(message);
    }
    
    // 애니메이션 적용
    messageEl.style.animation = 'slideInRight 0.3s ease-out';
    
    container.appendChild(messageEl);
    
    // 자동 스크롤
    if (this.isAtBottom && this.config.autoScroll) {
      this.scrollToBottom();
    }
  }
  
  // 메시지 클래스 결정
  getMessageClass(message) {
    let classes = ['chat-message'];
    
    if (message.isDonation) {
      classes.push('donation-message');
    }
    if (message.isStreamer) {
      classes.push('streamer-message');
    }
    if (message.isHighlighted) {
      classes.push('highlighted-message');
    }
    if (message.userId === this.currentUser.uid) {
      classes.push('own-message');
    }
    
    return classes.join(' ');
  }
  
  // 일반 채팅 메시지 렌더링
  renderChatMessage(message) {
    const badge = this.renderBadge(message.badge);
    const processedText = this.processMessageText(message.text);
    const timeStr = this.formatTime(message.timestamp);
    
    return `
      <div class="flex items-start gap-2 p-2">
        <div class="avatar" style="background: ${message.userColor || '#666'}">
          ${message.username[0].toUpperCase()}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-1 mb-1">
            ${badge}
            <span class="username font-semibold text-sm" 
                  style="color: ${message.userColor || '#fff'}">
              ${message.username}
            </span>
            <span class="level text-xs text-gray-500">Lv.${message.level || 1}</span>
            <span class="time text-xs text-gray-600">${timeStr}</span>
          </div>
          <div class="message-text text-sm">${processedText}</div>
        </div>
        <div class="message-actions opacity-0 hover:opacity-100 transition-opacity">
          <button onclick="chatSystem.likeMessage('${message.id}')" class="text-gray-400 hover:text-red-500">
            <i class="far fa-heart"></i>
          </button>
        </div>
      </div>
    `;
  }
  
  // 도네이션 메시지 렌더링
  renderDonationMessage(message) {
    return `
      <div class="donation-content p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="donation-badge">💰 슈퍼챗</span>
            <span class="font-bold">${message.username}</span>
          </div>
          <span class="donation-amount font-bold text-lg">
            ₩${message.amount.toLocaleString()}
          </span>
        </div>
        <div class="donation-text">${this.processMessageText(message.text)}</div>
      </div>
    `;
  }
  
  // 시스템 메시지 렌더링
  renderSystemMessage(message) {
    return `
      <div class="system-message text-center py-2">
        <span class="inline-block px-3 py-1 bg-gray-700 rounded-full text-xs">
          ${message.text}
        </span>
      </div>
    `;
  }
  
  // 배지 렌더링
  renderBadge(badgeType) {
    if (!badgeType || !this.badges[badgeType]) return '';
    
    const badge = this.badges[badgeType];
    return `
      <span class="badge badge-${badgeType}" 
            style="background: ${badge.color}">
        ${badge.icon} ${badge.text}
      </span>
    `;
  }
  
  // 메시지 텍스트 처리
  processMessageText(text) {
    if (!text) return '';
    
    // HTML 이스케이프
    text = this.escapeHtml(text);
    
    // 멘션 처리
    text = text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    // URL 처리
    text = text.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" class="chat-link">$1</a>'
    );
    
    // 이모지 강조
    text = text.replace(/([\u{1F300}-\u{1F9FF}])/gu, '<span class="emoji-lg">$1</span>');
    
    return text;
  }
  
  // 메시지 전송
  async sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    // 쿨다운 체크
    if (!this.checkCooldown()) {
      this.showCooldownWarning();
      return;
    }
    
    // 커맨드 처리
    if (text.startsWith('/')) {
      this.handleCommand(text);
      input.value = '';
      return;
    }
    
    try {
      const db = firebase.firestore();
      await db.collection('chatMessages').add({
        username: this.currentUser.username,
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userId: this.currentUser.uid,
        level: this.currentUser.level,
        badge: this.currentUser.badge,
        userColor: this.currentUser.color,
        likes: 0,
        isDonation: false,
        isStreamer: false,
        isSystem: false
      });
      
      // 입력 초기화
      input.value = '';
      this.lastMessageTime = Date.now();
      
      // 메시지 카운트 증가
      this.currentUser.messageCount++;
      
      // 애니메이션
      this.animateSendButton();
      
    } catch (error) {
      console.error('Failed to send message:', error);
      this.showError('메시지 전송 실패');
    }
  }
  
  // 빠른 리액션 전송
  sendQuickReaction(emoji) {
    // 플로팅 이모지 효과
    this.createFloatingEmoji(emoji);
    
    // 채팅에 이모지 전송
    const db = firebase.firestore();
    db.collection('chatMessages').add({
      username: this.currentUser.username,
      text: emoji,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userId: this.currentUser.uid,
      level: this.currentUser.level,
      badge: this.currentUser.badge,
      userColor: this.currentUser.color,
      isReaction: true
    });
  }
  
  // 플로팅 이모지 생성
  createFloatingEmoji(emoji) {
    const container = document.getElementById('floatingEmojiContainer');
    if (!container) return;
    
    const emojiEl = document.createElement('div');
    emojiEl.className = 'floating-emoji';
    emojiEl.textContent = emoji;
    emojiEl.style.left = Math.random() * 80 + 10 + '%';
    emojiEl.style.bottom = '100px';
    emojiEl.style.fontSize = Math.random() * 20 + 20 + 'px';
    emojiEl.style.animation = `floatUp ${Math.random() * 2 + 2}s ease-out forwards`;
    
    container.appendChild(emojiEl);
    
    setTimeout(() => {
      container.removeChild(emojiEl);
    }, 4000);
  }
  
  // 커맨드 처리
  handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
      case '/clear':
        this.clearChat();
        break;
      case '/help':
        this.showHelp();
        break;
      case '/donate':
        const amount = parseInt(parts[1]) || 1000;
        this.simulateDonation(amount, parts.slice(2).join(' '));
        break;
      case '/slow':
        this.toggleSlowMode();
        break;
      case '/stats':
        this.showStats();
        break;
      default:
        this.showError('알 수 없는 명령어');
    }
  }
  
  // 시청자 카운터
  startViewerCounter() {
    this.updateViewerCount();
    setInterval(() => this.updateViewerCount(), 5000);
  }
  
  updateViewerCount() {
    // 실제로는 Firebase에서 온라인 사용자 수를 가져와야 함
    const base = 1000;
    const variation = Math.floor(Math.random() * 500);
    this.viewerCount = base + variation;
    
    const el = document.getElementById('viewerCount');
    if (el) {
      el.textContent = this.formatNumber(this.viewerCount);
    }
  }
  
  // 유틸리티 함수들
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
  
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  checkCooldown() {
    const now = Date.now();
    return now - this.lastMessageTime >= this.config.cooldownTime;
  }
  
  scrollToBottom() {
    const container = document.getElementById('chatContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
  
  playSound(type) {
    if (this.sounds[type]) {
      this.sounds[type].play().catch(() => {});
    }
  }
  
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} p-3 rounded-lg shadow-lg mb-2`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
  }
  
  // 정리
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    // 이벤트 리스너 제거
    // ...
    
    console.log('Chat system destroyed');
  }
}

// 전역 인스턴스 생성
window.chatSystem = new ModernChatSystem();