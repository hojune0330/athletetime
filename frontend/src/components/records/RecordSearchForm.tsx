import type { FormEvent, RefObject } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type RecordSearchFormProps = {
  readonly query: string;
  readonly loading: boolean;
  readonly teamSearch: boolean;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly onQueryChange: (value: string) => void;
  readonly onSubmit: (query: string) => void;
};

export function RecordSearchForm({
  query,
  loading,
  teamSearch,
  inputRef,
  onQueryChange,
  onSubmit,
}: RecordSearchFormProps) {
  const trimmedQuery = query.trim();
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (trimmedQuery.length < 2 || loading) return;
    onSubmit(trimmedQuery);
  };

  return (
    <>
      <form aria-busy={loading} className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
        <label htmlFor="records-search" className="sr-only">
          공개 기록 검색
        </label>
        <Input
          id="records-search"
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={teamSearch ? '찾을 소속을 입력하세요' : '이름 또는 소속(예: 홍길동, 서울고)'}
          aria-describedby="records-search-help"
          className="h-12 border-line bg-white text-base"
        />
        <Button type="submit" size="lg" disabled={trimmedQuery.length < 2 || loading}>
          {loading ? '검색 중' : '검색'}
        </Button>
      </form>
      <p id="records-search-help" className="mt-2 text-xs leading-5 text-ink-4">
        {teamSearch ? '학교나 팀 이름을 두 글자 이상 입력해 주세요.' : '두 글자 이상 입력하면 검색할 수 있어요.'}
      </p>
      {loading && <p role="status" className="sr-only">검색 중이에요. 잠시만 기다려 주세요.</p>}
    </>
  );
}
