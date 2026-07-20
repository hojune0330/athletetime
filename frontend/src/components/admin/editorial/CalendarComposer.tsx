import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { EDITORIAL_SECTIONS, type EditorialCalendarInput, type EditorialSectionKey } from '../../../api/editorialAdmin';
import { SECTION_LABELS } from './editorialLabels';

type CalendarComposerProps = {
  readonly busy: boolean;
  readonly onCreate: (input: EditorialCalendarInput) => Promise<void>;
};

export function CalendarComposer({ busy, onCreate }: CalendarComposerProps) {
  const [open, setOpen] = useState(false);
  const [seasonYear, setSeasonYear] = useState(String(new Date().getFullYear()));
  const [slot, setSlot] = useState('1');
  const [sectionKey, setSectionKey] = useState<EditorialSectionKey>('competition-preview');

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onCreate({ seasonYear: Number(seasonYear), slot: Number(slot), sectionKey });
    setOpen(false);
  }

  if (!open) {
    return <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>편성 추가</Button>;
  }

  return (
    <form onSubmit={submit} className="grid gap-3 border border-line bg-surface-2 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
      <label className="text-xs font-semibold text-ink-2">
        시즌
        <Input className="mt-1 font-mono tabular-nums" type="number" min="2000" max="2200" value={seasonYear} onChange={(event) => setSeasonYear(event.target.value)} required />
      </label>
      <label className="text-xs font-semibold text-ink-2">
        순서
        <Input className="mt-1 font-mono tabular-nums" type="number" min="1" value={slot} onChange={(event) => setSlot(event.target.value)} required />
      </label>
      <label className="text-xs font-semibold text-ink-2">
        섹션
        <select className="mt-1 h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm" value={sectionKey} onChange={(event) => {
          const next = EDITORIAL_SECTIONS.find((section) => section === event.target.value);
          if (next) setSectionKey(next);
        }}>
          {EDITORIAL_SECTIONS.map((section) => <option key={section} value={section}>{SECTION_LABELS[section]}</option>)}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <Button type="submit" size="sm" disabled={busy}>추가</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>닫기</Button>
      </div>
    </form>
  );
}
