type ResultFreshnessBadgeProps = {
  readonly collectedAt?: string;
};

function daysBetween(from: Date, to: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(0, Math.floor((toDay - fromDay) / dayMs));
}

export function formatResultFreshnessLabel(collectedAt?: string, now: Date = new Date()): string {
  if (!collectedAt) return '수집일 미상';
  const collectedDate = new Date(collectedAt);
  if (Number.isNaN(collectedDate.getTime())) return '수집일 미상';
  const days = daysBetween(collectedDate, now);
  if (days === 0) return '오늘 수집';
  if (days === 1) return '1일 전 수집';
  return `${days}일 전 수집`;
}

export function ResultFreshnessBadge({ collectedAt }: ResultFreshnessBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
      {formatResultFreshnessLabel(collectedAt)}
    </span>
  );
}
