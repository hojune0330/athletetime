const CONTACT_PURGE_INTERVAL_MS = 60 * 60 * 1000;
const SUPPRESSION_REFRESH_INTERVAL_MS = 5000;

function startRecurringSchedule({
  run,
  intervalMs,
  scheduleInterval = setInterval,
  cancelInterval = clearInterval,
  onError,
}) {
  const timer = scheduleInterval(async () => {
    try {
      await run();
    } catch {
      onError();
    }
  }, intervalMs);
  if (typeof timer?.unref === 'function') timer.unref();
  return () => cancelInterval(timer);
}

function startContactPurgeSchedule(options) {
  return startRecurringSchedule({
    run: options.purge,
    intervalMs: CONTACT_PURGE_INTERVAL_MS,
    onError: () => console.error('[data-rights] scheduled retention purge failed'),
    ...options,
  });
}

function startSuppressionRefreshSchedule(options) {
  return startRecurringSchedule({
    run: options.refresh,
    intervalMs: SUPPRESSION_REFRESH_INTERVAL_MS,
    onError: () => console.error('[data-rights] scheduled suppression refresh failed'),
    ...options,
  });
}

function startDataRightsSchedules(options) {
  const stops = [startSuppressionRefreshSchedule({
    refresh: options.refresh,
    scheduleInterval: options.scheduleSuppressionInterval,
    cancelInterval: options.cancelSuppressionInterval,
  })];
  if (options.purge) {
    stops.push(startContactPurgeSchedule({
      purge: options.purge,
      scheduleInterval: options.scheduleInterval,
      cancelInterval: options.cancelInterval,
    }));
  }
  return () => stops.forEach((stop) => stop());
}

module.exports = {
  CONTACT_PURGE_INTERVAL_MS,
  SUPPRESSION_REFRESH_INTERVAL_MS,
  startContactPurgeSchedule,
  startDataRightsSchedules,
  startSuppressionRefreshSchedule,
};
