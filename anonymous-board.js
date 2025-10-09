// 익명 게시판 JavaScript
class AnonymousBoard {
    constructor() {
        this.posts = JSON.parse(localStorage.getItem('anonymousPosts')) || [];
        this.currentPage = 1;
        this.postsPerPage = 10;
        this.sortBy = 'latest';
        this.searchTerm = '';
        this.initializeElements();
        this.attachEventListeners();
        this.loadSampleData();
        this.renderPosts();
    }

    initializeElements() {
        // Form elements
        this.postForm = document.getElementById('postForm');
        this.titleInput = document.getElementById('postTitle');
        this.contentInput = document.getElementById('postContent');
        this.passwordInput = document.getElementById('postPassword');
        this.charCount = document.querySelector('.char-count');
        
        // Control elements
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.sortSelect = document.getElementById('sortSelect');
        this.toggleWriteBtn = document.querySelector('.toggle-write-btn');
        
        // Display elements
        this.postsList = document.getElementById('postsList');
        this.pagination = document.getElementById('pagination');
        
        // Modal elements
        this.postModal = document.getElementById('postModal');
        this.passwordModal = document.getElementById('passwordModal');
        this.modalContent = document.getElementById('modalContent');
        this.checkPassword = document.getElementById('checkPassword');
        
        // Modal buttons
        this.confirmPassword = document.getElementById('confirmPassword');
        this.cancelPassword = document.getElementById('cancelPassword');
        this.closeModals = document.querySelectorAll('.close-modal');
    }

    attachEventListeners() {
        // Form submission
        this.postForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Character counter
        this.contentInput.addEventListener('input', () => {
            this.charCount.textContent = `${this.contentInput.value.length} / 1000`;
        });
        
        // Toggle write section
        this.toggleWriteBtn.addEventListener('click', () => {
            this.postForm.style.display = 
                this.postForm.style.display === 'none' ? 'flex' : 'none';
        });
        
        // Search
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        // Sort
        this.sortSelect.addEventListener('change', () => {
            this.sortBy = this.sortSelect.value;
            this.currentPage = 1;
            this.renderPosts();
        });
        
        // Modal close buttons
        this.closeModals.forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        
        // Modal background click
        window.addEventListener('click', (e) => {
            if (e.target === this.postModal || e.target === this.passwordModal) {
                this.closeAllModals();
            }
        });
    }

    loadSampleData() {
        // 샘플 데이터가 없으면 생성
        if (this.posts.length === 0) {
            const samplePosts = [
                {
                    id: Date.now() - 1000000,
                    title: "육상 훈련 루틴 공유합니다",
                    content: "매일 아침 6시에 일어나서 10km 달리기를 하고 있습니다. 처음엔 힘들었지만 이제는 습관이 되었네요. 여러분들은 어떤 루틴으로 훈련하시나요?",
                    author: this.generateAnonymousName(),
                    date: new Date(Date.now() - 86400000 * 3).toISOString(),
                    views: 142,
                    likes: 23,
                    comments: [
                        {
                            id: Date.now() - 900000,
                            content: "저도 비슷한 루틴입니다! 아침 운동이 최고죠",
                            author: this.generateAnonymousName(),
                            date: new Date(Date.now() - 86400000 * 2).toISOString()
                        }
                    ],
                    password: null
                },
                {
                    id: Date.now() - 2000000,
                    title: "100m 기록 단축 팁",
                    content: "스타트 블록 세팅과 첫 30m 구간이 정말 중요한 것 같아요. 특히 발목 각도를 조절하니 0.2초 정도 단축되더라고요.",
                    author: this.generateAnonymousName(),
                    date: new Date(Date.now() - 86400000 * 7).toISOString(),
                    views: 256,
                    likes: 45,
                    comments: [
                        {
                            id: Date.now() - 800000,
                            content: "발목 각도 조절이 그렇게 중요한가요? 자세히 알려주세요!",
                            author: this.generateAnonymousName(),
                            date: new Date(Date.now() - 86400000 * 6).toISOString()
                        },
                        {
                            id: Date.now() - 700000,
                            content: "스타트 연습은 정말 중요하죠. 좋은 팁 감사합니다!",
                            author: this.generateAnonymousName(),
                            date: new Date(Date.now() - 86400000 * 5).toISOString()
                        }
                    ],
                    password: null
                },
                {
                    id: Date.now() - 3000000,
                    title: "마라톤 대회 준비 중인데 조언 부탁드려요",
                    content: "다음 달에 첫 풀코스 마라톤을 뛰는데 너무 긴장되네요. 페이스 조절이나 영양 보충에 대한 조언 부탁드립니다.",
                    author: this.generateAnonymousName(),
                    date: new Date(Date.now() - 86400000).toISOString(),
                    views: 89,
                    likes: 12,
                    comments: [],
                    password: null
                }
            ];
            
            this.posts = samplePosts;
            this.savePosts();
        }
    }

