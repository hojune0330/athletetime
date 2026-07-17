import { useState } from 'react';
import type { FormEvent } from 'react';
import type { EditorialIssue, EditorialSourceInput } from '../../../api/editorialAdmin';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

type SourceChecklistProps = {
  readonly issue: EditorialIssue;
  readonly busy: boolean;
  readonly onAdd: (source: EditorialSourceInput) => Promise<void>;
  readonly onDelete: (sourceId: string) => Promise<void>;
};

export function SourceChecklist({ issue, busy, onAdd, onDelete }: SourceChecklistProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [sourceKind, setSourceKind] = useState('official');

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onAdd({
      sourceUrl,
      sourceKind,
      title,
      ...(publisher.trim() ? { publisher } : {}),
    });
    setSourceUrl('');
    setTitle('');
    setPublisher('');
  }

  const sourceRequired = issue.sources.length === 0;
  return (
    <section className="border border-line bg-surface p-4" aria-labelledby="source-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-mono-xs">SOURCE CHECK</p>
          <h2 id="source-heading" className="mt-1 text-base font-bold text-ink">출처 확인</h2>
        </div>
        <span className={`font-mono text-xs tabular-nums ${sourceRequired ? 'text-err' : 'text-ok'}`}>
          {issue.sources.length}건
        </span>
      </div>

      {sourceRequired && (
        <p role="alert" className="mt-3 border-l-2 border-err bg-red-50 px-3 py-2 text-sm text-err">
          출처를 1개 이상 확인해 주세요. 출처가 없으면 승인할 수 없습니다.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {issue.sources.map((source) => (
          <article key={source.id} className="border border-hair bg-surface-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{source.title}</p>
                <p className="mt-1 text-xs text-ink-3">{source.publisher ?? '제공처 미기재'} · {source.sourceKind}</p>
                <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-brand underline underline-offset-2">
                  원문 열기
                </a>
              </div>
              {issue.status === 'draft' && (
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onDelete(source.id)}>삭제</Button>
              )}
            </div>
          </article>
        ))}
      </div>

      {issue.status === 'draft' && (
        <form onSubmit={submit} className="mt-4 space-y-3 border-t border-hair pt-4">
          <label className="block text-xs font-semibold text-ink-2">
            원문 주소
            <Input className="mt-1" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required />
          </label>
          <label className="block text-xs font-semibold text-ink-2">
            자료 제목
            <Input className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold text-ink-2">
              제공처
              <Input className="mt-1" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
            </label>
            <label className="block text-xs font-semibold text-ink-2">
              자료 성격
              <select className="mt-1 h-10 w-full rounded-sm border border-line bg-surface px-2 text-sm" value={sourceKind} onChange={(event) => setSourceKind(event.target.value)}>
                <option value="official">공식 제공 자료</option>
                <option value="primary">직접 확인 자료</option>
                <option value="secondary">보조 자료</option>
                <option value="internal">AthleteTime 정리 자료</option>
              </select>
            </label>
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={busy}>출처 추가</Button>
        </form>
      )}
    </section>
  );
}
