#!/usr/bin/env node

const crypto = require('node:crypto'); const fs = require('node:fs'); const path = require('node:path'); const { createWorkspacePathPolicy } = require('./lib/workspacePathPolicy');
const ROOT = path.resolve(__dirname, '..'); const workspacePath = createWorkspacePathPolicy(ROOT); const CANDIDATE_PATTERN = /(?:\b(?:qa|test|fixture)\b|테스트)/iu;
const PLACEHOLDER_TITLE_PATTERN = /^(?:제목\s*없음|내용\s*없음|untitled|empty|no\s*title)$/iu; const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

function stablePost(post) {
  return {
    id: Number(post.id), seedId: post.seedId || null, author: post.author,
    createdAt: new Date(post.createdAt).toISOString(), title: post.title, content: post.content,
    views: Number(post.views || 0), commentsCount: Math.max(Number(post.commentsCount || 0), (post.comments || []).length),
    likesCount: Number(post.likesCount || 0), dislikesCount: Number(post.dislikesCount || 0),
    reportsCount: Number(post.reportsCount || 0), comments: post.comments || [],
    isBlinded: Boolean(post.isBlinded ?? post.is_blinded),
    deletedAt: post.deletedAt ?? post.deleted_at ?? null,
  };
}

function stateChecksum(post) { return sha256(JSON.stringify(stablePost(post))); }

async function createReport({ repository, generatedAt = new Date().toISOString() }) {
  const posts = (await repository.listPosts()).map(stablePost).sort((a, b) => a.id - b.id);
  const candidates = posts.filter((post) => (
    CANDIDATE_PATTERN.test(`${post.seedId || ''} ${post.author} ${post.title}`)
    || !String(post.title || '').trim()
    || !String(post.content || '').trim()
    || PLACEHOLDER_TITLE_PATTERN.test(String(post.title || '').trim())
  )).map((post) => ({
    postId: post.id,
    seedId: post.seedId,
    author: post.author,
    createdAt: post.createdAt,
    title: post.title,
    bodySummary: post.content.replace(/\s+/g, ' ').trim().slice(0, 160),
    views: post.views,
    comments: post.commentsCount,
    stateChecksum: stateChecksum(post),
  }));
  const report = {
    mode: 'dry-run', generatedAt, databaseChecksum: await repository.checksum(), candidates,
  };
  return { ...report, reportChecksum: sha256(JSON.stringify(report)) };
}

function approvedIds(approval) {
  if (!approval || !Array.isArray(approval.approvedPostIds) || approval.approvedPostIds.length === 0) {
    throw new Error('Approval must contain a non-empty approvedPostIds array');
  }
  const ids = approval.approvedPostIds.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error('Approved post IDs must be positive integers');
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate approved post IDs are not allowed');
  return ids;
}

function checkCommentApproval(commentApproval, commentedIds) {
  if (commentedIds.length === 0) return; const supported = new Set(commentApproval?.approvedPostIds || []);
  const documented = UUID_PATTERN.test(commentApproval?.actor || '')
    && commentApproval?.approvedAt && !Number.isNaN(Date.parse(commentApproval.approvedAt))
    && typeof commentApproval?.reason === 'string' && commentApproval.reason.trim();
  const missing = commentedIds.filter((id) => !supported.has(id));
  if (!documented || missing.length > 0) {
    throw new Error(`Commented posts require separate human approval: ${commentedIds.join(', ')}`);
  }
}

