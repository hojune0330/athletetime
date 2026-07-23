import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

type MagazineRelatedRecordLinkProps = {
  readonly relatedUrl: string;
};

export function MagazineRelatedRecordLink({ relatedUrl }: MagazineRelatedRecordLinkProps) {
  return (
    <a
      href={relatedUrl}
      aria-label="관련 기록 보기"
      className="mt-3 flex min-w-0 items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
    >
      <span className="min-w-0 flex-1">관련 기록 보기</span>
      <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
    </a>
  );
}
