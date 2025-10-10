# 🐘 Render PostgreSQL 연동 가이드

## 📋 전체 과정 요약
1. Render에서 PostgreSQL 생성 (5분)
2. 연결 정보 복사 (1분)
3. 서버 코드 수정 (10분)
4. 배포 및 테스트 (5분)

---

## 🚀 Step 1: Render PostgreSQL 생성

### 1-1. Render 대시보드 접속
1. https://dashboard.render.com 로그인
2. 상단 메뉴 **"New +"** 클릭
3. **"PostgreSQL"** 선택

### 1-2. 데이터베이스 설정
```
Name: athletetime-db (또는 원하는 이름)
Database: athletetime_db (자동 생성됨)
User: athletetime_db_user (자동 생성됨)
Region: Singapore (또는 가까운 지역)
PostgreSQL Version: 15 (또는 최신)
Plan: Free (무료)
```

### 1-3. Create Database 클릭
- 생성 완료까지 2-3분 대기
- Status가 "Available"로 변경되면 완료

---

## 🔗 Step 2: 연결 정보 설정

### 2-1. 데이터베이스 대시보드에서
1. 생성된 PostgreSQL 클릭
2. **"Connect"** 탭 또는 **"Connections"** 섹션
3. **"Internal Database URL"** 복사 (같은 Render 내에서 사용)
   ```
   postgresql://athletetime_db_user:비밀번호@dpg-xxxxx:5432/athletetime_db
   ```

### 2-2. 백엔드 서비스 환경변수 설정
1. Render 대시보드 → 백엔드 서비스 (athletetime-backend)
2. **"Environment"** 탭
3. **"Add Environment Variable"** 클릭
4. 추가:
   ```
   Key: DATABASE_URL
   Value: [복사한 Internal Database URL]
   ```
5. **"Save Changes"**

---

## 💻 Step 3: 서버 코드 수정

### 3-1. 필요한 패키지 설치
`package.json`에 추가:
```json
{
  "dependencies": {
    "pg": "^8.11.0"
  }
}
```

### 3-2. 새로운 서버 파일 생성
`server-postgres.js` 생성:

```javascript
// PostgreSQL 연동 서버
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? 
    { rejectUnauthorized: false } : false
});

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// ============================================
// 데이터베이스 초기화
// ============================================

async function initDatabase() {
  try {
    // posts 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        content TEXT,
        category VARCHAR(50),
        password VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        views INTEGER DEFAULT 0,
        likes TEXT[] DEFAULT '{}',
        dislikes TEXT[] DEFAULT '{}',
        images JSONB DEFAULT '[]',
        is_notice BOOLEAN DEFAULT false,
        is_blinded BOOLEAN DEFAULT false
      )
    `);

    // comments 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        password VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // chat_messages 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room VARCHAR(50) NOT NULL,
        nickname VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ 데이터베이스 테이블 초기화 완료');

    // 기본 공지사항 확인 및 생성
    const { rows } = await pool.query('SELECT * FROM posts WHERE is_notice = true LIMIT 1');
    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO posts (title, author, content, category, password, is_notice)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        '🎉 애슬리트 타임 커뮤니티 오픈!',
        '관리자',
        '안녕하세요! 애슬리트 타임 커뮤니티가 오픈했습니다.\n\n이제 PostgreSQL 연동으로 모든 데이터가 영구 저장됩니다! 🎊',
        '공지',
        'admin2024',
        true
      ]);
      console.log('📢 기본 공지사항 생성 완료');
    }

  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
  }
}

// ============================================
// WebSocket 채팅 서버
// ============================================

const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  clients.set(clientId, { ws, currentRoom: null, nickname: '익명' });
  
  console.log(`👤 연결: ${clientId}`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await handleWebSocketMessage(clientId, data);
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`👋 연결 종료: ${clientId}`);
  });
});

async function handleWebSocketMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch(data.type) {
    case 'join':
      await joinChatRoom(clientId, data.data);
      break;
    case 'message':
      await sendChatMessage(clientId, data.data);
      break;
  }
}

async function joinChatRoom(clientId, data) {
  const { room: roomId, nickname } = data;
  const client = clients.get(clientId);
  
  client.currentRoom = roomId;
  client.nickname = nickname || '익명';
  
  // 최근 메시지 로드 (최근 50개)
  const { rows } = await pool.query(
    'SELECT * FROM chat_messages WHERE room = $1 ORDER BY created_at DESC LIMIT 50',
    [roomId]
  );
  
  // 클라이언트에 전송
  client.ws.send(JSON.stringify({
    type: 'room_joined',
    data: {
      room: roomId,
      messages: rows.reverse().map(row => ({
        id: row.id,
        text: row.message,
        nickname: row.nickname,
        timestamp: row.created_at,
        room: row.room
      }))
    }
  }));
  
  console.log(`📥 [${roomId}] ${client.nickname} 입장`);
}

async function sendChatMessage(clientId, messageData) {
  const client = clients.get(clientId);
  if (!client || !client.currentRoom) return;
  
  // DB에 저장
  const { rows } = await pool.query(
    'INSERT INTO chat_messages (room, nickname, message) VALUES ($1, $2, $3) RETURNING *',
    [client.currentRoom, messageData.nickname || client.nickname, messageData.text]
  );
  
  const message = {
    id: rows[0].id,
    text: rows[0].message,
    nickname: rows[0].nickname,
    timestamp: rows[0].created_at,
    room: rows[0].room
  };
  
  // 같은 방 사용자에게 전송
  clients.forEach((c, id) => {
    if (c.currentRoom === client.currentRoom && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(JSON.stringify({
        type: 'message',
        data: message
      }));
    }
  });
}