async function executeMutation({
  repository, mode = 'quarantine', approval, report, backupReceipt, commentApproval,
  actor, at = new Date().toISOString(), signal,
}) {
  if (!UUID_PATTERN.test(actor || '')) throw new Error('Mutation actor must be a valid user UUID');
  if (!backupReceipt?.verified) throw new Error('A verified backup receipt is required');
  const beforeChecksum = await repository.checksum();
  if (backupReceipt.databaseChecksum !== beforeChecksum) throw new Error('Backup receipt does not match current database checksum');
  const ids = approvedIds(approval);
  if (approval.reportChecksum !== report?.reportChecksum) throw new Error('Approval report checksum mismatch');
  const candidates = new Map((report.candidates || []).map((item) => [item.postId, item]));
  return repository.transaction(async (tx) => {
    if (signal?.aborted) throw new Error('Operation cancelled before commit');
    const posts = await tx.lockPosts(ids);
    const found = new Set(posts.map((post) => post.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) throw new Error(`Approved post IDs do not exist: ${missing.join(', ')}`);
    const unreported = ids.filter((id) => !candidates.has(id));
    if (unreported.length > 0) throw new Error(`Approved post IDs are absent from the report: ${unreported.join(', ')}`);
    const stale = posts.filter((post) => stateChecksum(post) !== candidates.get(post.id).stateChecksum);
    if (stale.length > 0) throw new Error(`Post state changed after report: ${stale.map((post) => post.id).join(', ')}`);
    if (mode === 'quarantine') {
      checkCommentApproval(commentApproval, posts.filter((post) => post.commentsCount > 0).map((post) => post.id));
      await tx.quarantine(posts, { actor, at, reason: approval.reason || 'approved_qa_test_post' });
    } else if (mode === 'restore') {
      await tx.restore(ids, { actor, at });
    } else throw new Error(`Unsupported mode: ${mode}`);
    if (signal?.aborted) throw new Error('Operation cancelled before commit');
    return { mode, postIds: ids, committed: true };
  }, signal);
}

function parseArgs(argv) {
  const options = { mode: 'report', write: false };
  const valued = new Set(['--report', '--approved', '--backup-receipt', '--comment-approval', '--actor', '--timeout-ms']);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--write') options.write = true;
    else if (flag === '--restore') options.mode = 'restore';
    else if (valued.has(flag)) {
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
      options[flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = argv[++index];
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (options.write && options.mode === 'report') options.mode = 'quarantine';
  if (options.write && !UUID_PATTERN.test(options.actor || '')) {
    throw new Error('--write requires --actor to be a valid user UUID');
  }
  return options;
}

function readJson(input) {
  const file = workspacePath(input);
  if (fs.statSync(file).size > 1024 * 1024) throw new Error(`JSON file is too large: ${input}`);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { throw new Error(`Invalid JSON in ${input}: ${error.message}`); }
}

function verifyBackupReceipt(input) {
  const receipt = readJson(input);
  const artifact = workspacePath(receipt.artifactPath || '');
  if (!receipt.verifiedAt || Number.isNaN(Date.parse(receipt.verifiedAt))) throw new Error('Backup receipt has no valid verifiedAt');
  if (!/^[a-f0-9]{64}$/.test(receipt.sha256 || '') || sha256(fs.readFileSync(artifact)) !== receipt.sha256) {
    throw new Error('Backup artifact checksum mismatch');
  }
  return { ...receipt, verified: true };
}

function reportMarkdown(report) {
  const clean = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  const rows = report.candidates.map((item) => `| ${item.postId} | ${clean(item.seedId)} | ${clean(item.author)} | ${item.createdAt} | ${clean(item.title)} | ${clean(item.bodySummary)} | ${item.views} | ${item.comments} |`);
  return `# Community Post Quarantine Dry Run\n\nDatabase checksum: \`${report.databaseChecksum}\`\n\n| Post ID | Seed ID | Author | Created | Title | Body summary | Views | Comments |\n|---:|---|---|---|---|---|---:|---:|\n${rows.join('\n')}\n`;
}

function normalizeRow(row) {
  return stablePost({ ...row, seedId: row.seed_id, createdAt: row.created_at,
    commentsCount: row.comments_count, likesCount: row.likes_count,
    dislikesCount: row.dislikes_count, reportsCount: row.reports_count,
    isBlinded: row.is_blinded, deletedAt: row.deleted_at });
}

function postgresRepository(pool) {
  const select = async (queryable, ids, lock = false) => {
    const where = ids ? 'WHERE p.id = ANY($1::bigint[])' : 'WHERE p.deleted_at IS NULL';
    const result = await queryable.query(`SELECT p.*, COALESCE(to_jsonb(p)->>'seed_id', u.anonymous_id, p.user_id::text) seed_id,
      COALESCE((SELECT json_agg(to_jsonb(c) ORDER BY c.id) FROM comments c WHERE c.post_id=p.id), '[]') comments
      FROM posts p LEFT JOIN users u ON u.id=p.user_id ${where} ORDER BY p.id ${lock ? 'FOR UPDATE OF p' : ''}`, ids ? [ids] : []);
    return result.rows.map(normalizeRow);
  };
  return {
    listPosts: () => select(pool),
    checksum: async () => sha256(JSON.stringify(await select(pool))),
    transaction: async (work, signal) => {
      const client = await pool.connect();
      let released = false;
      const cancel = () => { if (!released) { released = true; client.release(new Error('Operation cancelled before commit')); } };
      signal?.addEventListener('abort', cancel, { once: true });
      try {
        await client.query('BEGIN');
        const insert = async (posts, metadata) => {
          const active = await client.query("SELECT post_id FROM post_quarantines WHERE post_id=ANY($1::bigint[]) AND status='active'", [posts.map((post) => post.id)]); if (active.rowCount) throw new Error('An approved post already has an active quarantine');
          for (const post of posts) {
            await client.query(`INSERT INTO post_quarantines
              (id, post_id, status, reason_code, reason_detail, quarantined_by, quarantined_at)
              VALUES ($1, $2, 'active', 'approved_qa_test_post', $3, $4, $5)`,
            [crypto.randomUUID(), post.id, metadata.reason, metadata.actor, metadata.at]);
          }
        };
        const restore = async (ids, metadata) => {
          const result = await client.query("UPDATE post_quarantines SET status='released', released_at=$1, released_by=$2 WHERE post_id=ANY($3::bigint[]) AND status='active'", [metadata.at, metadata.actor, ids]);
          if (result.rowCount !== ids.length) throw new Error('Every approved post must have exactly one active quarantine');
        };
        const result = await work({ lockPosts: (ids) => select(client, ids, true), quarantine: insert, restore });
        await client.query('COMMIT');
        return result;
      } catch (error) { if (!released) await client.query('ROLLBACK');
        if (signal?.aborted) throw new Error('Operation cancelled before commit'); throw error;
      } finally { signal?.removeEventListener('abort', cancel); if (!released) client.release(); }
    },
  };
}

function fixtureRepository(file) {
  const load = () => JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    listPosts: async () => load().posts,
    checksum: async () => sha256(JSON.stringify(load().posts.map(stablePost).sort((a, b) => a.id - b.id))),
    transaction: async (work) => {
      const data = load();
      const next = structuredClone(data);
      const tx = {
        lockPosts: async (ids) => next.posts.filter((post) => ids.includes(post.id)).map(stablePost),
        quarantine: async (posts, metadata) => { if (posts.some((post) => next.quarantines.some((item) => item.postId === post.id && !item.restoredAt))) throw new Error('An approved post already has an active quarantine'); next.quarantines.push(...posts.map((post) => ({ postId: post.id, ...metadata, snapshot: post, restoredAt: null }))); },
        restore: async (ids, metadata) => ids.forEach((id) => {
          const row = next.quarantines.find((item) => item.postId === id && !item.restoredAt);
          if (!row) throw new Error(`Post ${id} has no active quarantine`);
          row.restoredAt = metadata.at;
        }),
      };
      const result = await work(tx);
      const temporary = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`);
      fs.renameSync(temporary, file);
      return result;
    },
  };
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  let repository;
  let pool;
  if (process.env.COMMUNITY_QUARANTINE_FIXTURE_DB) {
    if (process.env.NODE_ENV !== 'test') throw new Error('Fixture repository requires NODE_ENV=test');
    repository = fixtureRepository(workspacePath(process.env.COMMUNITY_QUARANTINE_FIXTURE_DB));
  } else {
    const { Pool } = require('pg');
    const { postgresSslConfig } = require('../backend/database/postgres-ssl');
    const connectionString = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL or TEST_DATABASE_URL is required');
    pool = new Pool({ connectionString, ssl: postgresSslConfig(process.env), connectionTimeoutMillis: 5000 });
    repository = postgresRepository(pool);
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  const timer = setTimeout(cancel, Number(options.timeoutMs || 15000));
  try {
    if (!options.write) {
      if (options.approved || options.mode !== 'report') throw new Error('Mutation flags require --write');
      const report = await createReport({ repository });
      if (options.report) {
        const jsonPath = workspacePath(options.report);
        const markdownPath = jsonPath.replace(/\.json$/i, '') + '.md';
        fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
        fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
        fs.writeFileSync(markdownPath, reportMarkdown(report));
      }
      process.stdout.write(`${JSON.stringify({ mode: 'dry-run', candidates: report.candidates.length, databaseChecksum: report.databaseChecksum })}\n`);
    } else {
      if (!options.approved || !options.backupReceipt) throw new Error('--write requires --approved and --backup-receipt');
      const approval = readJson(options.approved);
      if (!approval.reportFile) throw new Error('Approval must reference reportFile');
      const result = await executeMutation({ repository, mode: options.mode, approval,
        report: readJson(approval.reportFile), backupReceipt: verifyBackupReceipt(options.backupReceipt),
        commentApproval: options.commentApproval ? readJson(options.commentApproval) : null,
        actor: options.actor, signal: controller.signal });
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  } finally {
    clearTimeout(timer);
    process.removeListener('SIGINT', cancel);
    if (pool) await pool.end();
  }
}

if (require.main === module) main().catch((error) => {
  process.stderr.write(`Quarantine command failed: ${error.message}\n`);
  process.exitCode = 1;
});

module.exports = { createReport, executeMutation, fixtureRepository, parseArgs, postgresRepository, reportMarkdown, stateChecksum, workspacePath };
