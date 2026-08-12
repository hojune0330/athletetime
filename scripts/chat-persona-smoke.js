/**
 * AthleTime 채팅「자유수다」페르소나 사용환경 검증 스크립트
 * - 로컬 풀스택 서버(최신 코드, 5917) 기준 실행
 * - 4명 페르소나: 선수 / 코치 / 학부모 / 동호인
 * - 시나리오: 닉네임 검증 → WS 입장(101) → 히스토리 → 실채팅 발신/수신
 *             → 금칙어 차단 → 중복닉/잘못된 방 → 신고는 닫힘(503) 확인
 */
const WebSocket = require('/home/user/flutter_app/node_modules/ws');

const BASE = process.env.PERSONA_BASE || 'http://127.0.0.1:5917';
const WS_URL = (process.env.PERSONA_WS || BASE.replace(/^http/, 'ws')) + '/ws/chat';

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) { passed++; console.log(`${PASS} ${name}${detail ? ' — ' + detail : ''}`); }
  else { failed++; failures.push(name); console.log(`${FAIL} ${name}${detail ? ' — ' + detail : ''}`); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** WebSocket 클라이언트 래퍼 — 이벤트를 큐에 수집 */
function connectPersona(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const queued = [];
    const waiters = [];
    const onceQueue = { open: [], close: [], error: [] };
    ws.on('open', () => { onceQueue.open.forEach((f) => f()); onceQueue.open = []; });
    ws.on('close', () => { onceQueue.close.forEach((f) => f()); onceQueue.close = []; });
    ws.on('error', (e) => { onceQueue.error.forEach((f) => f(e)); onceQueue.error = []; });
    ws.on('message', (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { msg = { raw: raw.toString() }; }
      queued.push(msg);
      const pending = waiters.filter((w) => w.type === msg.type && w.pred(msg));
      // pending(발동할 waiter)만 제거 — 다른 type waiter는 보존 (버그 수정)
      for (const p of pending) {
        const idx = waiters.indexOf(p);
        if (idx !== -1) waiters.splice(idx, 1);
      }
      pending.forEach((w) => w.resolve(msg));
    });
    const client = {
      name,
      ws,
      queue: queued,
      connected: new Promise((res) => onceQueue.open.push(res)),
      closed: new Promise((res) => onceQueue.close.push(res)),
      // waitFor: 특정 type의 메시지가 큐에 있으면 즉시, 없으면 대기
      waitFor(type, pred, timeoutMs = 6000) {
        const predFn = pred || (() => true);
        const found = queued.find((m) => m.type === type && predFn(m));
        if (found) return Promise.resolve(found);
        return new Promise((resolve, reject) => {
          const t = setTimeout(() => { reject(new Error(`${name} waitFor ${type} timeout`)); }, timeoutMs);
          waiters.push({ type, pred: predFn, resolve: (m) => { clearTimeout(t); resolve(m); } });
        });
      },
      send(obj) { ws.send(JSON.stringify(obj)); },
      terminate() { try { ws.terminate(); } catch {} },
    };
    resolve(client);
  });
}

