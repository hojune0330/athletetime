const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  createReport,
  executeMutation,
  parseArgs,
  workspacePath,
} = require('../../scripts/community-post-quarantine');

const ROOT = path.resolve(__dirname, '..', '..');
class MemoryRepository {
  constructor(posts) {
    this.posts = structuredClone(posts);
    this.quarantines = []; this.mutations = 0; this.transactions = 0;
  }

  async listPosts() {
    return structuredClone(this.posts);
  }
  async checksum() {
    return JSON.stringify(this.posts);
  }

  async transaction(work) {
    this.transactions += 1;
    const before = structuredClone(this.quarantines);
    const mutations = this.mutations;
    const tx = {
      lockPosts: async (ids) => structuredClone(this.posts.filter((post) => ids.includes(post.id))),
      quarantine: async (rows, metadata) => {
        if (rows.some((post) => this.quarantines.some((row) => row.postId === post.id && !row.restoredAt))) throw new Error('An approved post already has an active quarantine');
        this.quarantines.push(...rows.map((post) => ({ postId: post.id, ...metadata })));
        this.mutations += rows.length;
      },
      restore: async (ids, metadata) => {
        for (const id of ids) {
          const active = this.quarantines.find((row) => row.postId === id && !row.restoredAt);
          if (!active) throw new Error(`Post ${id} has no active quarantine`);
          active.restoredAt = metadata.at;
        }
        this.mutations += ids.length;
      },
    };
    try {
      return await work(tx);
    } catch (error) {
      this.quarantines = before;
      this.mutations = mutations;
      throw error;
    }
  }
}

function baselineCandidateReport(repository) {
  return repository.listPosts().then((posts) => posts.filter((post) => (
    /(?:^|\b)(?:qa|test|fixture)(?:\b|$)/i.test(`${post.title} ${post.author}`)
  )));
}

test('baseline: candidate reporting is deterministic and report-only', async () => {
  const repository = new MemoryRepository([
    { id: 1, seedId: 'seed-qa', author: 'QA Bot', title: 'QA fixture', content: 'candidate' },
    { id: 2, seedId: 'seed-real', author: 'Runner', title: 'Race recap', content: 'keep' },
  ]);

  const candidates = await baselineCandidateReport(repository);

  assert.deepEqual(candidates.map((post) => post.id), [1]);
  assert.equal(repository.mutations, 0);
  assert.deepEqual(repository.quarantines, []);
});

test('empty and placeholder posts are reported without treating ordinary posts as candidates', async () => {
  const repository = new MemoryRepository([
    { id: 1, author: 'Runner', title: '제목 없음', content: '   ', createdAt: '2026-07-17T00:00:00.000Z' },
    { id: 2, author: 'Runner', title: '', content: '본문', createdAt: '2026-07-17T00:00:00.000Z' },
    { id: 3, author: 'Runner', title: '투표테스트', content: '샘플', createdAt: '2026-07-17T00:00:00.000Z' },
    { id: 4, author: 'Runner', title: '테스트 게시물', content: '샘플', createdAt: '2026-07-17T00:00:00.000Z' },
    { id: 5, author: 'Runner', title: '대회 후기', content: '실제 내용', createdAt: '2026-07-17T00:00:00.000Z' },
  ]);
  const report = await createReport({ repository, generatedAt: '2026-07-17T00:00:00.000Z' });
  assert.deepEqual(report.candidates.map((candidate) => candidate.postId), [1, 2, 3, 4]);
});

