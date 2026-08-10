export type RecordSearchFilterOption = {
  readonly label: string;
  readonly count: number;
};

type RecordSearchFilterChipsProps = {
  readonly title: string;
  readonly options: readonly RecordSearchFilterOption[];
  readonly selected: string;
  readonly onSelect: (value: string) => void;
};

export function RecordSearchFilterChips({
  title,
  options,
  selected,
  onSelect,
}: RecordSearchFilterChipsProps) {
  if (options.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-ink-3">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!selected}
          onClick={() => onSelect('')}
          className={filterClass(!selected)}
        >
          전체
        </button>
        {options.slice(0, 8).map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={selected === option.label}
            onClick={() => onSelect(option.label)}
            className={filterClass(selected === option.label)}
          >
            {option.label}
            <span className="ml-1 font-mono text-[10px] opacity-65">{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function filterClass(active: boolean): string {
  const base = 'min-h-11 border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
  return active
    ? `${base} border-brand bg-brand font-semibold text-white`
    : `${base} border-line bg-surface-2 font-medium text-ink-3 hover:border-line-2 hover:text-ink`;
}
