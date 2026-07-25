import { ArrowTopRightOnSquareIcon, LinkIcon } from '@heroicons/react/24/outline';
import type { MagazineSource } from '../../api/editorialPublic';

type MagazineSourceListProps = {
  readonly sources: readonly MagazineSource[];
};

export function MagazineSourceList({ sources }: MagazineSourceListProps) {
  return (
    <section className="min-w-0" aria-labelledby="magazine-sources-title">
      <h2 id="magazine-sources-title" className="flex items-center gap-2 font-bold text-neutral-900">
        <LinkIcon className="h-5 w-5 text-sky-600" />
        출처
      </h2>
      <div className="mt-3 space-y-2">
        {sources.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-white/70 p-3 text-sm leading-6 text-neutral-500">
            공개된 출처가 아직 없어요.
          </p>
        ) : sources.map((source) => (
          <a
            key={source.id}
            href={source.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${source.title} 원문 열기`}
            className="flex min-w-0 items-start gap-2 rounded-xl border border-neutral-200 bg-white/80 p-3 text-sm text-neutral-700 transition-colors hover:border-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            <span className="min-w-0 flex-1">
              <span className="block break-words font-medium leading-5">{source.title}</span>
              {source.publisher && (
                <span className="mt-1 block break-words text-xs leading-5 text-neutral-500">{source.publisher}</span>
              )}
            </span>
            <ArrowTopRightOnSquareIcon className="mt-0.5 h-4 w-4 shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
