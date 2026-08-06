/**
 * 채팅「자유수다」라우터 (H-1b/H-1c — 익명 채팅 계약)
 *
 * - GET  /api/chat/check-nickname  랜덤닉네임 중복/형식 검증 (익명, 인증 불필요)
 * - POST /api/chat/reports         채팅 메시지 신고 (익명, 고유 신고자 3명 → 자동 블라인드)
 * - GET  /api/chat/admin/reports   운영자 큐 (authenticateToken + requireAdmin)
 * - POST /api/chat/admin/reports/:id/blind   블라인드 처리 (운영자)
 * - POST /api/chat/admin/reports/:id/restore 블라인드 해제 (운영자)
 *
 * 익명 원칙: user_key_hash(세션 키 SHA-256)만 쓰고 원문 식별자·실명·IP는 저장하지 않는다.
 * DB 없으면(Mock/standalone) 크래시 없이 안전한 기본 응답으로 폴백한다.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { setMutedKey, setUnmutedKey, blindMessage } = require('../utils/websocket');
const { hashUserKey } = require('../utils/websocket');

const BANNED_REASON_CODES = ['저격·비방', '개인정보 노출', '음란·불쾌', '도배·광고', '기타'];
const BLIND_THRESHOLD = 3; // 고유 신고자 수 (H-1b)

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 10;

function getPool(req) {
  // posts.js와 동일 패턴 — 실 DB 풀, 없으면 req.app.locals.pool 폴백
  return req.app.locals.pool || null;
}

/**
 * GET /api/chat/check-nickname
 * 익명 사용자의 랜덤 닉네임이 이미 방에서 사용 중인지 확인.
 */
