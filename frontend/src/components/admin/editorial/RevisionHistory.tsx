import type { EditorialRevision } from '../../../api/editorialAdmin';
import { formatKst } from './editorialLabels';

type RevisionHistoryProps = {
  readonly revisions: readonly EditorialRevision[];
};

export function RevisionHistory({ revisions }: RevisionHistoryProps) {
  return (
    <section className="border border-line bg-surface p-4" aria-labelledby="revision-heading">
      <p className="t-mono-xs">REVISION LEDGER</p>
      <h2 id="revision-heading" className="mt-1 text-base font-bold text-ink">수정 이력</h2>
      {revisions.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">저장된 수정 이력이 없습니다.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {revisions.map((revision, index) => {
            const previous = revisions[index + 1];
            const characterDelta = previous ? revision.content.length - previous.content.length : revision.content.length;
            return (
              <li key={revision.id} className="border-l-2 border-line pl-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold tabular-nums text-ink">V{revision.revisionNumber}</span>
                  <span className="font-mono text-[10px] tabular-nums text-ink-4">
                    {characterDelta >= 0 ? '+' : ''}{characterDelta}자
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-ink-2">{revision.title}</p>
                <p className="mt-1 text-xs text-ink-3">{revision.reviewNote || '최초 작성'} · {formatKst(revision.createdAt)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
