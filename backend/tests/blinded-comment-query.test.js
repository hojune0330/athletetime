const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const postsRoute = fs.readFileSync(path.join(__dirname, '../routes/posts.js'), 'utf8');
const commentMutationRoutes = [
  ['comment creation response', fs.readFileSync(path.join(__dirname, '../routes/comments.js'), 'utf8')],
  ['vote response', fs.readFileSync(path.join(__dirname, '../routes/votes.js'), 'utf8')],
];

test('PUBLIC-COMMENT-BOUNDARY Given public post queries Then blinded comments are excluded before response shaping', () => {
  const commentFilters = postsRoute.match(
    /FROM comments cm\s+WHERE cm\.post_id = p\.id\s+AND cm\.deleted_at IS NULL(?:\s+AND cm\.is_blinded = FALSE)?/g,
  ) ?? [];

  assert.equal(commentFilters.length, 3, 'every comment-bearing post response must define a visibility boundary');
  assert.ok(
    commentFilters.every((filter) => filter.includes('cm.is_blinded = FALSE')),
    'blinded comment content must be excluded by the database query',
  );
});

test('PUBLIC-COMMENT-BOUNDARY Given public mutation responses Then blinded comments are excluded before response shaping', () => {
  for (const [responseName, route] of commentMutationRoutes) {
    const commentFilters = route.match(
      /FROM comments cm\s+WHERE cm\.post_id = p\.id\s+AND cm\.deleted_at IS NULL(?:\s+AND cm\.is_blinded = FALSE)?/g,
    ) ?? [];

    assert.equal(commentFilters.length, 1, `${responseName} must define one comment visibility boundary`);
    assert.ok(
      commentFilters[0].includes('cm.is_blinded = FALSE'),
      `${responseName} must exclude blinded comment content before response shaping`,
    );
  }
});
