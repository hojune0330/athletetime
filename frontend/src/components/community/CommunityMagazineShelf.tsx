import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { getMagazineIssues } from '../../api/editorialPublic';
import { MagazineCard } from './MagazineCard';

export function CommunityMagazineShelf() {
  const { data, isError } = useQuery({
    queryKey: ['editorial', 'magazine', 'community-shelf'],
    queryFn: () => getMagazineIssues(5),
    staleTime: 60_000,
    retry: 1,
  });
  const issues = data ?? [];

  if (isError || issues.length === 0) return null;

  return (
    <section aria-labelledby="magazine-shelf-title" className="mb-6 border-y border-neutral-200 py-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">AthleteTime Magazine</p>
          <h2 id="magazine-shelf-title" className="mt-1 text-lg font-bold text-neutral-900">이번 주에 읽을 것</h2>
        </div>
        <Link to="/community/magazine" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-neutral-700 hover:text-neutral-950">
          모두 보기
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <MagazineCard issue={issues[0]} featured />
      {issues.length > 1 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {issues.slice(1, 5).map((issue) => <MagazineCard key={issue.id} issue={issue} />)}
        </div>
      ) : null}
    </section>
  );
}