// ============================================
// 게시판 REST API
// ============================================

// 게시글 목록
app.get('/api/posts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM posts ORDER BY is_notice DESC, created_at DESC'
    );
    
    // 댓글 수 계산
    for (let post of rows) {
      const commentResult = await pool.query(
        'SELECT COUNT(*) FROM comments WHERE post_id = $1',
        [post.id]
      );
      post.comment_count = parseInt(commentResult.rows[0].count);
    }
    
    res.json({
      success: true,
      posts: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 작성
app.post('/api/posts', async (req, res) => {
  try {
    const { title, author, content, category, password, images } = req.body;
    
    const { rows } = await pool.query(
      `INSERT INTO posts (title, author, content, category, password, images)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, author, content, category, password, JSON.stringify(images || [])]
    );
    
    console.log(`📝 새 게시글: "${title}"`);
    res.json({ success: true, post: rows[0] });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 게시글 삭제
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // 비밀번호 확인
    const { rows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다' 
      });
    }
    
    const post = rows[0];
    if (password !== post.password && password !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '비밀번호가 일치하지 않습니다' 
      });
    }
    
    // 삭제 실행
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    
    console.log(`🗑️ 게시글 삭제: "${post.title}"`);
    res.json({ success: true, message: '게시글이 삭제되었습니다' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 댓글 추가
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, content, password } = req.body;
    
    const { rows } = await pool.query(
      'INSERT INTO comments (post_id, author, content, password) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, author, content, password]
    );
    
    res.json({ success: true, comment: rows[0] });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 투표
app.post('/api/posts/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, type } = req.body;
    
    const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });
    }
    
    const post = rows[0];
    let likes = post.likes || [];
    let dislikes = post.dislikes || [];
    
    // 기존 투표 제거
    likes = likes.filter(uid => uid !== userId);
    dislikes = dislikes.filter(uid => uid !== userId);
    
    // 새 투표 추가
    if (type === 'like') {
      likes.push(userId);
    } else if (type === 'dislike') {
      dislikes.push(userId);
    }
    
    // 업데이트
    const { rows: updated } = await pool.query(
      'UPDATE posts SET likes = $1, dislikes = $2 WHERE id = $3 RETURNING *',
      [likes, dislikes, id]
    );
    
    res.json({ success: true, post: updated[0] });
  } catch (error) {
    console.error('투표 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 헬스체크
app.get('/', async (req, res) => {
  try {
    const { rows: postCount } = await pool.query('SELECT COUNT(*) FROM posts');
    const { rows: chatCount } = await pool.query('SELECT COUNT(*) FROM chat_messages');
    
    res.json({
      status: 'running',
      service: 'Athlete Time Backend (PostgreSQL)',
      version: '4.0',
      database: 'PostgreSQL',
      stats: {
        posts: parseInt(postCount[0].count),
        messages: parseInt(chatCount[0].count)
      }
    });
  } catch (error) {
    res.json({
      status: 'running',
      service: 'Athlete Time Backend',
      database: 'Connection Error'
    });
  }
});

// ============================================
// 서버 시작
// ============================================

async function startServer() {
  await initDatabase();
  
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 Athlete Time 백엔드 (PostgreSQL)    ║
╠════════════════════════════════════════════╣
║  포트: ${PORT}                              ║
║  환경: ${process.env.NODE_ENV || 'development'}                  ║
║  DB: PostgreSQL ✅                         ║
╠════════════════════════════════════════════╣
║  ✅ 모든 데이터 영구 저장!                  ║
║  ✅ 재배포해도 데이터 유지!                ║
╚════════════════════════════════════════════╝
    `);
  });
}

startServer();
```

---

## 📦 Step 4: package.json 수정

```json
{
  "name": "athletetime-backend",
  "version": "4.0.0",
  "description": "Athlete Time Backend with PostgreSQL",
  "main": "server-postgres.js",
  "scripts": {
    "start": "node server-postgres.js",
    "dev": "nodemon server-postgres.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.14.2",
    "pg": "^8.11.0",
    "node-fetch": "^2.7.0"
  }
}
```

---

## 🚀 Step 5: 배포

### 5-1. GitHub에 푸시
```bash
git add .
git commit -m "feat: Add PostgreSQL integration"
git push origin main
```

### 5-2. Render 자동 배포
- GitHub 푸시 후 자동으로 배포 시작
- 3-5분 후 완료

### 5-3. 확인
1. https://athletetime-backend.onrender.com 접속
2. `database: "PostgreSQL"` 확인
3. 게시글 작성 테스트
4. 서버 재시작 후에도 데이터 유지 확인

---

## ✅ 완료 체크리스트

- [ ] PostgreSQL 데이터베이스 생성
- [ ] DATABASE_URL 환경변수 설정
- [ ] server-postgres.js 파일 생성
- [ ] package.json 수정
- [ ] GitHub 푸시
- [ ] 배포 확인
- [ ] 데이터 영구 저장 테스트

---

## 🆘 문제 해결

### 연결 오류 발생 시
1. DATABASE_URL이 정확한지 확인
2. Internal URL 사용 (External 아님)
3. SSL 설정 확인

### 테이블 생성 오류
```sql
-- 수동으로 테이블 생성 (필요시)
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS chat_messages;
-- 위 CREATE TABLE 쿼리 실행
```

### 90일 후 갱신
- Render 무료 PostgreSQL은 90일마다 갱신 필요
- 이메일 알림 → 대시보드에서 "Refresh" 클릭

---

## 🎉 완료!

이제 모든 데이터가 **영구 저장**됩니다!
- 서버 재배포 ✅
- 서버 재시작 ✅  
- 데이터 유지 ✅