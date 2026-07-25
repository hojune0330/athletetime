const LIST_LOCK_KEY = 'community-post-quarantine-list';

function hiddenPostResponse(res) {
  res.set('Cache-Control', 'no-store');
  return res.status(404).json({
    success: false,
    code: 'POST_NOT_FOUND',
    error: '게시글을 찾을 수 없습니다.',
  });
}

function canonicalPostId(rawPostId) {
  try {
    if (!/^\d+$/.test(String(rawPostId))) return null;
    const postId = BigInt(rawPostId).toString();
    return postId === '0' ? null : postId;
  } catch {
    return null;
  }
}

function requestDatabase(req) {
  return req.quarantineDatabase || req.app.locals.pool;
}

async function checkoutRequestClient(req) {
  if (req.quarantineDatabase) {
    return { client: req.quarantineDatabase, release: () => {} };
  }
  const client = await req.app.locals.pool.connect();
  return { client, release: () => client.release() };
}

async function acquireSharedBoundary(req, res, next, postId) {
  const pool = req.app.locals.pool;
  if (typeof pool.connect !== 'function') {
    if (typeof res.set === 'function') res.set('Cache-Control', 'no-store');
    if (!postId) return next();
    try {
      const active = await pool.query(
        "SELECT 1 FROM post_quarantines WHERE post_id = $1 AND status = 'active' LIMIT 1",
        [postId],
      );
      return active.rowCount === 0 ? next() : hiddenPostResponse(res);
    } catch (error) {
      return next(error);
    }
  }

  let client;
  let settled = false;
  let listLockHeld = false;
  let postLockHeld = false;
  async function settle() {
    if (settled || !client) return;
    settled = true;
    let releaseError;
    try {
      if (postLockHeld) {
        await client.query(
          'SELECT pg_advisory_unlock_shared(hashtextextended($1::text, 7319))',
          [postId],
        );
      }
      if (listLockHeld) {
        await client.query(
          'SELECT pg_advisory_unlock_shared(hashtextextended($1::text, 7319))',
          [LIST_LOCK_KEY],
        );
      }
    } catch (error) {
      releaseError = error;
      console.error('Post quarantine boundary unlock failed:', error);
    } finally {
      req.quarantineDatabase = undefined;
      client.release(releaseError);
    }
  }

  try {
    client = await pool.connect();
    await client.query(
      'SELECT pg_advisory_lock_shared(hashtextextended($1::text, 7319))',
      [LIST_LOCK_KEY],
    );
    listLockHeld = true;
    if (postId) {
      await client.query(
        'SELECT pg_advisory_lock_shared(hashtextextended($1::text, 7319))',
        [postId],
      );
      postLockHeld = true;
      const post = await client.query(
        'SELECT id FROM posts WHERE id = $1 AND deleted_at IS NULL',
        [postId],
      );
      if (post.rowCount === 0) {
        await settle();
        return hiddenPostResponse(res);
      }
      const active = await client.query(
        "SELECT 1 FROM post_quarantines WHERE post_id = $1 AND status = 'active' LIMIT 1",
        [postId],
      );
      if (active.rowCount > 0) {
        await settle();
        return hiddenPostResponse(res);
      }
    }

    req.quarantineDatabase = client;
    res.set('Cache-Control', 'no-store');
    res.once('finish', () => void settle());
    res.once('close', () => void settle());
    return next();
  } catch (error) {
    await settle();
    return next(error);
  }
}

function holdPostListQuarantineBoundary(req, res, next) {
  return acquireSharedBoundary(req, res, next, null);
}

function rejectQuarantinedPostAccess(req, res, next) {
  const postId = canonicalPostId(req.params.id || req.params.postId);
  if (!postId) return hiddenPostResponse(res);
  return acquireSharedBoundary(req, res, next, postId);
}

module.exports = {
  checkoutRequestClient,
  hiddenPostResponse,
  holdPostListQuarantineBoundary,
  rejectQuarantinedPostAccess,
  requestDatabase,
};
