import { useEffect, useMemo, useState } from 'react';
import type { TeamStatistics } from '../../api/recordAnalytics';

type Props = {
  readonly teams: TeamStatistics[];
  readonly query: string;
};

export function TeamStatisticsResults({ teams, query }: Props) {
  const [selectedKey, setSelectedKey] = useState(teams[0]?.teamKey ?? '');

  useEffect(() => {
    if (!teams.some((team) => team.teamKey === selectedKey)) {
      setSelectedKey(teams[0]?.teamKey ?? '');
    }
  }, [selectedKey, teams]);

  const selected = teams.find((team) => team.teamKey === selectedKey) ?? teams[0];
  if (!selected) return null;

  return (
    <section className="space-y-4" aria-label={`${query} 소속 통계`}>
      {teams.length > 1 && (
        <div className="border border-line bg-surface p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">소속을 골라 주세요</p>
              <p className="mt-1 text-xs text-ink-4">이름이 비슷한 소속을 합치지 않고 따로 계산했어요.</p>
            </div>
            <span className="font-mono text-xs text-ink-4">{teams.length}개</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <button
                key={team.teamKey}
                type="button"
                aria-pressed={team.teamKey === selected.teamKey}
                onClick={() => setSelectedKey(team.teamKey)}
                className={teamChoiceClass(team.teamKey === selected.teamKey)}
              >
                <span className="block font-semibold">{team.teamLabel}</span>
                <span className="mt-1 block font-mono text-xs opacity-65">
                  선수 {team.athleteCount} · 기록 {team.resultCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <TeamDashboard team={selected} />
    </section>
  );
}

function TeamDashboard({ team }: { readonly team: TeamStatistics }) {
  const visibleSeasons = team.seasonStats.slice(0, 8);
  const visibleEvents = team.eventStats.slice(0, 8);
  const maxSeasonResults = useMemo(
    () => Math.max(1, ...visibleSeasons.map((season) => season.resultCount)),
    [visibleSeasons],
  );
  const maxEventResults = useMemo(
    () => Math.max(1, ...visibleEvents.map((event) => event.resultCount)),
    [visibleEvents],
  );

  return (
    <article className="border border-line bg-surface" data-team-statistics={team.teamKey}>
      <header className="border-b border-line p-5 sm:p-7">
        <p className="font-mono text-xs tracking-[0.12em] text-brand">AFFILIATION SNAPSHOT</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{team.teamLabel}</h2>
        <p className="mt-2 text-sm text-ink-3">개인 기록을 나열하지 않고, 이 소속으로 출전한 기록을 한눈에 모았어요.</p>
        <div className="mt-5 grid grid-cols-2 border-l border-t border-line sm:grid-cols-4">
          <Metric label="모은 선수" value={`${team.athleteCount}명`} />
          <Metric label="기록" value={`${team.resultCount}건`} />
          <Metric label="대회" value={`${team.competitionCount}개`} />
          <Metric label="종목" value={`${team.eventCount}개`} />
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-4">
          확인 범위 {formatSeasonRange(team)} · 최근 기록 {formatDate(team.latestDate)}
        </p>
      </header>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <SectionHeading title="시즌 흐름" meta="최근 8개 시즌" />
          <div className="mt-5 space-y-4">
            {visibleSeasons.map((season) => (
              <BarRow
                key={season.season}
                label={String(season.season)}
                width={(season.resultCount / maxSeasonResults) * 100}
                value={`${season.resultCount}건`}
                detail={`선수 ${season.athleteCount} · 대회 ${season.competitionCount} · 1~3위 표기 ${season.topThreeCount}`}
              />
            ))}
          </div>
        </section>

        <section className="border-b border-line p-5 sm:p-7 lg:border-b-0">
          <SectionHeading title="종목 구성" meta={`상위 ${visibleEvents.length}개`} />
          <div className="mt-5 space-y-4">
            {visibleEvents.map((event) => (
              <BarRow
                key={event.eventKey}
                label={event.eventLabel}
                width={(event.resultCount / maxEventResults) * 100}
                value={`${event.resultCount}건`}
                detail={`선수 ${event.athleteCount}명`}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="grid border-t border-line sm:grid-cols-[auto_1fr]">
        <div className="grid grid-cols-4 border-b border-line sm:min-w-[360px] sm:border-b-0 sm:border-r">
          <Metric label="1위 표기" value={String(team.rankCounts.first)} compact />
          <Metric label="2위 표기" value={String(team.rankCounts.second)} compact />
          <Metric label="3위 표기" value={String(team.rankCounts.third)} compact />
          <Metric label="합계" value={String(team.rankCounts.topThree)} compact />
        </div>
        <p className="p-4 text-xs leading-5 text-ink-4 sm:self-center sm:px-6">{team.disclaimer}</p>
      </section>
    </article>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`border-b border-r border-line ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-[11px] font-medium text-ink-4">{label}</p>
      <p className={`mt-1 font-mono font-semibold text-ink ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

function SectionHeading({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <span className="font-mono text-[11px] text-ink-4">{meta}</span>
    </div>
  );
}

function BarRow({ label, value, detail, width }: { label: string; value: string; detail: string; width: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium text-ink">{label}</span>
        <span className="shrink-0 font-mono text-xs text-ink-3">{value}</span>
      </div>
      <div className="mt-2 h-1.5 bg-surface-3" aria-hidden="true">
        <div className="h-full bg-brand transition-[width] duration-500" style={{ width: `${Math.max(4, width)}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-4">{detail}</p>
    </div>
  );
}

function teamChoiceClass(active: boolean) {
  return active
    ? 'border border-ink bg-ink px-4 py-3 text-left text-white'
    : 'border border-line bg-surface-2 px-4 py-3 text-left text-ink transition hover:border-ink';
}

function formatSeasonRange(team: TeamStatistics) {
  if (!team.firstSeason || !team.latestSeason) return '시즌 미상';
  return team.firstSeason === team.latestSeason ? `${team.firstSeason} 시즌` : `${team.firstSeason}-${team.latestSeason}`;
}

function formatDate(value: string | null) {
  if (!value) return '날짜 미상';
  return value.slice(0, 10).replaceAll('-', '.');
}
