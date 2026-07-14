const crypto = require('crypto');

function publicView(record) {
  return {
    type: record.type,
    status: record.status,
    version: record.version,
    receivedAt: record.receivedAt,
    updatedAt: record.updatedAt,
  };
}

class MemoryDataRightsRepository {
  constructor() {
    this.requests = [];
    this.suppressions = [];
    this.metrics = new Map();
  }

  async createRequest({ publicTicketHash, ticketHint, request }) {
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      publicTicketHash,
      ticketHint,
      ...request,
      status: 'received',
      version: 1,
      receivedAt: now,
      updatedAt: now,
      history: [{ status: 'received', at: now, note: '요청 접수', version: 1 }],
    };
    this.requests.push(record);
    return publicView(record);
  }

  async findPublicStatus({ publicTicketHash }) {
    const record = this.requests.find((item) => item.publicTicketHash === publicTicketHash);
    return record ? publicView(record) : null;
  }

  async listRequests({ status } = {}) {
    return this.requests
      .filter((item) => !status || item.status === status)
      .map(({ reason: _reason, contact: _contact, publicTicketHash: _hash, history: _history, ...item }) => item);
  }

  async getRequestDetail(id) {
    const record = this.requests.find((item) => item.id === id);
    if (!record) return null;
    const { publicTicketHash: _hash, ...detail } = record;
    return detail;
  }

  async updateStatus({ id, nextStatus, note, expectedVersion }) {
    const record = this.requests.find((item) => item.id === id);
    if (!record) return { kind: 'not_found' };
    if (record.version !== expectedVersion) {
      return { kind: 'conflict', currentVersion: record.version };
    }

    const mode = { under_review: 'mask', search_hidden: 'hide', removed: 'remove' }[nextStatus];
    const hasRecordScope = record.recordKey
      || record.sourceId
      || (record.competition && record.event);
    if (mode && !hasRecordScope) return { kind: 'invalid_scope' };

    const now = new Date().toISOString();
    record.status = nextStatus;
    record.version += 1;
    record.updatedAt = now;
    record.history.push({ status: nextStatus, at: now, note, version: record.version });
    this.suppressions = this.suppressions.filter((item) => item.requestId !== id);
    if (mode) {
      this.suppressions.push({
        id: crypto.randomUUID(),
        requestId: id,
        athleteName: record.athleteName,
        affiliation: record.affiliation,
        competition: record.competition,
        event: record.event,
        mode,
        since: now,
      });
    }
    return {
      kind: 'updated',
      id,
      status: nextStatus,
      version: record.version,
      suppressions: await this.listActiveSuppressions(),
    };
  }

  async listActiveSuppressions() {
    return this.suppressions.map((item) => ({ ...item }));
  }

  async recordSearchMetric(metric) {
    const key = Object.values(metric).join('|');
    const current = this.metrics.get(key) || { ...metric, count: 0 };
    current.count += 1;
    this.metrics.set(key, current);
  }

  async getSearchMetricSummary(limit = 20) {
    const rows = [...this.metrics.values()].sort((a, b) => b.count - a.count);
    const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
    return rows.slice(0, limit).map((row) => ({ ...row, total_count: totalCount }));
  }

  async purgeExpiredContacts() {
    return 0;
  }

  async purgeExpiredData() {
    return { requests: 0, contacts: 0, metrics: 0, suppressions: 0 };
  }

  async healthCheck() {
    return true;
  }

  async close() {}
}

module.exports = { MemoryDataRightsRepository };