function fixturePosts() {
  return [
    {
      id: 1, seedId: 'seed-qa', author: 'QA Bot', createdAt: '2026-01-01T00:00:00.000Z',
      title: 'QA fixture', content: 'candidate body', views: 12, commentsCount: 0,
      likesCount: 3, dislikesCount: 1, reportsCount: 0, comments: [],
    },
    {
      id: 2, seedId: 'seed-test', author: 'Test Bot', createdAt: '2026-01-02T00:00:00.000Z',
      title: 'Test discussion', content: 'has a reply', views: 4, commentsCount: 1,
      likesCount: 0, dislikesCount: 0, reportsCount: 0,
      comments: [{ id: 20, content: 'keep me', author: 'Runner' }],
    },
    {
      id: 3, seedId: 'seed-real', author: 'Runner', createdAt: '2026-01-03T00:00:00.000Z',
      title: 'Race recap', content: 'legitimate body', views: 9, commentsCount: 0,
      likesCount: 2, dislikesCount: 0, reportsCount: 0, comments: [],
    },
  ];
}

async function mutationInput(repository, approvedPostIds) {
  const report = await createReport({ repository, generatedAt: '2026-07-17T00:00:00.000Z' });
  return {
    repository,
    report,
    approval: { approvedPostIds, reportChecksum: report.reportChecksum },
    backupReceipt: { verified: true, databaseChecksum: await repository.checksum() },
    actor: '00000000-0000-4000-8000-000000000001',
    at: '2026-07-17T00:01:00.000Z',
  };
}

test('default CLI mode is a report-only dry run', () => {
  assert.deepEqual(parseArgs([]), { mode: 'report', write: false });
});
test('write CLI requires an explicit valid actor UUID before database work', () => {
  const invalidActors = [[], ['--actor', 'not-a-uuid'], ['--actor', '   '], ['--actor', '00000000-0000-4000-8000-000000000001;DROP TABLE users']];
  for (const actorArgs of invalidActors) {
    assert.throws(() => parseArgs(['--write', ...actorArgs]), /--write requires --actor to be a valid user UUID/);
  }
  assert.equal(parseArgs(['--write', '--actor', '00000000-0000-4000-8000-000000000001']).actor, '00000000-0000-4000-8000-000000000001');
});

test('executeMutation rejects an invalid actor before opening a transaction', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const input = await mutationInput(repository, [1]);
  await assert.rejects(executeMutation({ ...input, actor: 'qa-admin' }), /Mutation actor must be a valid user UUID/);
  assert.equal(repository.transactions, 0);
});

test('workspace path policy rejects symlink and junction escapes for every CLI file role', (t) => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-quarantine-outside-'));
  const link = path.join(ROOT, `.tmp-quarantine-link-${process.pid}-${Date.now()}`);
  t.after(() => {
    fs.rmSync(link, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  try {
    fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.skip(`Directory links are unavailable: ${error.code || error.message}`);
    return;
  }

  for (const filename of [
    'report.json',
    'approval.json',
    'backup-receipt.json',
    'backup-artifact.dump',
    'fixture-db.json',
  ]) {
    const escaped = path.relative(ROOT, path.join(link, filename));
    assert.throws(() => workspacePath(escaped), /real path must stay inside workspace/u);
  }
});

test('quarantine mutates only explicitly approved candidate IDs', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const input = await mutationInput(repository, [1]);

  const result = await executeMutation(input);

  assert.deepEqual(result, { mode: 'quarantine', postIds: [1], committed: true });
  assert.deepEqual(repository.quarantines.map((row) => row.postId), [1]);
});

test('one missing approved ID rejects the entire transaction', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const input = await mutationInput(repository, [1, 999]);

  await assert.rejects(executeMutation(input), /Approved post IDs do not exist: 999/);

  assert.equal(repository.mutations, 0);
  assert.deepEqual(repository.quarantines, []);
});

test('a commented post is rejected without separate human approval', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const input = await mutationInput(repository, [2]);

  await assert.rejects(executeMutation(input), /Commented posts require separate human approval: 2/);

  assert.equal(repository.mutations, 0);
});

test('a separately documented human approval permits a commented post', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const input = await mutationInput(repository, [2]);
  const commentApproval = {
    approvedPostIds: [2], actor: '00000000-0000-4000-8000-000000000002',
    approvedAt: '2026-07-17T00:00:00.000Z', reason: 'Comment reviewed by a human',
  };
  const result = await executeMutation({ ...input, commentApproval });
  assert.deepEqual(result.postIds, [2]);
  assert.equal(repository.quarantines.length, 1);
});