async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('  AthleTime 「자유수다」 페르소나 사용환경 검증');
  console.log(`  대상: ${BASE}  (${process.env.PERSONA_ENV || '로컬 풀스택 서버'})`);
  console.log('════════════════════════════════════════════════════════\n');

  // ── 페르소나 정의 ──────────────────────────────────────────────
  const personas = [
    { role: '선수',   nickname: '질주하는 치타',  userId: 'persona-athlete' },
    { role: '코치',   nickname: '폼 잡는 코치',   userId: 'persona-coach' },
    { role: '학부모', nickname: '응원하는 엄마',  userId: 'persona-parent' },
    { role: '동호인', nickname: '새벽 러너',     userId: 'persona-runner' },
  ];

  // ── STEP 1: 닉네임 사전 검증 (check-nickname) ─────────────────
  console.log('── STEP 1. 닉네임 사전 검증 (GET /api/chat/check-nickname) ──');
  for (const p of personas) {
    const url = `${BASE}/api/chat/check-nickname?nickname=${encodeURIComponent(p.nickname)}`;
    const r = await (await fetch(url)).json();
    check(`${p.role}(${p.nickname}) 닉네임 검증`, r.success === true && r.available === true, JSON.stringify(r));
    await sleep(80);
  }
  // 형식 오류 닉네임
  const bad = await (await fetch(`${BASE}/api/chat/check-nickname?nickname=x`)).json();
  check('2자 미만 닉네임 거부', bad.available === false, JSON.stringify(bad.message));
  console.log();

  // ── STEP 2: WS 입장 (join → 101 + history/today/userCount) ───
  console.log('── STEP 2. WS 입장 (join) ──');
  const clients = {};
  for (const p of personas) {
    const c = await connectPersona(p.userId);
    clients[p.userId] = c;
    await c.connected; // open 이벤트 대기 후 전송
    check(`${p.role}(${p.nickname}) WS 핸드셰이크`, true, '연결됨');
    c.send({ type: 'join', room: 'main', nickname: p.nickname, userId: p.userId });
    await sleep(50);
  }
  await sleep(300);
  let okHistory = 0;
  for (const p of personas) {
    const c = clients[p.userId];
    const history = c.queue.find((m) => m.type === 'history');
    const uc = c.queue.find((m) => m.type === 'userCount');
    if (history && Array.isArray(history.messages) && typeof history.today === 'number' && uc && typeof uc.count === 'number') {
      okHistory++;
    }
  }
  check(`입장 4명 전체 history+today+userCount 수신 (${okHistory}/4)`, okHistory === 4);
  const sys = clients['persona-runner'].queue.filter((m) => m.type === 'system').map((s) => s.text).join(' / ');
  console.log(`   ℹ️ 입장 시스템 알림: ${sys || '(없음)'}`);
  console.log();

  // ── STEP 3: 실채팅 발신 → 브로드캐스트 수신 ────────────────────
  console.log('── STEP 3. 실채팅 발신 / 브로드캐스트 ──');
  const messagePlan = [
    { from: 'persona-athlete', text: '오늘 400m 기록 드디어 52초 찍었어요! 🏃', expect: '질주하는 치타' },
    { from: 'persona-coach',   text: '박자 좋아요. 피니시 포인트만 끝까지 잡아보세요.', expect: '폼 잡는 코치' },
    { from: 'persona-parent',  text: '아들이 생애 첫 대회 나가요. 다들 응원해 주세요!', expect: '응원하는 엄마' },
    { from: 'persona-runner',  text: '내일 새벽 한강 러닝 같이 하실 분? 6시 출발입니다.', expect: '새벽 러너' },
  ];
  for (const m of messagePlan) {
    const sender = clients[m.from];
    sender.send({ type: 'message', text: m.text, nickname: m.expect, userId: m.from });
  }
  await sleep(500); // 브로드캐스트 반영 대기
  // 각 발신 메시지가 4명 전원(발신자 포함)의 큐에 도착했는지 검증 → 실 브로드캐스트 확인
  for (const m of messagePlan) {
    let arrived = 0;
    const detail = [];
    for (const p of personas) {
      const c = clients[p.userId];
      const hit = c.queue.some((msg) => msg.type === 'message' && msg.data && msg.data.text === m.text && msg.data.nickname === m.expect);
      if (hit) { arrived++; detail.push(p.role); }
    }
    check(`${m.expect} 발신 → 브로드캐스트 수신 (${arrived}/4)`, arrived === 4, `id=${(() => {
      const t = clients['persona-runner'].queue.find((msg) => msg.type === 'message' && msg.data && msg.data.text === m.text);
      return t ? t.data.id : '(없음)';
    })()} | 수신=[${detail.join(',')}]`);
  }
  console.log();

  // ── STEP 4: 금칙어 차단 ───────────────────────────────────────
  console.log('── STEP 4. 금칙어 발신 차단 (CONTENT_FILTERED) ──');
  const overStep = clients['persona-athlete'];
  overStep.send({ type: 'message', text: '씨발 오늘 훈련 너무 힘들다', nickname: '질주하는 치타', userId: 'persona-athlete' });
  const filteredErr = await overStep.waitFor('error', (m) => m.code === 'CONTENT_FILTERED').catch(() => null);
  check('금칙어 발신 → CONTENT_FILTERED error', !!filteredErr, `msg=${filteredErr?.message}`);
  // 저장 거부 확인 — 다른 클라이언트에 전파 안 됨
  await sleep(200);
  const leaked = clients['persona-coach'].queue.some((m) => m.type === 'message' && String(m.data?.text || '').includes('씨발'));
  check('금칙어 메시지 타인에게 미전파', !leaked);
  console.log();

  // ── STEP 5: 중복 닉네임 / 잘못된 방 ────────────────────────────
  console.log('── STEP 5. 중복 닉네임·잘못된 방 거부 (입장 안전장치) ──');
  const dupClient = await connectPersona('dup');
  await dupClient.connected;
  dupClient.send({ type: 'join', room: 'main', nickname: '질주하는 치타', userId: 'persona-dup-user' });
  const dupErr = await dupClient.waitFor('error', (m) => m.code === 'DUPLICATE').catch(() => null);
  check('중복 닉네임 → DUPLICATE error', !!dupErr, `msg=${dupErr?.message}`);
  dupClient.terminate();

  const roomClient = await connectPersona('badroom');
  await roomClient.connected;
  roomClient.send({ type: 'join', room: 'training', nickname: '임시 방문자', userId: 'persona-badroom' });
  const roomErr = await roomClient.waitFor('error', (m) => m.code === 'ROOM_NOT_AVAILABLE').catch(() => null);
  check('잘못된 방(라이브) → ROOM_NOT_AVAILABLE', !!roomErr, `msg=${roomErr?.message}`);
  roomClient.terminate();
  console.log();

  // ── STEP 6: 신고는 닫힌 상태(503) ────────────────────────────
  console.log('── STEP 6. 신고 라우트는 닫힌 상태 (커뮤니티 안전장치 미공개 정책) ──');
  const target = clients['persona-runner'].queue
    .filter((m) => m.type === 'message')
    .find((m) => String(m.data?.text || '').includes('새벽 한강'));
  const targetId = target?.data?.id;
  check('신고 대상 메시지 id 확보', !!targetId, `id=${targetId}`);

  const reportAttempts = [
    { key: 'persona-athlete', reason: '저격·비방' },
    { key: 'persona-coach',   reason: '도배·광고' },
    { key: 'persona-parent',  reason: '기타' },
    { key: 'persona-athlete', reason: 'INVALID_CODE' },
  ];
  const reportResults = [];
  for (const rep of reportAttempts) {
    const response = await fetch(`${BASE}/api/chat/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: targetId, reasonCode: rep.reason, reporterKey: rep.key }),
    });
    const bodyText = await response.text();
    reportResults.push({ key: rep.key, reason: rep.reason, status: response.status, body: bodyText });
    console.log(`   ℹ️ ${rep.key}(${rep.reason}) 신고 응답: HTTP ${response.status} ${bodyText.length > 80 ? bodyText.slice(0, 80) + '…' : bodyText}`);
    await sleep(150);
  }
  check('신고 POST는 일괄 503으로 거부(준비 중)',
    reportResults.every((r) => r.status === 503 && r.body.includes('준비 중이에요')),
    `statuses=${reportResults.map((r) => r.status).join(',')}`);
  console.log(`   ℹ️ 신고 응답 Cache-Control: ${(await (await fetch(`${BASE}/api/chat/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId: targetId, reasonCode: '기타', reporterKey: 'persona-parent' }),
  })).headers.get('cache-control') || '')}`);
  check('신고되어도 메시지는 그대로 공개 유지(블라인드 없음)',
    clients['persona-runner'].queue.some((m) => m.type === 'message' && String(m.data?.id) === String(targetId)),
    `id=${targetId} 여전히 공개`);
  console.log();

  // ── STEP 7: 신고 라우트는 ws와 별개로 닫힘 유지 ─────────────────
  console.log('── STEP 7. 신고(안전장치)는 웹소켓 채팅과 별개로 닫힘 ──');
  const dupReport = await fetch(`${BASE}/api/chat/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId: targetId, reasonCode: '기타', reporterKey: 'persona-athlete' }),
  });
  const dupBody = await dupReport.text();
  console.log(`   ℹ️ 같은 신고자 재신고 응답: HTTP ${dupReport.status} ${dupBody.length > 80 ? dupBody.slice(0, 80) + '…' : dupBody}`);
  check('같은 신고자 재신고도 503으로 거부(닫힘 유지)', dupReport.status === 503, `${dupReport.status} 확인`);
  console.log();

  // ── 정리 ──────────────────────────────────────────────────────
  for (const p of personas) { try { clients[p.userId].terminate(); } catch {} }
  await sleep(200);

  console.log('════════════════════════════════════════════════════════');
  console.log(`  결과: ${passed} PASS / ${failed} FAIL` + (failures.length ? `  → ${failures.join(', ')}` : ''));
  console.log('════════════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
