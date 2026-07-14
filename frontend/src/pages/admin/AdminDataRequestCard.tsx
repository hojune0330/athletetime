import { Button } from '../../components/ui/button';
import {
  STATUS_LABELS,
  TYPE_LABELS,
  type AdminDataRequest,
  type AdminDataRequestDetail,
  type DataRequestStatus,
} from '../../api/dataRequests';

const STATUS_COLOR: Readonly<Record<DataRequestStatus, string>> = {
  received: 'text-brand-600',
  under_review: 'text-warn',
  search_hidden: 'text-brand-500',
  corrected: 'text-ok',
  removed: 'text-err',
  restored: 'text-ok',
};

type Props = {
  readonly request: AdminDataRequest;
  readonly detail: AdminDataRequestDetail | null;
  readonly busy: boolean;
  readonly onOpenDetail: (id: string) => Promise<void>;
  readonly onCloseDetail: () => void;
  readonly onChangeStatus: (
    request: AdminDataRequest,
    status: DataRequestStatus,
  ) => Promise<void>;
};

export function AdminDataRequestCard({
  request,
  detail,
  busy,
  onOpenDetail,
  onCloseDetail,
  onChangeStatus,
}: Props) {
  return (
    <article className="border border-hair bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hair bg-surface-2 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-body-sm text-ink">
            접수번호 끝 {request.ticketHint}
          </span>
          <span className="border border-hair bg-surface px-2 py-0.5 text-caption text-ink-2">
            {TYPE_LABELS[request.type]}
          </span>
        </div>
        <span className={`font-mono text-mono-xs uppercase tracking-widest-2 ${STATUS_COLOR[request.status]}`}>
          {STATUS_LABELS[request.status]}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-caption sm:grid-cols-4">
          <Cell label="선수명" value={request.athleteName} />
          <Cell label="소속" value={request.affiliation || '—'} />
          <Cell label="대회" value={request.competition || '—'} />
          <Cell label="종목" value={request.event || '—'} />
        </dl>

        {detail?.id === request.id ? (
          <div>
            <p className="text-caption uppercase tracking-wider-2 text-ink-4">민감 상세</p>
            <p className="mt-1 whitespace-pre-wrap text-body-sm text-ink-2">{detail.reason}</p>
            {detail.contact && <p className="mt-2 text-body-sm text-ink-2">연락처 {detail.contact}</p>}
            <Button className="mt-2" size="sm" variant="ghost" onClick={onCloseDetail}>
              상세 닫기
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onOpenDetail(request.id)}>
            민감 상세 열기
          </Button>
        )}

        <p className="font-mono text-mono-xs text-ink-4">
          접수 {new Date(request.receivedAt).toLocaleString('ko-KR')} · 갱신{' '}
          {new Date(request.updatedAt).toLocaleString('ko-KR')}
        </p>

        <div className="flex flex-wrap gap-2 border-t border-hair pt-3">
          <StatusButton request={request} status="search_hidden" busy={busy} onChange={onChangeStatus}>
            검색 비노출
          </StatusButton>
          <StatusButton request={request} status="under_review" busy={busy} onChange={onChangeStatus}>
            검토중(마스킹)
          </StatusButton>
          <StatusButton request={request} status="corrected" busy={busy} onChange={onChangeStatus}>
            정정 완료
          </StatusButton>
          <StatusButton request={request} status="removed" busy={busy} onChange={onChangeStatus}>
            삭제(예외)
          </StatusButton>
          <StatusButton request={request} status="restored" busy={busy} onChange={onChangeStatus}>
            유지(원복)
          </StatusButton>
        </div>
      </div>
    </article>
  );
}

type StatusButtonProps = {
  readonly request: AdminDataRequest;
  readonly status: DataRequestStatus;
  readonly busy: boolean;
  readonly onChange: (request: AdminDataRequest, status: DataRequestStatus) => Promise<void>;
  readonly children: string;
};

function StatusButton({ request, status, busy, onChange, children }: StatusButtonProps) {
  const destructive = status === 'removed';
  return (
    <Button
      size="sm"
      variant={destructive ? 'destructive' : status === 'search_hidden' || status === 'under_review' ? 'outline' : 'ghost'}
      disabled={busy || request.status === status}
      onClick={() => onChange(request, status)}
      title={destructive ? '예외적 조치: 모든 노출에서 제외' : undefined}
    >
      {children}
    </Button>
  );
}

function Cell({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-ink-4">{label}</dt>
      <dd className="text-ink-2">{value}</dd>
    </div>
  );
}
