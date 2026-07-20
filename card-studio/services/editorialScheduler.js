const {
  EditorialSchedulerRepository,
} = require('../repositories/editorialSchedulerRepository');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const EMPTY_SUMMARY = Object.freeze({
  processed: 0, completed: 0, retrying: 0, failed: 0,
});

function schedulerConfig(environment) {
  const flag = environment.EDITORIAL_SCHEDULER_ENABLED;
  if (flag == null || flag === '' || flag === 'false') {
    return { enabled: false, actorUserId: null, errorCode: null };
  }
  if (flag !== 'true') {
    return { enabled: false, actorUserId: null, errorCode: 'EDITORIAL_SCHEDULER_FLAG_INVALID' };
  }
  const actorUserId = environment.EDITORIAL_SCHEDULER_ACTOR_ID;
  if (typeof actorUserId !== 'string' || actorUserId.trim() === '') {
    return { enabled: true, actorUserId: null, errorCode: 'EDITORIAL_SCHEDULER_ACTOR_MISSING' };
  }
  if (!UUID_PATTERN.test(actorUserId)) {
    return { enabled: true, actorUserId: null, errorCode: 'EDITORIAL_SCHEDULER_ACTOR_INVALID' };
  }
  return { enabled: true, actorUserId, errorCode: null };
}

class EditorialScheduler {
  constructor(options) {
    this.config = schedulerConfig(options.environment || process.env);
    this.repository = options.repository
      || (options.pool ? new EditorialSchedulerRepository(options.pool) : null);
    this.clock = options.clock || (() => new Date());
    this.scheduleInterval = options.scheduleInterval || setInterval;
    this.cancelInterval = options.cancelInterval || clearInterval;
    this.intervalMs = options.intervalMs || 30_000;
    this.maxJobs = options.maxJobs || 100;
    this.logger = options.logger || console;
    this.timer = null;
    this.activeRun = null;
    this.running = false;
    this.ready = !this.config.enabled && this.config.errorCode == null;
    this.state = this.ready ? 'disabled' : (this.config.errorCode ? 'unavailable' : 'configured');
    this.errorCode = this.config.errorCode;
  }

  readiness() {
    return {
      enabled: this.config.enabled,
      ready: this.ready,
      state: this.state,
      errorCode: this.errorCode,
    };
  }

  async start() {
    if (!this.config.enabled || this.errorCode || this.running) return this.readiness();
    if (!this.repository) {
      this.failClosed('EDITORIAL_SCHEDULER_DATABASE_UNAVAILABLE');
      return this.readiness();
    }
    let admin = false;
    try {
      admin = await this.repository.validateActorAdmin(this.config.actorUserId);
    } catch {
      this.failClosed('EDITORIAL_SCHEDULER_ACTOR_LOOKUP_FAILED');
      return this.readiness();
    }
    if (!admin) {
      this.failClosed('EDITORIAL_SCHEDULER_ACTOR_NOT_ADMIN');
      return this.readiness();
    }

    this.running = true;
    this.ready = true;
    this.state = 'running';
    this.timer = this.scheduleInterval(() => this.runOnce(), this.intervalMs);
    if (typeof this.timer?.unref === 'function') this.timer.unref();
    return this.readiness();
  }

  async runOnce() {
    if (this.activeRun) return this.activeRun;
    if (!this.running || !this.ready) return { ...EMPTY_SUMMARY };
    const operation = this.repository.processDueJobs({
      actorUserId: this.config.actorUserId,
      now: this.clock,
      maxJobs: this.maxJobs,
      shouldContinue: () => this.running,
    });
    this.activeRun = operation;
    try {
      return await operation;
    } catch (error) {
      const code = error?.code === 'EDITORIAL_SCHEDULER_ACTOR_NOT_ADMIN'
        ? error.code
        : 'EDITORIAL_SCHEDULER_RUNTIME_ERROR';
      this.failClosed(code);
      this.logger.warn('Editorial scheduler stopped safely', { code });
      return { ...EMPTY_SUMMARY };
    } finally {
      if (this.activeRun === operation) this.activeRun = null;
    }
  }

  async stop() {
    if (this.timer) this.cancelInterval(this.timer);
    this.timer = null;
    this.running = false;
    if (this.state === 'running') this.state = 'stopping';
    if (this.activeRun) await this.activeRun.catch(() => {});
    if (!['disabled', 'unavailable'].includes(this.state)) {
      this.state = 'stopped';
      this.ready = true;
    }
    return this.readiness();
  }

  failClosed(code) {
    if (this.timer) this.cancelInterval(this.timer);
    this.timer = null;
    this.running = false;
    this.ready = false;
    this.state = 'unavailable';
    this.errorCode = code;
  }
}

function createEditorialScheduler(options = {}) {
  return new EditorialScheduler(options);
}

module.exports = { createEditorialScheduler };
