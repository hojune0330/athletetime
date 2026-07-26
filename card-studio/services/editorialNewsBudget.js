class EditorialNewsBudgetError extends Error {
  constructor(code) {
    super(code);
    this.name = 'EditorialNewsBudgetError';
    this.code = code;
  }
}

class EditorialNewsBudget {
  constructor({ state = {}, now = () => new Date() } = {}) {
    this.state = state;
    this.now = now;
  }

  reserve() {
    const now = this.now();
    const dayKey = now.toISOString().slice(0, 10);
    const monthKey = dayKey.slice(0, 7);
    if (this.state.dayKey && this.state.dayKey !== dayKey) this.state.day = 0;
    if (this.state.monthKey && this.state.monthKey !== monthKey) this.state.month = 0;
    this.state.dayKey = dayKey;
    this.state.monthKey = monthKey;
    this.state.day = Number.isInteger(this.state.day) ? this.state.day : 0;
    this.state.month = Number.isInteger(this.state.month) ? this.state.month : 0;
    if (this.state.day >= 40 || this.state.month >= 800) throw new EditorialNewsBudgetError('QUOTA_EXCEEDED');
    this.state.day += 1;
    this.state.month += 1;
  }

  snapshot() {
    return Object.freeze({ day: this.state.day || 0, month: this.state.month || 0, dayKey: this.state.dayKey, monthKey: this.state.monthKey });
  }
}

module.exports = { EditorialNewsBudget, EditorialNewsBudgetError };
