import type { MagazineCorrection } from '../../api/editorialPublic';

type MagazineCorrectionTimelineProps = {
  readonly corrections: readonly MagazineCorrection[];
};

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function MagazineCorrectionTimeline({ corrections }: MagazineCorrectionTimelineProps) {
  if (corrections.length === 0) return null;

  return (
    <section className="border-t border-sky-100 p-5 sm:p-6" aria-labelledby="magazine-corrections-title">
      <h2 id="magazine-corrections-title" className="font-bold text-neutral-900">바로잡은 내용</h2>
      <ol className="mt-3 space-y-3">
        {corrections.map((correction) => (
          <li key={`${correction.revisionNumber}-${correction.createdAt}`} className="min-w-0 rounded-xl border border-neutral-200 bg-white/80 p-4">
            <p className="break-words text-sm leading-6 text-neutral-700">{correction.publicSummary}</p>
            <time className="mt-1 block text-xs text-neutral-400" dateTime={correction.createdAt}>
              {dateLabel(correction.createdAt)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
