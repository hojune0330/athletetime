async function rejectEditorialPostMutation(req, res, next) {
  const postId = req.params.id || req.params.postId;
  try {
    const linked = await req.app.locals.pool.query(
      'SELECT id FROM editorial_issues WHERE post_id = $1 LIMIT 1',
      [postId],
    );
    if (linked.rowCount === 0) return next();
    return res.status(409).json({
      success: false,
      code: 'EDITORIAL_POST_MANAGED',
      error: '매거진 글은 편집실에서만 변경할 수 있습니다.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { rejectEditorialPostMutation };
