import type { ReactNode } from 'react';
import type { SeasonRecordTable } from '../../../api/recordAnalytics';
import { Button } from '../../../components/ui/button';
import { CardContent } from '../../../components/ui/card';
import { scopeCount } from '../../../config/dataPolicy';
import type { SeasonRecovery, SeasonSelection } from './seasonNavigation';
import { SeasonRecordRows } from './SeasonRecordRows';

type SeasonRecordResultsProps = {
  readonly table: SeasonRecordTable | null;
  readonly state: 'idle' | 'loading' | 'ready' | 'error';
  readonly highlightedRow: SeasonRecordTable['rows'][number] | null;
  readonly recovery: SeasonRecovery | null;
  readonly onRecover: (selection: SeasonSelection) => void;
  readonly onRetry: () => void;
};

export function SeasonRecordResults({
  table,
  state,
  highlightedRow,
  recovery,
  onRecover,
  onRetry,
}: SeasonRecordResultsProps) {
  const isEmpty = state === 'ready' && (!table || table.rows.length === 0);

  return (
    <CardContent
      id="season-record-results"
      aria-busy={state === 'loading'}
      aria-live="polite"
    >
      {highlightedRow && state === 'ready' && (
        <div className="mb-4 border border-brand bg-brand/5 p-4">
          <p className="text-xs font-semibold text-brand">선택한 선수 표시</p>
          <p className="mt-1 text-sm text-ink">
            {highlightedRow.name} · {highlightedRow.rank}번째 기록 · {highlightedRow.record}
          </p>
        </div>
      )}

      {state === 'loading' && (
        <StatusNotice
          role="status"
          title="시즌 기록표를 불러오는 중입니다"
          description="선택한 조건의 공개 기록을 정렬하고 있습니다."
        />
      )}

      {state === 'error' && (
        <StatusNotice
          role="alert"
          title="시즌 기록표를 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
          action={<Button type="button" variant="outline" onClick={onRetry}>다시 시도</Button>}
        />
      )}

      {isEmpty && (
        <StatusNotice
          role="status"
          title={(
            <>
              이 조합은 아직 정리 <span className="whitespace-nowrap">중이에요</span>
            </>
          )}
          description={(
            <>
              유효한 경기 부문이지만 지금 보여드릴 공개 기록이 없습니다. 자동으로{' '}
              <span className="whitespace-nowrap">다른 조건으로 바꾸지 않아요.</span>
            </>
          )}
          action={(
            <div className="flex flex-wrap gap-2">
              {recovery && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRecover(recovery.selection)}
                >
                  {recovery.kind === 'nearest' ? '가장 가까운 시즌 보기' : '기본 시즌 보기'}
                </Button>
              )}
              <Button asChild variant="link">
                <a href="/about-data">데이터 안내 보기</a>
              </Button>
            </div>
          )}
        />
      )}

      {table && state === 'ready' && table.rows.length > 0 && (
        <>
          <div aria-live="polite" className="mb-3 flex flex-col gap-1 text-xs text-ink-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{table.season} · {table.eventLabel} · {table.divisionLabel}</span>
            <span>{scopeCount(table.totalIndexedAthletes, '명')}</span>
          </div>
          <SeasonRecordRows table={table} />
          <p className="mt-3 text-xs leading-5 text-ink-4">{table.disclaimer}</p>
        </>
      )}
    </CardContent>
  );
}

function StatusNotice({
  title,
  description,
  role,
  action,
}: {
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly role: 'status' | 'alert';
  readonly action?: ReactNode;
}) {
  return (
    <div role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'} className="border border-line bg-surface-2 p-5">
      <p className="break-keep [text-wrap:pretty] text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 break-keep [text-wrap:pretty] text-sm leading-6 text-ink-3">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
