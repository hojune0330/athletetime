/**
 * WebSocket 유틸리티 (v4.1.0 — 채팅「자유수다」활성화)
 *
 * 실시간 채팅 및 알림 브로드캐스트
 *
 * 확장 (docs/athletetime-chat-open-plan.md §2.4~§2.6):
 * - 단일 상시방 'main' 운영 (training/race/injury는 코드에 남되 접속 경로로 사용 안 함)
 * - DB 영속화: chat_messages 저장(user_key_hash), 입장 시 최근 200개 로드, 30일 보존
 * - 완전 익명: user_key_hash(세션 키 SHA-256)만 저장, 원문 식별자·실명·IP 미저장
 * - contentFilter: 금칙어 저장 거부 + 저격패턴 감지 로그
 * - is_blinded 치환 + 실시간 blind 브로드캐스트
 * - muted(이용 제한): 발신 차단 + 안내
 * - today count(오늘 참여 누적 고유 닉네임)
 * - DB 없으면(Mock/standalone) 크래시 없이 인메모리 폴백
 */

const crypto = require('crypto');
const db = require('./db');
const { checkContent, BLOCKED_MESSAGE } = require('./contentFilter');

// 실 DB(PG) 여부 — Mock DB(개발/테스트)는 인메모리 폴백
const HAS_DB = !!db.pool;

let wss = null;

// 채팅방별 클라이언트 관리
const rooms = {
  main: new Set(),
};

// 채팅방별 고유 닉네임 관리 (중복 접속자 처리용)
const roomNicknames = {
  main: new Map(), // nickname -> Set of ws connections
};

// 채팅 히스토리 (인메모리 폴백 — 서버 재시작 시 초기화)
const chatHistory = {
  main: [],
};

const MAX_HISTORY = 50; // 인메모리 폴백 시 방당 최대 메시지 수
const DB_HISTORY_LIMIT = 200; // DB 로드 시 최근 메시지 수 (H-1c)
const ROOM_ID = 'main'; // 단일 상시방 「자유수다」

// 익명 세션 키 기준 이용 제한(운영자 큐에서 추가). 인메모리 — 서버 재시작 시 초기화(경량 운영).
const mutedKeyHashes = new Set();

// 채팅 메시지 인메모리 ID 시퀀스 (DB 미사용 시)
let memoryMessageSeq = 0;

/**
 * 세션 키 → 단방향 해시(user_key_hash). 원문 식별자는 어디에도 저장하지 않는다.
 */
function hashUserKey(userId) {
  if (!userId) return null;
  return crypto.createHash('sha256').update(String(userId)).digest('hex');
}

/**
 * 방의 고유 유저 수 반환 (닉네임 기준)
 */
function getUniqueUserCount(room) {
  if (!roomNicknames[room]) return 0;
  return roomNicknames[room].size;
}

/**
 * 오늘 참여한 누적 고유 닉네임 수 (H-1c 접속자 표기용)
 * DB 우선, 실패 시 인메모리 폴백.
 */
async function getTodayCount(room) {
  const roomId = room || ROOM_ID;
  if (HAS_DB) {
    try {
      const result = await db.query(
        `SELECT COUNT(DISTINCT nickname) AS today FROM chat_messages
         WHERE room_id = $1 AND created_at >= CURRENT_DATE`,
        [roomId],
      );
      const today = Number(result.rows[0]?.today || 0);
      return today;
    } catch (error) {
      // 폴백
    }
  }
  // 인메모리: 오늘 생성된 메시지의 고유 닉네임 수
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayNicknames = new Set();
  const history = chatHistory[roomId] || [];
  for (const item of history) {
    const created = new Date(item.created_at);
    if (created >= startOfDay && item.nickname) todayNicknames.add(item.nickname);
  }
  return todayNicknames.size;
}

/**
 * DB에서 최근 채팅 히스토리 로드 (입장 시 최대 200개). 실패/미사용 시 인메모리 히스토리 폴백.
 */
