import { ChatBubbleLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import type { MagazineIssue, MagazineSectionKey } from '../../api/editorialPublic';

const SECTION_LABELS: Readonly<Record<MagazineSectionKey, string>> = {
  'competition-preview': '이번 대회',
  'record-story': '기록 이야기',
  international: '국제',
  'road-marathon': '로드·마라톤',
  indoor: '실내',
  archive: '아카이브',
};

export function readingMinutes(content: string): number {
  return Math.max(1, Math.ceil(content.replace(/\s+/g, '').length / 500));
}

export function formatPublishedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '발행일 확인 중';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function sourceLabel(issue: MagazineIssue): string {
  const source = issue.sources[0];
  return source?.publisher || source?.title || '출처 함께 보기';
}

type MagazineCardProps = {
  readonly issue: MagazineIssue;
  readonly featured?: boolean;
};

export function MagazineCard({ issue, featured = false }: MagazineCardProps) {
  const minutes = readingMinutes(issue.content);

  return (
    <article className={`border border-neutral-200 bg-white ${featured ? 'p-5 sm:p-6' : 'p-4'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span className="font-semibold text-primary-700">{SECTION_LABELS[issue.sectionKey]}</span>
        <span>{formatPublishedDate(issue.publishedAt)}</span>
        <span className="flex items-center gap-1">
          <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {minutes}분
        </span>
      </div>

      <h3 className={`${featured ? 'mt-3 text-xl sm:text-2xl' : 'mt-2 text-base'} font-bold leading-snug text-neutral-900`}>
        <Link to={`/community/post/${issue.postId}`} className="hover:text-primary-700">
          {issue.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">{issue.summary}</p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        <span className="min-w-0 truncate">출처 · {sourceLabel(issue)}</span>
        <span className="flex shrink-0 items-center gap-1">
          <ChatBubbleLeftIcon className="h-4 w-4" aria-hidden="true" />
          {issue.commentsCount}
        </span>
      </div>

      {featured ? (
        <Link
          to={`/community/post/${issue.postId}`}
          className="mt-4 inline-flex min-h-11 items-center border border-neutral-900 px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-900 hover:text-white"
        >
          읽고 댓글로 이야기하기
        </Link>
      ) : null}
    </article>
  );
}
