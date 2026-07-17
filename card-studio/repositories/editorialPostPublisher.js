class EditorialPostNotFoundError extends Error {
  constructor(postId) {
    super(`Editorial public post not found: ${String(postId)}`);
    this.name = 'EditorialPostNotFoundError';
    this.code = 'EDITORIAL_POST_NOT_FOUND';
    this.status = 409;
    this.postId = postId;
  }
}

async function publishIssuePost(client, issue) {
  if (issue.post_id == null) {
    const inserted = await client.query(`
      INSERT INTO posts (title, content, author, user_id, is_notice, is_admin)
      VALUES ($1, $2, $3, $4, FALSE, TRUE)
      RETURNING id
    `, [issue.title, issue.content, issue.author, issue.created_by]);
    return inserted.rows[0].id;
  }

  const updated = await client.query(`
    UPDATE posts
    SET title = $2, content = $3, author = $4, deleted_at = NULL, updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `, [issue.post_id, issue.title, issue.content, issue.author]);
  if (updated.rowCount !== 1) throw new EditorialPostNotFoundError(issue.post_id);
  return updated.rows[0].id;
}

module.exports = { EditorialPostNotFoundError, publishIssuePost };
