const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createEditorialScheduler,
} = require('../../card-studio/services/editorialScheduler');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function timerHarness() {
  const timers = [];
  const cancelled = [];
  return {
    timers,
    cancelled,
    scheduleInterval(callback, delay) {
      const timer = { callback, delay, unrefCalled: false, unref() { this.unrefCalled = true; } };
      timers.push(timer);
      return timer;
    },
    cancelInterval(timer) { cancelled.push(timer); },
  };
}

function fakeRepository(overrides = {}) {
  const calls = { actor: 0, process: 0 };
  return {
    calls,
    async validateActorAdmin() { calls.actor += 1; return true; },
    async processDueJobs() {
      calls.process += 1;
      return { processed: 0, completed: 0, retrying: 0, failed: 0 };
    },
    ...overrides,
  };
}

test('EDITORIAL-SCHEDULER-LIFECYCLE-001: Given the default flag When started Then no timer, actor lookup, or write occurs', async () => {
  // Given
  const repository = fakeRepository();
  const timers = timerHarness();
  const scheduler = createEditorialScheduler({ repository, environment: {}, ...timers });

  // When
  await scheduler.start();
  await scheduler.runOnce();

  // Then
  assert.deepEqual(scheduler.readiness(), {
    enabled: false, ready: true, state: 'disabled', errorCode: null,
  });
  assert.deepEqual(repository.calls, { actor: 0, process: 0 });
  assert.equal(timers.timers.length, 0);
});

test('EDITORIAL-SCHEDULER-LIFECYCLE-002: Given unsafe configuration When started Then readiness exposes only a safe reason and fails closed', async () => {
  // Given
  const cases = [
    [{ EDITORIAL_SCHEDULER_ENABLED: 'yes' }, 'EDITORIAL_SCHEDULER_FLAG_INVALID'],
    [{ EDITORIAL_SCHEDULER_ENABLED: 'true' }, 'EDITORIAL_SCHEDULER_ACTOR_MISSING'],
    [{ EDITORIAL_SCHEDULER_ENABLED: 'true', EDITORIAL_SCHEDULER_ACTOR_ID: 'not-a-uuid' }, 'EDITORIAL_SCHEDULER_ACTOR_INVALID'],
  ];

  for (const [environment, errorCode] of cases) {
    const repository = fakeRepository();
    const timers = timerHarness();
    const scheduler = createEditorialScheduler({ repository, environment, ...timers });

    // When
    await scheduler.start();

    // Then
    assert.equal(scheduler.readiness().ready, false);
    assert.equal(scheduler.readiness().errorCode, errorCode);
    assert.equal(JSON.stringify(scheduler.readiness()).includes('not-a-uuid'), false);
    assert.deepEqual(repository.calls, { actor: 0, process: 0 });
    assert.equal(timers.timers.length, 0);
  }
});

test('EDITORIAL-SCHEDULER-LIFECYCLE-003: Given a non-admin actor When started Then scheduler writes stay off', async () => {
  // Given
  const repository = fakeRepository({ async validateActorAdmin() { return false; } });
  const timers = timerHarness();
  const scheduler = createEditorialScheduler({
    repository,
    environment: {
      EDITORIAL_SCHEDULER_ENABLED: 'true',
      EDITORIAL_SCHEDULER_ACTOR_ID: ACTOR_ID,
    },
    ...timers,
  });

  // When
  await scheduler.start();
  await scheduler.runOnce();

  // Then
  assert.equal(scheduler.readiness().errorCode, 'EDITORIAL_SCHEDULER_ACTOR_NOT_ADMIN');
  assert.equal(repository.calls.process, 0);
  assert.equal(timers.timers.length, 0);
});

test('EDITORIAL-SCHEDULER-LIFECYCLE-004: Given overlapping wakes When a transaction is active Then only one run starts and stop waits for it', async () => {
  // Given
  const started = deferred();
  const release = deferred();
  let processCalls = 0;
  let continueCheck;
  const repository = fakeRepository({
    async processDueJobs(input) {
      processCalls += 1;
      continueCheck = input.shouldContinue;
      started.resolve();
      await release.promise;
      return { processed: 1, completed: 1, retrying: 0, failed: 0 };
    },
  });
  const timers = timerHarness();
  const scheduler = createEditorialScheduler({
    repository,
    environment: {
      EDITORIAL_SCHEDULER_ENABLED: 'true',
      EDITORIAL_SCHEDULER_ACTOR_ID: ACTOR_ID,
    },
    ...timers,
  });
  await scheduler.start();

  // When
  const firstRun = timers.timers[0].callback();
  await started.promise;
  const repeatedRun = scheduler.runOnce();
  let stopped = false;
  const stop = scheduler.stop().then(() => { stopped = true; });

  // Then
  assert.equal(processCalls, 1);
  assert.equal(stopped, false);
  assert.equal(continueCheck(), false);
  assert.equal(timers.cancelled.length, 1);
  release.resolve();
  await Promise.all([firstRun, repeatedRun, stop]);
  assert.equal(stopped, true);
  assert.equal(scheduler.readiness().state, 'stopped');
});

test('EDITORIAL-SCHEDULER-LIFECYCLE-005: Given an overdue persistent job after restart When the new timer wakes Then the new instance processes it', async () => {
  // Given
  const repository = fakeRepository();
  const firstTimers = timerHarness();
  const first = createEditorialScheduler({
    repository,
    environment: {
      EDITORIAL_SCHEDULER_ENABLED: 'true',
      EDITORIAL_SCHEDULER_ACTOR_ID: ACTOR_ID,
    },
    ...firstTimers,
  });
  await first.start();
  await first.stop();
  const restartedTimers = timerHarness();
  const restarted = createEditorialScheduler({
    repository,
    environment: {
      EDITORIAL_SCHEDULER_ENABLED: 'true',
      EDITORIAL_SCHEDULER_ACTOR_ID: ACTOR_ID,
    },
    ...restartedTimers,
  });
  await restarted.start();

  // When
  await restartedTimers.timers[0].callback();

  // Then
  assert.equal(repository.calls.process, 1);
  await restarted.stop();
});
