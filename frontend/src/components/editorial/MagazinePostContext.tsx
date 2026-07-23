import {
  ArrowPathIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import type { MagazineIssue } from '../../api/editorialPublic';
import { MagazineCorrectionTimeline } from './MagazineCorrectionTimeline';
import { MagazineDiscussionPrompt } from './MagazineDiscussionPrompt';
import { MagazineEarlyCountNotice } from './MagazineEarlyCountNotice';
import { MagazineRelatedRecordLink } from './MagazineRelatedRecordLink';
import { MagazineSourceList } from './MagazineSourceList';

type MagazinePostContextProps = {
  readonly issue: MagazineIssue | null | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onRetry: () => void;
};

export function MagazinePostContext({
  issue,
  isLoading,
  isError,
  onRetry,
}: MagazinePostContextProps) {
  if (isLoading) return <div className="card h-24 animate-pulse bg-neutral-50" aria-label="매거진 정보 불러오는 중" />;
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
    <aside className="card min-w-0 overflow-hidden border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-amber-50/50">
      <div className="border-b border-sky-100 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-sky-700">
          <BookOpenIcon className="h-5 w-5" />
          AthleTime 매거진
        </div>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{issue.summary}</p>
        {!issue.countsVisible && <MagazineEarlyCountNotice />}
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        <div className="min-w-0">
          <MagazineSourceList sources={issue.sources} />
          <MagazineRelatedRecordLink relatedUrl={issue.relatedUrl} />
        </div>
        <MagazineDiscussionPrompt question={issue.discussionQuestion} />
      </div>

      <MagazineCorrectionTimeline corrections={issue.corrections} />
    </aside>
  );
}