    generateAnonymousName() {
        const adjectives = ['빠른', '강한', '민첩한', '끈기있는', '열정적인', '도전적인', '활기찬', '용감한'];
        const animals = ['치타', '표범', '독수리', '매', '토끼', '사슴', '호랑이', '팔콘'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const animal = animals[Math.floor(Math.random() * animals.length)];
        const number = Math.floor(Math.random() * 999) + 1;
        return `${adj}${animal}${number}`;
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const newPost = {
            id: Date.now(),
            title: this.titleInput.value,
            content: this.contentInput.value,
            author: this.generateAnonymousName(),
            date: new Date().toISOString(),
            views: 0,
            likes: 0,
            comments: [],
            password: this.passwordInput.value || null
        };
        
        this.posts.unshift(newPost);
        this.savePosts();
        this.renderPosts();
        
        // Reset form
        this.postForm.reset();
        this.charCount.textContent = '0 / 1000';
        
        // Show success message
        this.showToast('게시글이 작성되었습니다!');
    }

    handleSearch() {
        this.searchTerm = this.searchInput.value.toLowerCase();
        this.currentPage = 1;
        this.renderPosts();
    }

    sortPosts(posts) {
        const sorted = [...posts];
        switch(this.sortBy) {
            case 'latest':
                return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            case 'popular':
                return sorted.sort((a, b) => (b.views + b.likes) - (a.views + a.likes));
            default:
                return sorted;
        }
    }

    filterPosts() {
        if (!this.searchTerm) return this.posts;
        
        return this.posts.filter(post => 
            post.title.toLowerCase().includes(this.searchTerm) ||
            post.content.toLowerCase().includes(this.searchTerm)
        );
    }

    renderPosts() {
        const filtered = this.filterPosts();
        const sorted = this.sortPosts(filtered);
        const start = (this.currentPage - 1) * this.postsPerPage;
        const end = start + this.postsPerPage;
        const pagePosts = sorted.slice(start, end);
        
        if (pagePosts.length === 0) {
            this.postsList.innerHTML = `
                <div class="empty-state">
                    <h3>📝 게시글이 없습니다</h3>
                    <p>첫 번째 게시글을 작성해보세요!</p>
                </div>
            `;
        } else {
            this.postsList.innerHTML = pagePosts.map(post => this.createPostHTML(post)).join('');
            this.attachPostListeners();
        }
        
        this.renderPagination(sorted.length);
    }

    createPostHTML(post) {
        const date = new Date(post.date);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        const preview = post.content.length > 150 ? 
            post.content.substring(0, 150) + '...' : 
            post.content;
        
        return `
            <div class="post-item" data-id="${post.id}">
                <div class="post-header">
                    <h3 class="post-title">${post.title}</h3>
                    <div class="post-meta">
                        <span>👤 ${post.author}</span>
                        <span>📅 ${formattedDate}</span>
                    </div>
                </div>
                <div class="post-preview">${preview}</div>
                <div class="post-footer">
                    <div class="post-stats">
                        <span class="stat-item">👁 ${post.views}</span>
                        <span class="stat-item">❤️ ${post.likes}</span>
                        <span class="stat-item">💬 ${post.comments.length}</span>
                    </div>
                    <div class="post-actions">
                        <button class="action-btn view-btn" data-id="${post.id}">자세히</button>
                        <button class="action-btn delete-btn" data-id="${post.id}">삭제</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachPostListeners() {
        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewPost(parseInt(btn.dataset.id));
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.attemptDelete(parseInt(btn.dataset.id));
            });
        });
        
        // Post item click
        document.querySelectorAll('.post-item').forEach(item => {
            item.addEventListener('click', () => {
                this.viewPost(parseInt(item.dataset.id));
            });
        });
    }

    viewPost(id) {
        const post = this.posts.find(p => p.id === id);
        if (!post) return;
        
        // Increment views
        post.views++;
        this.savePosts();
        
        // Display post in modal
        this.displayPostModal(post);
        this.postModal.style.display = 'block';
    }

    displayPostModal(post) {
        const date = new Date(post.date);
        const formattedDate = date.toLocaleString('ko-KR');
        
        const commentsHTML = post.comments.length > 0 ? 
            post.comments.map(comment => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span>👤 ${comment.author}</span>
                        <span>${new Date(comment.date).toLocaleString('ko-KR')}</span>
                    </div>
                    <div class="comment-content">${comment.content}</div>
                </div>
            `).join('') :
            '<p style="text-align: center; color: #999;">아직 댓글이 없습니다.</p>';
        
        this.modalContent.innerHTML = `
            <div class="modal-post">
                <h2>${post.title}</h2>
                <div class="post-meta" style="margin: 20px 0;">
                    <span>👤 ${post.author}</span>
                    <span>📅 ${formattedDate}</span>
                    <span>👁 ${post.views}</span>
                    <span>❤️ ${post.likes}</span>
                </div>
                <div class="post-full-content" style="margin: 30px 0; line-height: 1.8; white-space: pre-wrap;">${post.content}</div>
                <div class="post-actions" style="margin: 20px 0;">
                    <button class="action-btn like-btn" data-id="${post.id}">
                        ❤️ 좋아요 (${post.likes})
                    </button>
                </div>
                <div class="comments-section">
                    <h3>💬 댓글 (${post.comments.length})</h3>
                    <div class="comment-form">
                        <input type="text" class="comment-input" placeholder="댓글을 입력하세요..." id="commentInput-${post.id}">
                        <button class="comment-submit" data-id="${post.id}">등록</button>
                    </div>
                    <div class="comments-list">
                        ${commentsHTML}
                    </div>
                </div>
            </div>
        `;
        
        // Attach modal event listeners
        this.attachModalListeners(post.id);
    }