async function loadHistory(room) {
  const roomId = room || ROOM_ID;
  if (HAS_DB) {
    try {
      const result = await db.query(
        `SELECT id, nickname, body, created_at, is_blinded
         FROM chat_messages
         WHERE room_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         ORDER BY created_at DESC
         LIMIT $2`,
        [roomId, DB_HISTORY_LIMIT],
      );
      const rows = result.rows || [];
      if (rows.length > 0) {
        // 오름차순으로 정렬해 전송
        return rows
          .reverse()
          .map((row) => ({
            id: String(row.id),
            nickname: row.nickname,
            message: row.is_blinded ? null : row.body,
            is_blinded: !!row.is_blinded,
            created_at: new Date(row.created_at).toISOString(),
          }));
      }
    } catch (error) {
      // 폴백
    }
  }
  return (chatHistory[roomId] || []).slice();
}

/**
 * DB에 채팅 메시지 저장. 성공 시 { id } 반환, 실패/미사용 시 null.
 */
async function storeMessage(room, nickname, keyHash, body) {
  if (!HAS_DB) return null;
  try {
    const result = await db.query(
      `INSERT INTO chat_messages (room_id, nickname, user_key_hash, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [room, nickname, keyHash, body],
    );
    return result.rows[0] ? { id: String(result.rows[0].id) } : null;
  } catch (error) {
    return null;
  }
}

/**
 * 특정 채팅 메시지를 블라인드 처리 (신고 3명 도달 시 호출).
 * @returns {Promise<boolean>} 블라인드 완료 여부
 */
async function blindMessage(messageId) {
  const id = String(messageId);
  if (HAS_DB) {
    try {
      const result = await db.query(
        `UPDATE chat_messages SET is_blinded = TRUE, hidden_at = NOW()
         WHERE id = $1 AND is_blinded = FALSE`,
        [id],
      );
      if (result.rowCount === 0) return false;
    } catch (error) {
      return false;
    }
  }
  // 인메모리에서도 치환
  for (const room of Object.keys(chatHistory)) {
    const item = chatHistory[room].find((m) => String(m.id) === id);
    if (item) {
      item.is_blinded = true;
      item.message = null;
    }
  }
  // 같은 메시지를 이미 보유한 클라이언트에 실시간 반영
  if (wss) {
    broadcastToClients({ type: 'blind', messageId: id });
  }
  return true;
}

/**
 * 이용 제한(익명 key hash 기준). 발신 차단. 제한 해제는 빈 값/Set에서 제거.
 */
function setMutedKey(keyHash) {
  if (!keyHash) return;
  mutedKeyHashes.add(keyHash);
}

function setUnmutedKey(keyHash) {
  if (!keyHash) return;
  mutedKeyHashes.delete(keyHash);
}

function isMutedKey(keyHash) {
  return !!keyHash && mutedKeyHashes.has(keyHash);
}

/**
 * WebSocket 서버 설정
 *
 * @param {WebSocket.Server} websocketServer - WebSocket 서버 인스턴스
 */
function setupWebSocket(websocketServer) {
  wss = websocketServer;

  wss.on('connection', (ws) => {
    ws.currentRoom = null;
    ws.nickname = null;
    ws.userId = null;
    ws.keyHash = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleChatMessage(ws, message);
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', code: 'BAD_MESSAGE', message: '메시지 형식이 올바르지 않아요.' }));
      }
    });

    ws.on('close', () => {
      // 방에서 제거
      if (ws.currentRoom && rooms[ws.currentRoom]) {
        rooms[ws.currentRoom].delete(ws);

        // 닉네임 연결 제거
        let isLastConnection = false;
        if (ws.nickname && roomNicknames[ws.currentRoom]) {
          const connections = roomNicknames[ws.currentRoom].get(ws.nickname);
          if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
              roomNicknames[ws.currentRoom].delete(ws.nickname);
              isLastConnection = true;
            }
          }
        }

        // 유저 수 업데이트 (고유 닉네임 기준)
        broadcastToRoom(ws.currentRoom, {
          type: 'userCount',
          count: getUniqueUserCount(ws.currentRoom),
        });

        // 마지막 연결이 끊어졌을 때만 퇴장 알림
        if (isLastConnection && ws.nickname) {
          broadcastToRoom(ws.currentRoom, {
            type: 'system',
            text: `${ws.nickname}님이 퇴장했습니다.`,
          });
        }
      }
    });

    ws.on('error', () => {
      // 연결 오류는 조용히 무시 (클라이언트 재연결 프로토콜이 처리)
    });
  });
}

/**
 * 채팅 메시지 처리
 */
async function handleChatMessage(ws, message) {
  const { type, room, nickname, userId, text } = message;
  const targetRoom = room || ROOM_ID;

  switch (type) {
    case 'join': {
      // 이전 방에서 나가기
      if (ws.currentRoom && rooms[ws.currentRoom]) {
        rooms[ws.currentRoom].delete(ws);

        if (ws.nickname && roomNicknames[ws.currentRoom]) {
          const connections = roomNicknames[ws.currentRoom].get(ws.nickname);
          if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
              roomNicknames[ws.currentRoom].delete(ws.nickname);
            }
          }
        }

        broadcastToRoom(ws.currentRoom, {
          type: 'userCount',
          count: getUniqueUserCount(ws.currentRoom),
        });
      }

      // 단일 상시방 외 경로는 수용하지 않는다 (라이브방은 H-2a에서 동적 생성)
      if (targetRoom !== ROOM_ID) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'ROOM_NOT_AVAILABLE',
          message: '지금은 자유수다 방만 열려 있어요.',
        }));
        return;
      }

      // 닉네임 유효성
      const trimmedNickname = String(nickname || '').trim();
      if (!trimmedNickname || trimmedNickname.length < 2 || trimmedNickname.length > 20) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'BAD_NICKNAME',
          message: '닉네임은 2~20자 사이여야 해요.',
        }));
        return;
      }

      // 같은 방에서 같은 닉네임을 쓴 다른 세션(userId 다름) 거부 — 중복 방지
      const existing = Array.from(rooms[targetRoom] || []).find(
        (client) => client !== ws && client.userId !== userId && client.nickname === trimmedNickname,
      );
      if (existing) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'DUPLICATE',
          message: '이미 사용 중인 닉네임이에요.',
        }));
        return;
      }

      ws.currentRoom = targetRoom;
      ws.nickname = trimmedNickname;
      ws.userId = userId;
      ws.keyHash = hashUserKey(userId);

      if (!rooms[ws.currentRoom]) rooms[ws.currentRoom] = new Set();
      if (!roomNicknames[ws.currentRoom]) roomNicknames[ws.currentRoom] = new Map();

      rooms[ws.currentRoom].add(ws);

      // 닉네임별 연결 관리
      const isNewUser = !roomNicknames[ws.currentRoom].has(trimmedNickname);
      if (!roomNicknames[ws.currentRoom].has(trimmedNickname)) {
        roomNicknames[ws.currentRoom].set(trimmedNickname, new Set());
      }
      roomNicknames[ws.currentRoom].get(trimmedNickname).add(ws);

      // 새로운 유저일 때만 입장 알림
      if (isNewUser) {
        broadcastToRoom(ws.currentRoom, {
          type: 'system',
          text: `${trimmedNickname}님이 입장했습니다.`,
        });
      }

      // 유저 수 업데이트 (고유 닉네임 기준)
      broadcastToRoom(ws.currentRoom, {
        type: 'userCount',
        count: getUniqueUserCount(ws.currentRoom),
      });

      // 채팅 히스토리 전송 (DB 우선 200개, 폴백 인메모리)
      const history = await loadHistory(ws.currentRoom);
      const today = await getTodayCount(ws.currentRoom);
      ws.send(JSON.stringify({
        type: 'history',
        messages: history,
        today,
      }));
      break;
    }

    case 'message': {
      if (!ws.currentRoom || !text) return;

      // 이용 제한 확인 (익명 key hash 기준)
      if (isMutedKey(ws.keyHash)) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'MUTED',
          message: '이용이 제한된 상태예요. 잠시 후 다시 시도해 주세요.',
        }));
        return;
      }

      // 콘텐츠 필터 — 금칙어는 저장·전송 거부
      const filtered = checkContent(String(text));
      if (filtered.blocked) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'CONTENT_FILTERED',
          message: filtered.message || BLOCKED_MESSAGE,
        }));
        return;
      }
      // 저격 패턴은 차단 아님 — 감지 로그만 (과차단 방지)
      if (filtered.flagged) {
        console.warn(`[contentFilter] 저격 패턴 감지(채팅): "${String(text).slice(0, 60)}"`);
      }

      const chatMessage = {
        id: null,
        nickname: ws.nickname,
        message: text,
        user_id: ws.userId,
        created_at: new Date().toISOString(),
        is_blinded: false,
      };

      // DB 저장 (실패 시 인메모리 폴백)
      const stored = await storeMessage(ws.currentRoom, ws.nickname, ws.keyHash, text);
      chatMessage.id = stored ? stored.id : `mem_${++memoryMessageSeq}`;

      // 인메모리 히스토리에도 보관 (폴백 + 단일 진실 유지)
      if (!chatHistory[ws.currentRoom]) chatHistory[ws.currentRoom] = [];
      chatHistory[ws.currentRoom].push(chatMessage);
      if (chatHistory[ws.currentRoom].length > MAX_HISTORY) {
        chatHistory[ws.currentRoom].shift();
      }

      // 방의 모든 클라이언트에게 전송
      broadcastToRoom(ws.currentRoom, {
        type: 'message',
        data: {
          id: chatMessage.id,
          nickname: ws.nickname,
          text: text,
          timestamp: chatMessage.created_at,
          userId: ws.userId,
        },
      });
      break;
    }
  }
}

/**
 * 특정 방의 클라이언트에게 메시지 전송
 */
function broadcastToRoom(room, data) {
  if (!rooms[room]) return;

  const message = JSON.stringify(data);
  rooms[room].forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

/**
 * 모든 연결된 클라이언트에게 메시지 브로드캐스트
 *
 * @param {Object} data - 전송할 데이터
 * @returns {number} 전송된 클라이언트 수
 */
function broadcastToClients(data) {
  if (!wss) {
    return 0;
  }

  const message = JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      sentCount++;
    }
  });

  return sentCount;
}

/**
 * 연결된 클라이언트 수 반환
 *
 * @returns {number} - 연결된 클라이언트 수
 */
function getClientsCount() {
  return wss ? wss.clients.size : 0;
}

/**
 * 닉네임 사용 가능 여부 확인
 * @param {string} nickname - 확인할 닉네임
 * @returns {boolean} - 사용 가능하면 true
 */
function isNicknameAvailable(nickname) {
  if (!nickname) return false;

  // 모든 방에서 닉네임 사용 여부 확인
  for (const room of Object.keys(roomNicknames)) {
    if (roomNicknames[room].has(nickname)) {
      return false;
    }
  }
  return true;
}

/**
 * 현재 사용 중인 모든 닉네임 목록 반환
 * @returns {string[]} - 사용 중인 닉네임 목록
 */
function getActiveNicknames() {
  const nicknames = new Set();
  for (const room of Object.keys(roomNicknames)) {
    for (const nickname of roomNicknames[room].keys()) {
      nicknames.add(nickname);
    }
  }
  return Array.from(nicknames);
}

module.exports = {
  setupWebSocket,
  broadcastToClients,
  getClientsCount,
  isNicknameAvailable,
  getActiveNicknames,
  // 채팅 확장 (운영 라우트/테스트에서 사용)
  hashUserKey,
  getTodayCount,
  loadHistory,
  blindMessage,
  setMutedKey,
  setUnmutedKey,
  isMutedKey,
  ROOM_ID,
  DB_HISTORY_LIMIT,
};
