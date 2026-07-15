import type { FormEvent } from 'react';
import { Button } from '../ui/button';

export function NameStep({
  query,
  onQueryChange,
  onSubmitName,
}: {
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly onSubmitName: (value: string) => void;
}) {
  const trimmed = query.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (trimmed.length < 2) return;
    onSubmitName(trimmed);
  };

  return (
    <form className="flex min-h-[28rem] flex-col" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold text-brand">1단계</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">선수 이름을 입력하세요.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-3">두 글자 이상 입력하세요. 소속으로도 찾을 수 있어요.</p>
        <label htmlFor="mine-records-name" className="sr-only">선수 이름 또는 소속</label>
        <input
          id="mine-records-name"
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="예: 김민준, 서울고"
          className="mt-8 h-14 w-full border border-line bg-white px-4 text-lg font-semibold text-ink outline-none transition focus:border-brand"
        />
      </div>
      <div className="sticky bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom)+12px)] mt-auto border-t border-hair bg-surface py-4 md:bottom-0" data-records-sticky-cta="mine-name">
        <Button type="submit" size="lg" className="w-full" disabled={trimmed.length < 2}>
          내 기록 찾기
        </Button>
      </div>
    </form>
  );
}
