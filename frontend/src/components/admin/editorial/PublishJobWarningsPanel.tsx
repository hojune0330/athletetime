import { useState } from 'react';
import type { EditorialIssue, EditorialPublishJobWarning } from '../../../api/editorialAdmin';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { formatKst } from './editorialLabels';

type PublishJobWarningsPanelProps = {
  readonly issue: EditorialIssue | null;
  readonly warning: EditorialPublishJobWarning | null;
  readonly busy: boolean;
  readonly onRetry: (localKstDateTime: string, note: string) => Promise<void>;
};

function statusLabel(status: EditorialPublishJobWarning['status']): string {
  switch (status) {
    case 'retrying':
      return '재시도 중';
    case 'failed':
      return '실패';
    case 'queued':
      return '대기';
    case 'completed':
      return '완료';
    default:
      return status;
  }
}

export function PublishJobWarningsPanel({
  issue,
  warning,
  busy,
  onRetry,
}: PublishJobWarningsPanelProps) {
  const [scheduledFor, setScheduledFor] = useState('');
  const [note, setNote] = useState('');

  if (!issue || !warning) return null;

  const retryAvailable = warning.status === 'failed';
  return (
    <section className="border border-warn/30 bg-warn/5 p-4">
      <p className="t-mono-xs text-warn">PUBLISH WARNING</p>
      <h2 className="mt-1 text-body font-semibold text-ink">발행 작업 확인</h2>
      <dl className="mt-3 grid gap-2 text-body-sm">
        <JobRow label="상태" value={statusLabel(warning.status)} />
        <JobRow label="시도 횟수" value={String(warning.attemptCount)} />
        <JobRow label="다음 시도" value={formatKst(warning.nextAttemptAt)} />
        <JobRow label="문제 코드" value={warning.errorCode ?? '확인할 코드 없음'} />
      </dl>
      <p className="mt-3 text-caption leading-5 text-ink-3">
        상세 오류와 시스템 식별값은 이 화면에 표시하지 않습니다.
      </p>
      {retryAvailable && (
        <div className="mt-4 border-t border-warn/25 pt-4">
          <label className="block text-caption font-semibold text-ink-2">
            다시 예약할 시각 · 한국 시간(KST)
            <Input
              className="mt-1 font-mono tabular-nums"
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
            />
          </label>
          <label className="mt-3 block text-caption font-semibold text-ink-2">
            재예약 사유
            <textarea
              className="mt-1 min-h-20 w-full rounded-sm border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-brand focus:outline-none"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              placeholder="확인한 내용을 남겨 주세요"
            />
          </label>
          <Button
            type="button"
            className="mt-3"
            size="sm"
            disabled={busy || !scheduledFor || !note.trim()}
            onClick={() => onRetry(scheduledFor, note.trim())}
          >
            다시 예약
          </Button>
        </div>
      )}
    </section>
  );
}

function JobRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
      <dt className="text-ink-4">{label}</dt>
      <dd className="min-w-0 break-words font-mono text-caption text-ink">{value}</dd>
    </div>
  );
}
