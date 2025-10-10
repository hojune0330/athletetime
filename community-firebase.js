// Firebase를 사용한 익명 게시판 API
// 이 파일을 사용하려면 Firebase 프로젝트를 생성하고 설정해야 합니다.

const CommunityFirebase = {
  // Firebase 초기화 (Firebase Console에서 가져온 설정으로 교체)
  firebaseConfig: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  },

  // 초기화
  init() {
    if (typeof firebase !== 'undefined') {
      firebase.initializeApp(this.firebaseConfig);
      this.db = firebase.firestore();
      console.log('🔥 Firebase 초기화 완료');
      return true;
    }
    console.error('❌ Firebase SDK가 로드되지 않았습니다');
    return false;
  },

  // 모든 게시글 가져오기
  async getPosts() {
    try {
      const snapshot = await this.db.collection('posts')
        .orderBy('date', 'desc')
        .get();
      
      const posts = [];
      snapshot.forEach(doc => {
        posts.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`📥 Firebase에서 ${posts.length}개 게시글 로드`);
      return posts;
    } catch (error) {
      console.error('Firebase 게시글 로드 실패:', error);
      return [];
    }
  },

  // 게시글 작성
  async createPost(postData) {
    try {
      const newPost = {
        ...postData,
        date: new Date().toISOString(),
        views: 0,
        likes: [],
        dislikes: [],
        comments: [],
        reports: [],
        isBlinded: false
      };
      
      const docRef = await this.db.collection('posts').add(newPost);
      newPost.id = docRef.id;
      
      console.log('✅ Firebase에 게시글 작성 완료');
      return newPost;
    } catch (error) {
      console.error('Firebase 게시글 작성 실패:', error);
      throw error;
    }
  },

  // 게시글 수정
  async updatePost(id, updateData) {
    try {
      await this.db.collection('posts').doc(id).update(updateData);
      console.log('✅ Firebase 게시글 수정 완료');
      return { id, ...updateData };
    } catch (error) {
      console.error('Firebase 게시글 수정 실패:', error);
      throw error;
    }
  },

  // 게시글 삭제
  async deletePost(id) {
    try {
      await this.db.collection('posts').doc(id).delete();
      console.log('✅ Firebase 게시글 삭제 완료');
      return true;
    } catch (error) {
      console.error('Firebase 게시글 삭제 실패:', error);
      throw error;
    }
  },

  // 댓글 추가
  async addComment(postId, comment) {
    try {
      const postRef = this.db.collection('posts').doc(postId);
      const post = await postRef.get();
      
      if (!post.exists) throw new Error('게시글을 찾을 수 없습니다');
      
      const comments = post.data().comments || [];
      comments.push({
        ...comment,
        id: Date.now(),
        date: new Date().toISOString()
      });
      
      await postRef.update({ comments });
      console.log('✅ Firebase 댓글 추가 완료');
      return true;
    } catch (error) {
      console.error('Firebase 댓글 추가 실패:', error);
      throw error;
    }
  },

  // 좋아요/싫어요
  async vote(postId, userId, type) {
    try {
      const postRef = this.db.collection('posts').doc(postId);
      const post = await postRef.get();
      
      if (!post.exists) throw new Error('게시글을 찾을 수 없습니다');
      
      const data = post.data();
      let likes = data.likes || [];
      let dislikes = data.dislikes || [];
      
      // 기존 투표 제거
      likes = likes.filter(id => id !== userId);
      dislikes = dislikes.filter(id => id !== userId);
      
      // 새 투표 추가
      if (type === 'like') {
        likes.push(userId);
      } else if (type === 'dislike') {
        dislikes.push(userId);
      }
      
      await postRef.update({ likes, dislikes });
      console.log('✅ Firebase 투표 완료');
      return { likes, dislikes };
    } catch (error) {
      console.error('Firebase 투표 실패:', error);
      throw error;
    }
  }
};

// 사용 방법:
// 1. Firebase Console (https://console.firebase.google.com)에서 프로젝트 생성
// 2. Firestore Database 활성화
// 3. 프로젝트 설정에서 웹 앱 추가
// 4. Firebase 설정 복사하여 firebaseConfig에 붙여넣기
// 5. HTML에 Firebase SDK 추가:
//    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
//    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore-compat.js"></script>
// 6. community-api.js 대신 이 파일 사용