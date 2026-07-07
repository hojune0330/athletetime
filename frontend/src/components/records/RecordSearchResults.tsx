import { useMemo, useState } from 'react';
import type { AthleteSearchCard } from '../../api/recordAnalytics';

type Props = {
  athletes: AthleteSearchCard[];
  query: string;
  selectedAthleteKey: string;
  compareNotice: string;
  isInCompareTray: (athleteKey: string) => boolean;
  onSelectAthlete: (athleteKey: string) => void;
  onToggleCompare: (athlete: AthleteSearchCard) => void;
  /** 후보 카드에서 바로 "나" 지정 — 누르는 즉시 내 기록으로 합산 */
  isMine: (athleteKey: string) => boolean;
  onToggleMine: (athlete: AthleteSearchCard) => void;
  myCount: number;
  onViewMyRecords: () => void;
};

type FilterOption = {
  label: string;
  count: number;
};

export function RecordSearchResults({
  athletes,
  query,
  selectedAthleteKey,
  compareNotice,
  isInCompareTray,
  onSelectAthlete,
  onToggleCompare,
  isMine,
  onToggleMine,
  myCount,
  onViewMyRecords,
}: Props) {
  const [eventFilter, setEventFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  const eventOptions = useMemo(() => buildOptions(athletes.flatMap((athlete) => athlete.events)), [athletes]);
  const teamOptions = useMemo(
    () => buildOptions(athletes.flatMap((athlete) => athlete.teams.length > 0 ? athlete.teams : [athlete.team])),
    [athletes],
  );

  const filteredAthletes = useMemo(
    () =>
      athletes.filter((athlete) => {
        const eventMatched = !eventFilter || athlete.events.includes(eventFilter);
        const teamMatched = !teamFilter || athlete.team === teamFilter || athlete.teams.includes(teamFilter);
        return eventMatched && teamMatched;
      }),
    [athletes, eventFilter, teamFilter],
  );

  const sameNameCount = countSameName(athletes, query);

  return (
    <section className="space-y-4">
      <div className="border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">후보를 좁혀보세요</p>
            <p className="mt-1 text-xs leading-5 text-ink-4">
              {sameNameCount >= 2
                ? `이름이 같은 선수가 ${sameNameCount}명 보여요. 내 기록이면 카드의 "나"를 누르세요 — 여러 개 누르면 전부 합쳐져요.`
                : '이름이 같은 다른 선수일 수 있어요. 소속·연도·종목을 확인해 주세요.'}
            </p>
          </div>
          <p className="font-mono text-xs tracking-[0.08em] text-ink-4">
            후보 {filteredAthletes.length}/{athletes.length}명
          </p>
        </div>

        <FilterChips
          title="종목으로 좁히기"
          options={eventOptions}
          selected={eventFilter}
          onSelect={setEventFilter}
        />
        <FilterChips
          title="소속으로 좁히기"
          options={teamOptions}
          selected={teamFilter}
          onSelect={setTeamFilter}
        />
      </div>

      {myCount > 0 && (
        <div className="flex items-center justify-between gap-3 border border-brand bg-brand/5 px-4 py-3">
          <p className="text-sm text-ink">
            <span className="font-semibold text-brand">내 기록</span>으로 {myCount}개 묶음이 합쳐져 있어요.
          </p>
          <button
            type="button"
            onClick={onViewMyRecords}
            className="shrink-0 border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            합친 기록 보기
          </button>
        </div>
      )}

      {filteredAthletes.length === 0 ? (
        <div role="status" className="border border-dashed border-line bg-surface-2 p-5 text-sm text-ink-3">
          선택한 조건에 맞는 후보가 없어요. 종목이나 소속 필터를 하나씩 풀어보세요.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredAthletes.map((athlete) => (
            <AthleteResultCard
              key={athlete.athleteKey}
              athlete={athlete}
              selected={selectedAthleteKey === athlete.athleteKey}
              inTray={isInCompareTray(athlete.athleteKey)}
              mine={isMine(athlete.athleteKey)}
              onSelect={() => onSelectAthlete(athlete.athleteKey)}
              onToggleCompare={() => onToggleCompare(athlete)}
              onToggleMine={() => onToggleMine(athlete)}
            />
          ))}
        </div>
      )}

      {compareNotice && <p role="status" className="text-xs text-warn">{compareNotice}</p>}
    </section>
  );
}

