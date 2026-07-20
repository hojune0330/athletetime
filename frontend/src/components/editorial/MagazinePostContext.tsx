import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ClockIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import type { MagazineIssue } from '../../api/editorialPublic';

type MagazinePostContextProps = {
  readonly issue: MagazineIssue | null | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onRetry: () => void;
};

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function MagazinePostContext({
  issue,
  isLoading,
  isError,
  onRetry,
}: MagazinePostContextProps) {
  if (isLoading) {
    return <div className="card h-24 animate-pulse bg-neutral-50" aria-label="매거진 정보 불러오는 중" />;
  }
  if (isError) {
    return (
      <aside className="card border-amber-200 bg-amber-50/60 p-5">
        <p className="font-semibold text-neutral-900">매거진 정보를 불러오지 못했어요.</p>
        <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-600">
          <ArrowPathIcon className="h-4 w-4" />
          다시 시도
        </button>
      </aside>
    );
  }
  if (!issue) return null;

  return (
    <aside className="card overflow-hidden border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-amber-50/50">
      <div className="border-b border-sky-100 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-sky-700">
          <BookOpenIcon className="h-5 w-5" />
          AthleTime 매거진
        </div>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{issue.summary}</p>
        {!issue.countsVisible && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
            <ClockIcon className="h-4 w-4" />
            발행 후 2시간 동안 추천 수를 집계하고 있어요.
          </p>
        )}
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="flex items-center gap-2 font-bold text-neutral-900">
            <LinkIcon className="h-5 w-5 text-sky-600" />
            출처와 관련 기록
          </h2>
          <div className="mt-3 space-y-2">
            {issue.sources.length === 0 ? (
              <p className="text-sm text-neutral-500">공개된 출처가 아직 없어요.</p>
            ) : issue.sources.map((source) => (
              <a
                key={source.id}
                href={source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-start gap-2 rounded-xl border border-neutral-200 bg-white/80 p-3 text-sm text-neutral-700 hover:border-sky-300"
              >
                <span className="min-w-0 flex-1 break-words">{source.title}</span>
                <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
              </a>
            ))}
            <a href={issue.relatedUrl} className="flex min-w-0 items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white">
              <span className="min-w-0 flex-1 break-all">관련 기록 보기</span>
              <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
            </a>
          </div>
        </section>

        <section className="min-w-0">
          <h2 className="flex items-center gap-2 font-bold text-neutral-900">
            <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-amber-600" />
            같이 이야기해요
          </h2>
          <p className="mt-3 rounded-2xl bg-white/80 p-4 text-sm font-medium leading-6 text-neutral-700">
            {issue.discussionQuestion}
          </p>
        </section>
      </div>

      {issue.corrections.length > 0 && (
        <section className="border-t border-sky-100 p-5 sm:p-6">
          <h2 className="font-bold text-neutral-900">바로잡은 내용</h2>
          <ol className="mt-3 space-y-3">
            {issue.corrections.map((correction) => (
              <li key={`${correction.revisionNumber}-${correction.createdAt}`} className="rounded-xl border border-neutral-200 bg-white/80 p-4">
                <p className="text-sm leading-6 text-neutral-700">{correction.publicSummary}</p>
                <time className="mt-1 block text-xs text-neutral-400" dateTime={correction.createdAt}>
                  {dateLabel(correction.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}