    attachModalListeners(postId) {
        // Like button
        const likeBtn = document.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                const post = this.posts.find(p => p.id === postId);
                post.likes++;
                this.savePosts();
                likeBtn.textContent = `❤️ 좋아요 (${post.likes})`;
                this.showToast('좋아요!');
            });
        }
        
        // Comment submit
        const commentBtn = document.querySelector('.comment-submit');
        if (commentBtn) {
            commentBtn.addEventListener('click', () => {
                const input = document.getElementById(`commentInput-${postId}`);
                if (input.value.trim()) {
                    this.addComment(postId, input.value.trim());
                    input.value = '';
                }
            });
        }
    }

    addComment(postId, content) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;
        
        const comment = {
            id: Date.now(),
            content: content,
            author: this.generateAnonymousName(),
            date: new Date().toISOString()
        };
        
        post.comments.push(comment);
        this.savePosts();
        this.displayPostModal(post);
        this.showToast('댓글이 등록되었습니다!');
    }

    attemptDelete(id) {
        const post = this.posts.find(p => p.id === id);
        if (!post) return;
        
        if (post.password) {
            // Show password modal
            this.passwordModal.style.display = 'block';
            this.checkPassword.value = '';
            
            this.confirmPassword.onclick = () => {
                if (this.checkPassword.value === post.password) {
                    this.deletePost(id);
                    this.passwordModal.style.display = 'none';
                } else {
                    this.showToast('비밀번호가 일치하지 않습니다.', 'error');
                }
            };
            
            this.cancelPassword.onclick = () => {
                this.passwordModal.style.display = 'none';
            };
        } else {
            if (confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
                this.deletePost(id);
            }
        }
    }

    deletePost(id) {
        this.posts = this.posts.filter(p => p.id !== id);
        this.savePosts();
        this.renderPosts();
        this.closeAllModals();
        this.showToast('게시글이 삭제되었습니다.');
    }

    renderPagination(totalPosts) {
        const totalPages = Math.ceil(totalPosts / this.postsPerPage);
        if (totalPages <= 1) {
            this.pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        if (this.currentPage > 1) {
            html += `<button class="page-btn" data-page="${this.currentPage - 1}">이전</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)
            ) {
                html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span>...</span>';
            }
        }
        
        // Next button
        if (this.currentPage < totalPages) {
            html += `<button class="page-btn" data-page="${this.currentPage + 1}">다음</button>`;
        }
        
        this.pagination.innerHTML = html;
        
        // Attach pagination listeners
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPage = parseInt(btn.dataset.page);
                this.renderPosts();
                window.scrollTo(0, 0);
            });
        });
    }

    closeAllModals() {
        this.postModal.style.display = 'none';
        this.passwordModal.style.display = 'none';
    }

    savePosts() {
        localStorage.setItem('anonymousPosts', JSON.stringify(this.posts));
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize board when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnonymousBoard();
});

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);