router.get('/check-nickname', async (req, res) => {
  const nickname = String(req.query.nickname || '').trim();

  if (!nickname || nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return res.status(200).json({
      success: true,
      available: false,
      message: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자 사이여야 해요.`,
    });
  }

  // 형식: 랜덤 닉네임 형태(공백 포함)이거나 한글·숫자 조합 허용
  if (!/^[가-힣a-zA-Z0-9\s·-]{2,10}$/.test(nickname)) {
    return res.status(200).json({
      success: true,
      available: false,
      message: '닉네임은 한글·영문·숫자만 사용할 수 있어요.',
    });
  }

  try {
    const pool = getPool(req);
    // 실 DB: chat_messages 기준 최근 사용 닉네임(30일)과 중복이면 재추첨 유도
    if (pool) {
      const result = await pool.query(
        `SELECT 1 FROM chat_messages
         WHERE nickname = $1 AND created_at >= NOW() - INTERVAL '30 days'
         LIMIT 1`,
        [nickname],
      );
      const used = result.rowCount > 0;
      return res.json({
        success: true,
        available: !used,
        message: used ? '이미 사용 중인 닉네임이에요. 다른 이름을 추천해 드릴게요.' : '사용할 수 있는 닉네임이에요.',
      });
    }

    // Mock/standalone: 요청에 있는 닉네임만 형식 검증 (DB 조회 불가)
    return res.json({
      success: true,
      available: true,
      message: '사용할 수 있는 닉네임이에요.',
    });
  } catch (error) {
    // DB 오류에도 크래시 없이 통과(과차단 방지)
    return res.json({
      success: true,
      available: true,
      message: '사용할 수 있는 닉네임이에요.',
    });
  }
});

/**
 * POST /api/chat/reports
 * 채팅 메시지 신고. reporter_key_hash(익명 세션 키 해시)만 저장한다.
 * 같은 (target, reporter) 조합은 UNIQUE로 중복 카운트가 안 되고,
 * 고유 신고자 BLIND_THRESHOLD명 도달 시 대상 메시지를 자동 블라인드한다.
 */
router.post('/reports', async (req, res) => {
  const { messageId, reasonCode, detail, reporterKey } = req.body || {};

  if (!messageId) {
    return res.status(400).json({ success: false, error: '신고할 메시지를 찾을 수 없어요.' });
  }
  if (!BANNED_REASON_CODES.includes(reasonCode)) {
    return res.status(400).json({ success: false, error: '신고 사유를 선택해 주세요.' });
  }

  // 신고자 식별은 클라이언트 세션 키 해시 — 익명이지만 중복 신고 방지 가능
  const reporterHash = String(reporterKey || '')
    ? hashUserKey(String(reporterKey || ''))
    : hashUserKey(`anon_${req.ip}_${Date.now()}`);
  if (!reporterHash) {
    return res.status(400).json({ success: false, error: '신고 식별자를 확인할 수 없어요.' });
  }

  const pool = getPool(req);
  if (!pool) {
    // Mock/standalone: 인메모리 블라인드로 최소 동작 보장
    await blindMessage(String(messageId));
    return res.json({
      success: true,
      blinded: true,
      message: '신고가 접수되었어요. 검토 후 조치할게요.',
    });
  }

  try {
    // 신고 삽입 — 같은 신고자 중복은 UNIQUE 제약이 거부, read: 폴백
    await pool.query(
      `INSERT INTO reports (target_type, target_id, reporter_anonymous_id, reason_code, detail)
       VALUES ('chat', $1, $2, $3, $4)
       ON CONFLICT (target_type, target_id, reporter_anonymous_id) DO NOTHING`,
      [String(messageId), reporterHash, reasonCode, detail ? String(detail).slice(0, 500) : null],
    );

    // 고유 신고자 수 집계
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM reports
       WHERE target_type = 'chat' AND target_id = $1`,
      [String(messageId)],
    );
    const count = Number(countResult.rows[0]?.cnt || 0);

    // 임계치 도달 → 자동 블라인드 (원문 DB 보존, 화면 치환)
    let blinded = false;
    if (count >= BLIND_THRESHOLD) {
      blinded = await blindMessage(String(messageId));
    }

    return res.json({
      success: true,
      count,
      blinded,
      message: blinded
        ? '신고가 누적되어 메시지를 블라인드 처리했어요.'
        : '신고가 접수되었어요. 검토 후 조치할게요.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: '신고 처리 중 오류가 발생했어요.' });
  }
});

/**
 * GET /api/chat/admin/reports
 * 운영자 신고 큐 — 블라인드 해제/영구 삭제/이용 제한 액션 대상 목록.
 */
router.get('/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
  const pool = getPool(req);
  if (!pool) {
    return res.json({ success: true, reports: [] });
  }

  try {
    const result = await pool.query(
      `SELECT r.id, r.target_id, r.reason_code, r.detail, r.created_at,
              COUNT(*) OVER (PARTITION BY r.target_type, r.target_id) AS report_count,
              m.nickname, m.body, m.is_blinded, m.created_at AS message_created_at
       FROM reports r
       LEFT JOIN chat_messages m ON m.id = r.target_id::bigint
       WHERE r.target_type = 'chat'
       ORDER BY r.created_at DESC
       LIMIT 200`,
    );
    res.json({ success: true, reports: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: '신고 목록을 불러오지 못했어요.' });
  }
});

/**
 * POST /api/chat/admin/reports/:id/blind
 * 운영자가 특정 신고 건을 블라인드 처리.
 */
router.post('/admin/reports/:id/blind', authenticateToken, requireAdmin, async (req, res) => {
  const pool = getPool(req);
  const targetId = req.params.id;
  if (!pool) {
    return res.json({ success: true });
  }
  try {
    const ok = await blindMessage(targetId);
    res.json({ success: true, blinded: ok });
  } catch (error) {
    res.status(500).json({ success: false, error: '블라인드 처리 중 오류가 발생했어요.' });
  }
});

/**
 * POST /api/chat/admin/reports/:id/restore
 * 블라인드 해제 (운영자 검토 후 원문 복원).
 */
router.post('/admin/reports/:id/restore', authenticateToken, requireAdmin, async (req, res) => {
  const pool = getPool(req);
  const targetId = req.params.id;
  if (!pool) {
    return res.json({ success: true });
  }
  try {
    await pool.query(
      `UPDATE chat_messages SET is_blinded = FALSE, hidden_at = NULL WHERE id = $1`,
      [targetId],
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '복원 처리 중 오류가 발생했어요.' });
  }
});

module.exports = router;
