/**
 * 조회수 무한 부풀리기 차단 (P0-F1).
 *
 * 문제: GET /api/posts/:id 이 인증/세션/IP 구분 없이 무조건 +1.
 *   → 봇 1,000회 호출로 인기 게시물 즉시 등극, 사용자 신뢰 붕괴.
 *
 * 대응: (post_id, IP+anonymous 세션) 합성 키로 TTL (15분) 윈도우 안에서
 *   첫 호출만 +1, 그 외는 increment skip.
 *
 * 주의: 같은 사용자가 15분 후엔 다시 카운트되므로 정상 사용 영향 없음.
 * 메모리 누수 방지: 최대 보유 키 수 캡 (LRU 대용으로 트리밍).
 *
 * 단위 테스트: backend/tests/view-dedup.test.js
 */

const crypto = require('crypto');

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 50_000;

function createViewDedup({ ttlMs = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES, now = () => Date.now() } = {}) {
  const entries = new Map(); // key -> { expiresAt }

  function prune(nowMs) {
    if (entries.size < maxEntries) {
      for (const [k, v] of entries) {
        if (nowMs >= v.expiresAt) entries.delete(k);
      }
      return;
    }
    // 강제 트리밍: 시간 초과 + 오래된 순
    const overflow = entries.size - maxEntries + 1024;
    let removed = 0;
    for (const [k, v] of entries) {
      if (nowMs >= v.expiresAt || removed < overflow) {
        entries.delete(k);
        removed += 1;
        if (removed >= overflow) break;
      }
    }
  }

  function buildKey(req, postId) {
    const ip = (req.ip || req.connection?.remoteAddress || 'unknown').trim().slice(0, 64);
    const ua = String(req.get?.('user-agent') || '').slice(0, 96);
    // 익명 쿠키가 있으면 사용. 없으면 UA+IP만.
    let session = '';
    try {
      const cookies = req.cookies || {};
      session = cookies.athletetime_anon || cookies.athletetime_access || '';
    } catch (_) {
      session = '';
    }
    const seed = `${session}|${ip}|${ua}`;
    const digest = crypto.createHash('sha256').update(seed).digest('base64url').slice(0, 22);
    return `${postId}:${digest}`;
  }

  return {
    /**
     * 조회수 증가를 허용해야 하면 true 반환, 같은 윈도우 안 두번째면 false.
     * 호출자가 실제 DB UPDATE를 분리해서 결정.
     */
    shouldIncrement(req, postId) {
      const nowMs = now();
      prune(nowMs);
      const key = buildKey(req, postId);
      const existing = entries.get(key);
      if (existing && nowMs < existing.expiresAt) {
        return false;
      }
      entries.set(key, { expiresAt: nowMs + ttlMs });
      return true;
    },
    // 테스트용
    _reset() { entries.clear(); },
    _size() { return entries.size; },
  };
}

module.exports = { createViewDedup, DEFAULT_TTL_MS, DEFAULT_MAX_ENTRIES };
