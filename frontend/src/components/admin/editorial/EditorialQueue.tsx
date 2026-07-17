import type { EditorialCalendarEntry, EditorialIssue } from '../../../api/editorialAdmin';
import { SECTION_LABELS, formatKst } from './editorialLabels';

type EditorialQueueProps = {
  readonly candidates: readonly EditorialCalendarEntry[];
  readonly issues: readonly EditorialIssue[];
  readonly selectedCalendarId: string | null;
  readonly selectedIssueId: string | null;
  readonly onSelectCalendar: (entry: EditorialCalendarEntry) => void;
  readonly onSelectIssue: (issue: EditorialIssue) => void;
};

export function EditorialQueue({
  candidates,
  issues,
  selectedCalendarId,
  selectedIssueId,
  onSelectCalendar,
  onSelectIssue,
}: EditorialQueueProps) {
  if (candidates.length === 0 && issues.length === 0) {
    return (
      <div className="border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-ink-3">
        이 단계에 담긴 항목이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label="편집 항목 목록">
      {candidates.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onSelectCalendar(entry)}
          className={`w-full border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
            selectedCalendarId === entry.id ? 'border-brand bg-primary-50' : 'border-line bg-surface hover:border-line-2'
          }`}
        >
          <span className="t-mono-xs">{entry.seasonYear} / SLOT {entry.slot}</span>
          <span className="mt-1 block font-semibold text-ink">{SECTION_LABELS[entry.sectionKey]}</span>
          <span className="mt-1 block text-xs text-ink-3">
            {entry.state === 'skipped' ? `발행하지 않음 · ${entry.skipReason ?? '사유 확인 필요'}` : formatKst(entry.scheduledFor)}
          </span>
        </button>
      ))}
      {issues.map((issue) => (
        <button
          key={issue.id}
          type="button"
          onClick={() => onSelectIssue(issue)}
          className={`w-full border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
            selectedIssueId === issue.id ? 'border-brand bg-primary-50' : 'border-line bg-surface hover:border-line-2'
          }`}
        >
          <span className="t-mono-xs">{SECTION_LABELS[issue.sectionKey]} / V{issue.version}</span>
          <span className="mt-1 block truncate font-semibold text-ink">{issue.title}</span>
          <span className="mt-1 block text-xs text-ink-3">
            {issue.status === 'scheduled' ? formatKst(issue.scheduledFor) : `상태 · ${issue.status}`}
          </span>
        </button>
      ))}
    </div>
  );
}