function FilterChips({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
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

function AthleteResultCard({
  athlete,
  selected,
  inTray,
  mine,
  onSelect,
  onToggleCompare,
  onToggleMine,
}: {
  athlete: AthleteSearchCard;
  selected: boolean;
  inTray: boolean;
  mine: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
  onToggleMine: () => void;
}) {
  const isHomonym = athlete.ambiguity === 'name_team' || athlete.ambiguity === 'name';

  return (
    <div
      className={`relative border p-4 transition-colors ${
        mine
          ? 'border-brand bg-brand/10'
          : selected
            ? 'border-brand bg-brand/5'
            : 'border-line bg-surface hover:border-line-2 hover:bg-surface-2'
      }`}
    >
      {mine && (
        <span className="absolute right-3 top-3 border border-brand bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
          ✓ 내 기록
        </span>
      )}
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">{athlete.name}</h2>
            <p className="mt-1 text-sm text-ink-3">{athlete.team || '소속 미상'}</p>
          </div>
          {!mine && <span className="font-mono text-xs text-ink-4">기록 {athlete.recordCount}건</span>}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="border border-line bg-surface-2 px-2 py-1 text-xs text-ink-3">
            {formatYearRange(athlete.years)}
          </span>
          {athlete.events.slice(0, 3).map((event) => (
            <span key={event} className="border border-line bg-surface-2 px-2 py-1 text-xs text-ink-3">
              {event}
            </span>
          ))}
        </div>

        {isHomonym ? (
          <p className="mt-3 text-xs text-warn">
            이 소속·연도의 기록만 모았어요. 같은 이름의 다른 선수일 수 있어요.
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-4">공개 기록 모음 · 공식 기록 아님</p>
        )}
        <span className="mt-4 inline-flex text-sm font-semibold text-brand">이 기록 보기</span>
      </button>

      <button
        type="button"
        onClick={onToggleMine}
        aria-pressed={mine}
        className={`mt-3 mr-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          mine
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-brand-500/60 bg-surface text-brand hover:bg-brand-50'
        }`}
      >
        {mine ? '✓ 나' : '나'}
      </button>
      <button
        type="button"
        onClick={onToggleCompare}
        className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          inTray
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-line bg-surface-2 text-ink-3 hover:border-brand-500/50 hover:text-ink'
        }`}
      >
        {inTray ? '✓ 비교에 담음' : '+ 비교에 담기'}
      </button>
    </div>
  );
}

function buildOptions(values: string[]): FilterOption[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const label = raw.trim();
    if (!label || label === '소속 미상' || label === '종목 미상') continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko-KR'));
}

function filterClass(active: boolean): string {
  return active
    ? 'border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-white'
    : 'border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-3 hover:border-line-2 hover:text-ink';
}

function formatYearRange(years: number[]) {
  if (!years.length) return '연도 미상';
  if (years.length === 1) return String(years[0]);
  return `${years[0]}-${years[years.length - 1]}`;
}

function countSameName(athletes: AthleteSearchCard[], query: string): number {
  const norm = (value: string) => value.replace(/\s+/g, '').trim();
  const normalizedQuery = norm(query);
  if (!normalizedQuery) {
    const counts = new Map<string, number>();
    for (const athlete of athletes) {
      const key = norm(athlete.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Math.max(0, ...counts.values());
  }
  return athletes.filter((athlete) => norm(athlete.name) === normalizedQuery).length;
}
