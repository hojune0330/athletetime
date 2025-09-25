// Firebase 설정 및 초기화
// Firebase Console에서 프로젝트 생성 후 설정값 입력 필요

const firebaseConfig = {
  // TODO: Firebase Console에서 복사한 설정값 붙여넣기
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase 초기화
let db = null;
let storage = null;

// Firebase 초기화 함수
function initializeFirebase() {
  if (typeof firebase !== 'undefined') {
    // Firebase 앱 초기화
    firebase.initializeApp(firebaseConfig);
    
    // Realtime Database 참조
    db = firebase.database();
    
    // Storage 참조
    storage = firebase.storage();
    
    console.log('Firebase initialized successfully');
    return true;
  } else {
    console.error('Firebase SDK not loaded');
    return false;
  }
}

// 데이터베이스 헬퍼 함수들
const FirebaseDB = {
  // 데이터 쓰기
  write: function(path, data) {
    if (!db) return Promise.reject('Firebase not initialized');
    return db.ref(path).set(data);
  },
  
  // 데이터 업데이트
  update: function(path, updates) {
    if (!db) return Promise.reject('Firebase not initialized');
    return db.ref(path).update(updates);
  },
  
  // 데이터 읽기 (한 번)
  read: function(path) {
    if (!db) return Promise.reject('Firebase not initialized');
    return db.ref(path).once('value').then(snapshot => snapshot.val());
  },
  
  // 실시간 리스너 등록
  listen: function(path, callback) {
    if (!db) return null;
    const ref = db.ref(path);
    ref.on('value', snapshot => {
      callback(snapshot.val());
    });
    return ref;
  },
  
  // 리스너 제거
  unlisten: function(ref) {
    if (ref) ref.off();
  },
  
  // 새 항목 추가 (자동 ID)
  push: function(path, data) {
    if (!db) return Promise.reject('Firebase not initialized');
    return db.ref(path).push(data);
  },
  
  // 삭제
  remove: function(path) {
    if (!db) return Promise.reject('Firebase not initialized');
    return db.ref(path).remove();
  },
  
  // 서버 타임스탬프
  serverTimestamp: function() {
    return firebase.database.ServerValue.TIMESTAMP;
  }
};

// Storage 헬퍼 함수들
const FirebaseStorage = {
  // 파일 업로드
  upload: function(path, file) {
    if (!storage) return Promise.reject('Firebase not initialized');
    const ref = storage.ref(path);
    return ref.put(file);
  },
  
  // Base64 업로드
  uploadBase64: function(path, base64String, metadata = {}) {
    if (!storage) return Promise.reject('Firebase not initialized');
    const ref = storage.ref(path);
    return ref.putString(base64String, 'base64', metadata);
  },
  
  // 다운로드 URL 가져오기
  getDownloadURL: function(path) {
    if (!storage) return Promise.reject('Firebase not initialized');
    return storage.ref(path).getDownloadURL();
  },
  
  // 파일 삭제
  delete: function(path) {
    if (!storage) return Promise.reject('Firebase not initialized');
    return storage.ref(path).delete();
  }
};

// 초기화 체크
window.addEventListener('DOMContentLoaded', () => {
  // Firebase SDK 로드 확인 (1초 후)
  setTimeout(() => {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not found. Please add Firebase scripts to your HTML.');
      showFirebaseSetupGuide();
    }
  }, 1000);
});

// Firebase 설정 가이드 표시
function showFirebaseSetupGuide() {
  const guide = `
    <div style="position: fixed; top: 20px; left: 20px; right: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Firebase 설정 필요</h3>
      <p style="margin: 5px 0; color: #856404; font-size: 14px;">실시간 기능을 사용하려면 Firebase를 설정해야 합니다:</p>
      <ol style="margin: 10px 0; padding-left: 20px; color: #856404; font-size: 13px;">
        <li>Firebase Console (console.firebase.google.com) 접속</li>
        <li>새 프로젝트 생성</li>
        <li>웹 앱 추가 및 설정값 복사</li>
        <li>firebase-config.js 파일에 설정값 붙여넣기</li>
      </ol>
      <button onclick="this.parentElement.style.display='none'" style="background: #ffc107; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer;">닫기</button>
    </div>
  `;
  
  if (!document.getElementById('firebase-setup-guide')) {
    const div = document.createElement('div');
    div.id = 'firebase-setup-guide';
    div.innerHTML = guide;
    document.body.appendChild(div);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FirebaseDB, FirebaseStorage, initializeFirebase };
}