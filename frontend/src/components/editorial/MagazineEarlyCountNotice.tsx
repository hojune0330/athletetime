import { ClockIcon } from '@heroicons/react/24/outline';

export function MagazineEarlyCountNotice() {
  return (
    <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold leading-5 text-amber-800">
      <ClockIcon className="h-4 w-4 shrink-0" />
      <span>발행 후 2시간 동안 추천 수를 집계하고 있어요.</span>
    </p>
  );
}