test('restore roundtrip preserves post content, comments, counters, and checksum', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const before = structuredClone(repository.posts);
  const checksum = await repository.checksum();
  const quarantineInput = await mutationInput(repository, [1]);
  await executeMutation(quarantineInput);

  const restoreInput = await mutationInput(repository, [1]);
  await executeMutation({ ...restoreInput, mode: 'restore' });

  assert.deepEqual(repository.posts, before);
  assert.equal(await repository.checksum(), checksum);
  assert.ok(repository.quarantines[0].restoredAt);
});

test('duplicate approved IDs reject before mutation', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const input = await mutationInput(repository, [1, 1]);
  await assert.rejects(executeMutation(input), /Duplicate approved post IDs/);
  assert.equal(repository.mutations, 0);
});

test('state changed after reporting rejects the entire transaction', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const input = await mutationInput(repository, [1]);
  repository.posts[0].views += 1;
  input.backupReceipt.databaseChecksum = await repository.checksum();
  await assert.rejects(executeMutation(input), /Post state changed after report: 1/);
  assert.equal(repository.mutations, 0);
});

test('visibility changed after reporting rejects the entire transaction', async () => {
  const repository = new MemoryRepository(fixturePosts());
  const input = await mutationInput(repository, [1]);
  repository.posts[0].deletedAt = '2026-07-17T00:00:30.000Z';
  input.backupReceipt.databaseChecksum = await repository.checksum();
  await assert.rejects(executeMutation(input), /Post state changed after report: 1/);
  assert.equal(repository.mutations, 0);
});

test('repeated interruption rolls back without a success result', async () => {
  const repository = new MemoryRepository(fixturePosts());
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const input = await mutationInput(repository, [1]);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(executeMutation({ ...input, signal: controller.signal }), /cancelled before commit/);
  }
  assert.equal(repository.mutations, 0);
  assert.deepEqual(repository.quarantines, []);
});

test('rerun is idempotent and cannot create a second active quarantine', async () => {
  const repository = new MemoryRepository(fixturePosts());
  await executeMutation(await mutationInput(repository, [1]));
  await assert.rejects(executeMutation(await mutationInput(repository, [1])), /already has an active quarantine/);
  assert.equal(repository.quarantines.length, 1);
});

test('hung PostgreSQL work is cancelled by destroying the checked-out client', async () => {
  let rejectQuery;
  const client = {
    query: () => new Promise((resolve, reject) => { rejectQuery = reject; }),
    release: (error) => rejectQuery(error),
  };
  const repository = require('../../scripts/community-post-quarantine').postgresRepository({
    connect: async () => client,
  });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5);

  await assert.rejects(repository.transaction(async () => {}, controller.signal), /cancelled before commit/);
});

test('PostgreSQL writes match Task 2 active/released quarantine columns', async () => {
  const queries = [];
  const client = {
    query: async (text, params = []) => {
      queries.push({ text, params });
      if (text.startsWith('UPDATE post_quarantines')) return { rowCount: 1, rows: [] };
      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };
  const repository = require('../../scripts/community-post-quarantine').postgresRepository({
    connect: async () => client,
  });
  const actor = '00000000-0000-4000-8000-000000000001';
  await repository.transaction(async (tx) => {
    await tx.quarantine(fixturePosts().slice(0, 1), { actor, at: '2026-07-17T00:00:00.000Z', reason: 'approved' });
    await tx.restore([1], { actor, at: '2026-07-17T00:01:00.000Z' });
  });

  assert.match(queries.find((query) => query.text.includes('INSERT INTO')).text, /reason_code/);
  assert.match(queries.find((query) => query.text.startsWith('UPDATE')).text, /status='released'.*released_at/);
  assert.equal(queries.find((query) => query.text.includes('INSERT INTO')).params[3], actor);
});
