const CONTACT_PURGE_INTERVAL_MS = 60 * 60 * 1000;

function startContactPurgeSchedule({
  purge,
  scheduleInterval = setInterval,
  cancelInterval = clearInterval,
  onError = () => console.error('[data-rights] scheduled contact purge failed'),
}) {
  const timer = scheduleInterval(async () => {
    try {
      await purge();
    } catch {
      onError();
    }
  }, CONTACT_PURGE_INTERVAL_MS);
  if (typeof timer?.unref === 'function') timer.unref();
  return () => cancelInterval(timer);
}

module.exports = { CONTACT_PURGE_INTERVAL_MS, startContactPurgeSchedule };
