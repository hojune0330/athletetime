import { useMemo, useState } from 'react';
import type { AthleteSearchCard } from '../../api/recordAnalytics';
import { RecordSearchFilterChips } from './RecordSearchFilterChips';
import { RecordSearchResultCard } from './RecordSearchResultCard';
import { buildRecordSearchOptions, countSameName } from './recordSearchHelpers';

type RecordSearchResultsProps = {
  readonly athletes: readonly AthleteSearchCard[];
  readonly query: string;
  readonly selectedAthleteKey: string;
  readonly compareNotice: string;
  readonly isInCompareTray: (athleteKey: string) => boolean;
  readonly onSelectAthlete: (athleteKey: string) => void;
  readonly onToggleCompare: (athlete: AthleteSearchCard) => void;
  readonly isMine: (athleteKey: string) => boolean;
  readonly onToggleMine: (athlete: AthleteSearchCard) => void;
  readonly myCount: number;
  readonly onViewMyRecords: () => void;
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
}: RecordSearchResultsProps) {
  const [eventFilter, setEventFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  const eventOptions = useMemo(() => buildRecordSearchOptions(athletes.flatMap((athlete) => athlete.events)), [athletes]);
  const teamOptions = useMemo(
    () => buildRecordSearchOptions(athletes.flatMap((athlete) => athlete.teams.length > 0 ? athlete.teams : [athlete.team])),
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
    <section className={`space-y-4 ${myCount > 0 ? 'pb-20' : ''}`}>
      <div className="border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">후보를 좁혀보세요</p>
            <p className="mt-1 text-xs leading-5 text-ink-4">
              {sameNameCount >= 2
                ? `이름이 같은 선수가 ${sameNameCount}명 보여요. 소속·연도·종목을 확인한 뒤 원하는 선수만 "이 선수 담기"로 모아 보세요.`
                : '이름이 같은 다른 선수일 수 있어요. 소속·연도·종목을 확인해 주세요.'}
            </p>
          </div>
          <p className="font-mono text-xs tracking-[0.08em] text-ink-4">
            후보 {filteredAthletes.length}/{athletes.length}명
          </p>
        </div>

        <RecordSearchFilterChips
          title="종목으로 좁히기"
          options={eventOptions}
          selected={eventFilter}
          onSelect={setEventFilter}
        />
        <RecordSearchFilterChips
          title="소속으로 좁히기"
          options={teamOptions}
          selected={teamFilter}
          onSelect={setTeamFilter}
        />
      </div>

      {filteredAthletes.length === 0 ? (
        <div role="status" className="border border-dashed border-line bg-surface-2 p-5 text-sm text-ink-3">
          선택한 조건에 맞는 후보가 없어요. 종목이나 소속 필터를 하나씩 풀어보세요.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredAthletes.map((athlete) => (
            <RecordSearchResultCard
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

      {myCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm text-ink">
              <span className="font-semibold text-brand">기록 모음</span>에 선수 {myCount}명 담김 — 이 기기에서만 모아 봐요
            </p>
            <button
              type="button"
              onClick={onViewMyRecords}
              className="min-h-11 shrink-0 border border-brand bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              기록 모음 보기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
