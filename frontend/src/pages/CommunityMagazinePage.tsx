import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getMagazineIssues,
  type MagazineSectionKey,
} from '../api/editorialPublic';
import { MagazineCard } from '../components/community/MagazineCard';

const FILTERS: readonly { readonly key: 'all' | MagazineSectionKey; readonly label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'competition-preview', label: '이번 대회' },
  { key: 'record-story', label: '기록 이야기' },
  { key: 'international', label: '국제' },
  { key: 'road-marathon', label: '로드·마라톤' },
  { key: 'indoor', label: '실내' },
  { key: 'archive', label: '아카이브' },
];

export default function CommunityMagazinePage() {
  const [section, setSection] = useState<'all' | MagazineSectionKey>('all');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['editorial', 'magazine', 'list'],
    queryFn: () => getMagazineIssues(100),
    staleTime: 60_000,
    retry: 1,
  });
  const issues = (data ?? []).filter((issue) => section === 'all' || issue.sectionKey === section);

  return (
    <div>
      <div className="border-b border-neutral-900 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">AthleteTime Magazine</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">육상을 더 오래 보는 글</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
          대회가 없는 날에도 다시 볼 기록과 장면을 출처와 함께 정리해요.
        </p>
        <Link to="/community" className="mt-4 inline-block text-sm font-semibold text-neutral-700 underline underline-offset-4">
          사람들의 글도 보기
        </Link>
      </div>

      <nav aria-label="매거진 분류" className="my-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setSection(filter.key)}
            aria-pressed={section === filter.key}
            className={`min-h-10 shrink-0 border px-3 text-sm font-semibold ${
              section === filter.key
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      {isLoading ? <p className="py-10 text-sm text-neutral-500">글을 불러오는 중...</p> : null}
      {isError ? (
        <div className="border border-neutral-200 bg-white p-6">
          <h2 className="font-bold text-neutral-900">매거진을 불러오지 못했어요.</h2>
          <p className="mt-1 text-sm text-neutral-600">커뮤니티 글은 그대로 볼 수 있어요.</p>
          <Link to="/community" className="mt-4 inline-block text-sm font-bold text-primary-700">커뮤니티로 돌아가기</Link>
        </div>
      ) : null}
      {!isLoading && !isError && issues.length === 0 ? (
        <div className="border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          {section === 'all' ? '아직 발행한 글이 없어요.' : '이 분류에는 아직 글이 없어요.'}
        </div>
      ) : null}
      {issues.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {issues.map((issue) => <MagazineCard key={issue.id} issue={issue} />)}
        </div>
      ) : null}

      <div className="h-20 md:hidden" />
    </div>
  );
}
