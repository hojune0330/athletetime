const HIDDEN_COUNT_WINDOW_MS = 2 * 60 * 60 * 1000;

function requestTime(req) {
  const clock = req.app.locals.now;
  return typeof clock === 'function' ? clock() : new Date();
}

function areEditorialVoteCountsVisible(publishedAt, now) {
  const publishedAtMs = new Date(publishedAt).getTime();
  const nowMs = now.getTime();
  return Number.isFinite(publishedAtMs)
    && Number.isFinite(nowMs)
    && nowMs >= publishedAtMs + HIDDEN_COUNT_WINDOW_MS;
}

function applyEditorialVoteVisibility(post, now) {
  const { editorial_published_at: publishedAt, ...publicPost } = post;
  if (publishedAt == null) return publicPost;
  const countsVisible = areEditorialVoteCountsVisible(publishedAt, now);
  return {
    ...publicPost,
    likes_count: countsVisible ? publicPost.likes_count : null,
    dislikes_count: countsVisible ? publicPost.dislikes_count : null,
    countsVisible,
  };
}

module.exports = {
  applyEditorialVoteVisibility,
  areEditorialVoteCountsVisible,
  requestTime,
};
