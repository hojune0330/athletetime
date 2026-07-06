import type { ResultMeta } from '../../api/competitions';
import { TRUST_NOTICE, resolveProviderLabel } from '../../config/dataPolicy';

type ResultSourceSummaryProps = {
  readonly meta: ResultMeta;
  readonly eventCount: number;
  readonly athleteCount: number;
  readonly onExpandAll: () => void;
  readonly onCollapseAll: () => void;
};

function resolveResultProvider(meta: ResultMeta): string {
  if (meta.sourceLabel) return meta.sourceLabel;
  if (meta.source === 'pacerise') return '실업육상연맹/PaceRise';
  return '대한육상연맹';
}

function formatCollectedDate(value: string): string {
  return value ? value.slice(0, 10) : '수집일 미상';
}

export function ResultSourceSummary({
  meta,
  eventCount,
  athleteCount,
  onExpandAll,
  onCollapseAll,
}: ResultSourceSummaryProps) {
  const providerLabel = resolveProviderLabel(resolveResultProvider(meta));
  const sourceUrl = (meta.sourceUrl || '').trim();

  return (
    <section aria-label="경기 결과 출처 요약" className="mt-4 border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-4">Source note</p>
            <h2 className="mt-1 text-base font-semibold text-ink">자료가 어디서 왔나요</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-3">
              {TRUST_NOTICE.collectedPublic}
            </p>
          </div>

          <div className="grid max-w-2xl gap-2 text-xs leading-5 text-ink-4 sm:grid-cols-2">
            <p>
              <span className="font-medium text-ink-3">범위</span> {TRUST_NOTICE.partial}
            </p>
            <p>
              <span className="font-medium text-ink-3">시점</span> {TRUST_NOTICE.snapshot}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="border border-hair bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2">
              {providerLabel}
            </span>
            <span className="border border-hair bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2">
              {formatCollectedDate(meta.collectedAt)}
            </span>
            <span className="border border-hair bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2">
              AthleteTime 정리
            </span>
            <span className="border border-hair bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2">
              공식 기록 서비스 아님
            </span>
          </div>
        </div>

        <div className="min-w-[180px] border border-hair bg-surface-2 p-3 text-sm text-ink-3">
          <p className="font-semibold text-ink">{meta.competition}</p>
          <p className="mt-1 text-xs leading-5 text-ink-3">
            {meta.period} · {meta.venue} · {meta.year}년
          </p>
          <p className="mt-2 text-xs text-ink-4">
            {eventCount}개 종목 · {athleteCount}명
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-3">
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
          >
            출처 확인
          </a>
        ) : (
          <span className="text-sm text-ink-4">원출처 링크가 아직 정리되지 않았어요.</span>
        )}

        <div className="flex gap-3 text-sm">
          <button type="button" onClick={onExpandAll} className="font-medium text-brand-600 hover:text-brand-700">
            모두 펼치기
          </button>
          <button type="button" onClick={onCollapseAll} className="font-medium text-brand-600 hover:text-brand-700">
            모두 접기
          </button>
        </div>
      </div>
    </section>
  );
}
