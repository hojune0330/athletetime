/**
 * PaceRisePage - 실업 LIVE 경기결과 페이지
 *
 * pace-rise-node.com 데이터를 연동하여 표시합니다.
 * 대회 목록, 경기 결과, 시간표, 선수 명단을 제공합니다.
 *
 * v5.7.0: PaceRise 연동(3차 가공) 명시 — 출처→PaceRise→AthleteTime 체인 고지,
 *         원본 바로가기 추가, 상태 인지형 LIVE 카피(과장 제거), 브랜드 표기 통일.
 * v6.0.0 (ui 1단계): TRAINORACLE 디자인 시스템 정합 —
 *         다크 강제 → 라이트, 하드컬러 → 토큰(energy/brand/ok/warn/err/info),
 *         인라인 style 제거, any 제거, 공용 Badge/Skeleton 사용, 스퀘어 코너(4px).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getPrCompetitions,
  getPrCompetitionResults,
  getPrCompetitionSchedule,
  getPrCompetitionAthletes,
  getPrLiveCompetitions,
  type PrCompetition,
  type PrEventResult,
  type PrScheduleEntry,
  type PrAthlete,
  type PrLiveCompetition,
} from '../api/pacerise';
import { PACERISE_POLICY, BRAND } from '../config/dataPolicy';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Button, buttonVariants } from '../components/ui/button';
import { cn } from '../lib/utils';
import { PaceRiseLoadingState } from './pacerise/PaceRiseLoadingState';
import {
  createPaceRiseSearchParams,
  resolvePaceRiseUrl,
  type PaceRiseTab,
} from './pacerise/paceriseUrlState';

// ============================================
// 토큰 기반 색상 매핑 (하드컬러 제거)
//   — 카테고리: energy.* (라벨 색만, 배경 채우기 금지)
//   — 상태:     veridict 시맨틱(ok/warn/info/secondary)
// ============================================

const CATEGORY_TEXT: Record<string, string> = {
  track: 'text-e-base',
  field_distance: 'text-e-vo2',
  field_height: 'text-e-gly',
  relay: 'text-e-atp',
  combined: 'text-e-lt',
  road: 'text-e-rest',
};

const CATEGORY_ORDER = ['track', 'field_distance', 'field_height', 'relay', 'combined', 'road'];

/** round_status/status → Badge variant (디자인 시스템 시맨틱) */
function statusVariant(status: string): 'success' | 'warning' | 'info' | 'secondary' | 'outline' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
    case 'active':
      return 'warning';
    case 'heats_generated':
      return 'info';
    case 'created':
      return 'secondary';
    default:
      return 'outline';
  }
}

/** 알 수 없는 에러를 안전하게 문자열로 (any 제거) */
function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// ============================================
// Sub Components
// ============================================

/** 로딩 상태 — 공용 Skeleton 사용 (스피너 제거) */
function LoadingState({ text = '데이터를 불러오는 중...' }: { text?: string }) {
  return (
    <div className="flex flex-col gap-3 py-6" role="status" aria-live="polite">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-3/4" />
      <p className="mt-2 text-body-sm text-ink-3">{text}</p>
    </div>
  );
}

/** 에러 메시지 */
function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-err/30 bg-err/5 p-6 text-center">
      <p className="mb-3 text-body-sm text-err">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

/** 라이브 배지 — dot+라벨 동시 (색맹 배려), pulse는 "진행 중" 신호로만 */
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-err/40 bg-err/10 px-2.5 py-0.5 text-mono-xs font-semibold uppercase tracking-wider-2 text-err animate-pulse">
      <span className="h-1.5 w-1.5 rounded-full bg-err" aria-hidden />
      LIVE
    </span>
  );
}

/** 상태 배지 — 공용 Badge variant 매핑 (인라인 style 제거) */
function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <Badge variant={statusVariant(status)} className="normal-case tracking-normal">
      {label}
    </Badge>
  );
}

/** 카테고리 배지 — outline + energy 토큰 텍스트 (배경 채우기 없음) */
function CategoryBadge({ category, label }: { category: string; label: string }) {
  return (
    <Badge variant="outline" className={cn('normal-case tracking-normal', CATEGORY_TEXT[category] || 'text-ink-3')}>
      {label}
    </Badge>
  );
}

// ============================================
// Live Section
// ============================================

function LiveSection({ data }: { data: PrLiveCompetition[] }) {
  if (data.length === 0) return null;

  return (
    <section className="mb-8" aria-label="현재 진행 중인 대회">
      <h2 className="mb-4 flex items-center gap-2 text-h3 text-ink">
        <LiveBadge /> 현재 진행중인 대회
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map(item => (
          <article key={item.competition.id} className="rounded-lg border border-line bg-surface p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-body-lg font-semibold text-ink">{item.competition.name}</h3>
                <p className="mt-0.5 text-body-sm text-ink-3">
                  {item.competition.venue} | {item.competition.federation_label}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-2xl font-semibold text-brand">{item.progress.percentage}%</div>
                <div className="text-caption text-ink-4">진행률</div>
              </div>
            </div>
            {/* Progress bar — 단색 brand (라이트) */}
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={item.progress.percentage} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-2 rounded-full bg-brand transition-all"
                style={{ width: `${item.progress.percentage}%` }}
              />
            </div>
            <div className="mb-3 flex gap-4 text-caption text-ink-3">
              <span>완료: <b className="font-medium text-ok">{item.progress.completed}</b></span>
              <span>진행중: <b className="font-medium text-warn">{item.progress.in_progress}</b></span>
              <span>대기: <b className="font-medium text-ink-4">{item.progress.pending}</b></span>
            </div>
            {/* Recent results */}
            {item.recent_results.length > 0 && (
              <div className="border-t border-hair pt-3">
                <p className="mb-2 text-caption text-ink-4">최근 결과</p>
                {item.recent_results.map((r, i) => (
                  <div key={i} className="mb-2">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-body-sm font-medium text-ink-2">{r.gender_label} {r.event_name}</span>
                      {r.wind && <span className="text-caption text-ink-4">풍속: {r.wind}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-3">
                      {r.top3.map((a, j) => (
                        <span key={j}>
                          <span className={cn('font-semibold', j === 0 ? 'text-brand' : 'text-ink-4')}>{j + 1}.</span> {a.name} <span className="font-mono text-ink-4">{a.record}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

// ============================================
// Competition List
// ============================================

function CompetitionList({
  competitions,
  selectedId,
  onSelect,
}: {
  competitions: PrCompetition[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-3">
      {competitions.map(comp => (
        <button
          key={comp.id}
          onClick={() => onSelect(comp.id)}
          aria-pressed={selectedId === comp.id}
          className={cn(
            'w-full rounded-lg border p-4 text-left transition-colors',
            selectedId === comp.id
              ? 'border-brand/40 bg-brand/5'
              : 'border-line bg-surface hover:border-line-2 hover:bg-surface-2',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-body-lg font-semibold text-ink">{comp.name}</h3>
              <p className="mt-1 text-body-sm text-ink-3">
                {comp.venue} | {comp.start_date} ~ {comp.end_date}
              </p>
              <p className="mt-1 text-caption text-ink-4">{comp.federation_label}</p>
            </div>
            <StatusBadge status={comp.status} label={comp.status_label} />
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================
// Results View
// ============================================

function ResultsView({ competitionId }: { competitionId: number }) {
  const [results, setResults] = useState<PrEventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ category: '', gender: '', finalsOnly: true });
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPrCompetitionResults(competitionId, {
        finals_only: filter.finalsOnly,
        category: filter.category || undefined,
        gender: filter.gender || undefined,
        status: 'completed',
      });
      setResults(data.events);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '결과를 불러올 수 없습니다'));
    } finally {
      setLoading(false);
    }
  }, [competitionId, filter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  if (loading) return <LoadingState text="경기 결과 불러오는 중..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchResults} />;

  const selectCls = 'rounded-md border border-line bg-surface px-3 py-1.5 text-body-sm text-ink';

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className={selectCls}
          aria-label="종목 필터"
        >
          <option value="">전체 종목</option>
          <option value="track">트랙</option>
          <option value="field_distance">필드(거리)</option>
          <option value="field_height">필드(높이)</option>
          <option value="relay">릴레이</option>
          <option value="combined">복합</option>
          <option value="road">도로</option>
        </select>
        <select
          value={filter.gender}
          onChange={e => setFilter(f => ({ ...f, gender: e.target.value }))}
          className={selectCls}
          aria-label="성별 필터"
        >
          <option value="">전체 성별</option>
          <option value="M">남자</option>
          <option value="F">여자</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-body-sm text-ink">
          <input
            type="checkbox"
            checked={filter.finalsOnly}
            onChange={e => setFilter(f => ({ ...f, finalsOnly: e.target.checked }))}
            className="accent-brand"
          />
          결승만
        </label>
        <span className="flex items-center text-body-sm text-ink-4">{results.length}개 종목</span>
      </div>

      {/* Results list */}
      {results.length === 0 ? (
        <p className="py-10 text-center text-body-sm text-ink-4">조건에 맞는 결과가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {results.map((event, idx) => (
            <div key={`${event.event_id}-${event.heat_number}-${idx}`} className="overflow-hidden rounded-lg border border-line bg-surface">
              {/* Event header */}
              <button
                onClick={() => setExpandedEvent(expandedEvent === idx ? null : idx)}
                className="w-full p-4 text-left transition-colors hover:bg-surface-2"
                aria-expanded={expandedEvent === idx}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={event.category} label={event.category_label} />
                    <span className="font-semibold text-ink">
                      {event.gender === 'M' ? '남자' : '여자'} {event.event_name}
                    </span>
                    <span className="text-caption text-ink-4">{event.round_label}</span>
                    {event.wind && <span className="text-caption text-ink-4">풍속: {event.wind}</span>}
                    {event.video_url && (
                      <a
                        href={event.video_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-caption text-info underline underline-offset-2 hover:text-ink"
                      >
                        영상 ↗
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-caption text-ink-4">{event.athletes_count}명</span>
                    <span className={cn('text-ink-4 transition-transform', expandedEvent === idx ? 'rotate-180' : '')}>▼</span>
                  </div>
                </div>
                {/* Top 3 preview */}
                {expandedEvent !== idx && event.results.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-3">
                    {event.results.slice(0, 3).map((r, j) => (
                      <span key={j}>
                        <span className={cn(j === 0 ? 'font-semibold text-brand' : 'text-ink-4')}>{r.rank}.</span>{' '}
                        {r.name} <span className="font-mono text-ink-4">{r.record}</span>
                      </span>
                    ))}
                  </div>
                )}
              </button>

              {/* Expanded results table */}
              {expandedEvent === idx && (
                <div className="border-t border-hair p-4">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="text-caption text-ink-4">
                        <th className="w-12 pb-2 text-left font-medium">순위</th>
                        <th className="pb-2 text-left font-medium">선수</th>
                        <th className="pb-2 text-left font-medium">소속</th>
                        <th className="pb-2 text-right font-medium">기록</th>
                        {event.results.some(r => r.wind) && <th className="pb-2 text-right font-medium">풍속</th>}
                        <th className="w-16 pb-2 text-right font-medium">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.results.map((r, j) => (
                        <tr key={j} className={cn('border-t border-hair', j === 0 ? 'text-brand' : j < 3 ? 'text-ink' : 'text-ink-3')}>
                          <td className="py-2 font-semibold">{r.rank}</td>
                          <td className="py-2">{r.name}</td>
                          <td className="py-2 text-ink-3">{r.team}</td>
                          <td className="py-2 text-right font-mono">{r.record}</td>
                          {event.results.some(r2 => r2.wind) && <td className="py-2 text-right font-mono text-ink-4">{r.wind || ''}</td>}
                          <td className="py-2 text-right text-caption text-ink-4">{r.remark || r.status_code || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Schedule View
// ============================================

const CATEGORY_EMOJI: Record<string, string> = {
  track: '🏃', field_distance: '📏', field_height: '📐', relay: '🤝', combined: '🔢', road: '🛣️',
};

function ScheduleView({ competitionId }: { competitionId: number }) {
  const [schedule, setSchedule] = useState<PrScheduleEntry[]>([]);
  const [byDate, setByDate] = useState<Record<string, PrScheduleEntry[]>>({});
  const [byCategory, setByCategory] = useState<Record<string, PrScheduleEntry[]>>({});
  const [hasMultipleDates, setHasMultipleDates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getPrCompetitionSchedule(competitionId);
        setSchedule(data.schedule);
        setByDate(data.by_date);
        setByCategory(data.by_category || {});
        setHasMultipleDates(data.has_multiple_dates ?? Object.keys(data.by_date).length > 1);
      } catch (err: unknown) {
        setError(getErrorMessage(err, '시간표를 불러올 수 없습니다'));
      } finally {
        setLoading(false);
      }
    })();
  }, [competitionId]);

  if (loading) return <LoadingState text="시간표 불러오는 중..." />;
  if (error) return <ErrorMessage message={error} />;

  const filterEntries = (entries: PrScheduleEntry[]) => {
    if (!statusFilter) return entries;
    return entries.filter(e => e.round_status === statusFilter);
  };

  const statusStats = {
    total: schedule.length,
    completed: schedule.filter(e => e.round_status === 'completed').length,
    in_progress: schedule.filter(e => e.round_status === 'in_progress').length,
    pending: schedule.filter(e => e.round_status === 'heats_generated' || e.round_status === 'created').length,
  };

  const renderCategoryView = () => {
    const orderedCats = CATEGORY_ORDER.filter(c => byCategory[c]?.length > 0);
    return orderedCats.map(cat => {
      const entries = filterEntries(byCategory[cat] || []);
      if (entries.length === 0) return null;
      const label = entries[0]?.category_label || cat;
      return (
        <div key={cat} className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-h3 text-ink">
            <span aria-hidden>{CATEGORY_EMOJI[cat] || '🏟️'}</span>
            {label}
            <span className="text-body-sm font-normal text-ink-4">({entries.length}개)</span>
          </h3>
          <div className="space-y-1">
            {entries.map((entry, i) => (
              <ScheduleEntryRow key={`${entry.event_id}-${i}`} entry={entry} showCategory={false} />
            ))}
          </div>
        </div>
      );
    });
  };

  const renderDateView = () => {
    const dates = Object.keys(byDate).sort();
    return dates.map(date => {
      const entries = filterEntries(byDate[date] || []);
      if (entries.length === 0) return null;
      return (
        <div key={date} className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-h3 text-ink">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
            {date}
            <span className="text-body-sm font-normal text-ink-4">({entries.length}개)</span>
          </h3>
          <div className="space-y-1">
            {entries.map((entry, i) => (
              <ScheduleEntryRow key={`${entry.event_id}-${i}`} entry={entry} showCategory={true} />
            ))}
          </div>
        </div>
      );
    });
  };

  const filterBtn = (active: boolean) =>
    cn(
      'rounded-md border px-3 py-1.5 text-caption font-medium transition-colors',
      active ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line bg-surface text-ink-3 hover:bg-surface-2',
    );

  return (
    <div>
      {/* 필터 바 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setStatusFilter('')} className={filterBtn(!statusFilter)}>
          전체 ({statusStats.total})
        </button>
        <button onClick={() => setStatusFilter('completed')} className={filterBtn(statusFilter === 'completed')}>
          완료 ({statusStats.completed})
        </button>
        <button onClick={() => setStatusFilter('in_progress')} className={filterBtn(statusFilter === 'in_progress')}>
          진행중 ({statusStats.in_progress})
        </button>
        {statusStats.pending > 0 && (
          <button onClick={() => setStatusFilter('heats_generated')} className={filterBtn(statusFilter === 'heats_generated')}>
            대기 ({statusStats.pending})
          </button>
        )}
      </div>

      {hasMultipleDates ? renderDateView() : renderCategoryView()}
    </div>
  );
}

/** 시간표 항목 한 줄 */
function ScheduleEntryRow({ entry, showCategory }: { entry: PrScheduleEntry; showCategory: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-2.5',
        entry.round_status === 'completed'
          ? 'border-ok/15 bg-ok/5'
          : entry.round_status === 'in_progress'
          ? 'border-warn/25 bg-warn/10'
          : 'border-line bg-surface',
      )}
    >
      {entry.scheduled_time && (
        <span className="w-14 shrink-0 font-mono text-body-sm text-ink-3">{entry.scheduled_time}</span>
      )}
      {showCategory && <CategoryBadge category={entry.category} label={entry.category_label} />}
      <span className="text-body-sm text-ink">
        {entry.gender_label} {entry.event_name}
      </span>
      <span className="text-caption text-ink-4">{entry.round_label}</span>
      {entry.heat_count > 1 && <span className="text-caption text-ink-4">{entry.heat_count}조</span>}
      {entry.video_url && (
        <a
          href={entry.video_url}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-caption text-info underline underline-offset-2 hover:text-ink"
        >
          영상 ↗
        </a>
      )}
      <div className="ml-auto shrink-0">
        <StatusBadge status={entry.round_status} label={entry.status_label} />
      </div>
    </div>
  );
}

// ============================================
// Athletes View
// ============================================

function AthletesView({ competitionId }: { competitionId: number }) {
  const [athletes, setAthletes] = useState<PrAthlete[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [byTeam, setByTeam] = useState<Record<string, PrAthlete[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getPrCompetitionAthletes(competitionId);
        setAthletes(data.athletes);
        setTeams(data.teams);
        setByTeam(data.by_team);
      } catch (err: unknown) {
        setError(getErrorMessage(err, '선수 명단을 불러올 수 없습니다'));
      } finally {
        setLoading(false);
      }
    })();
  }, [competitionId]);

  if (loading) return <LoadingState text="선수 명단 불러오는 중..." />;
  if (error) return <ErrorMessage message={error} />;

  const filtered = athletes.filter(a => {
    if (selectedTeam && a.team !== selectedTeam) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.team.toLowerCase().includes(q);
    }
    return true;
  });

  const fieldCls = 'rounded-md border border-line bg-surface px-3 py-1.5 text-body-sm text-ink';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="선수/팀 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={cn(fieldCls, 'w-48')}
          aria-label="선수/팀 검색"
        />
        <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className={fieldCls} aria-label="팀 필터">
          <option value="">전체 팀 ({teams.length})</option>
          {teams.map(t => (
            <option key={t} value={t}>{t} ({(byTeam[t] || []).length}명)</option>
          ))}
        </select>
        <span className="flex items-center text-body-sm text-ink-4">{filtered.length}명</span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 100).map(a => (
          <div key={a.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-semibold',
                a.gender === 'M' ? 'bg-e-base/15 text-e-base' : 'bg-e-gly/15 text-e-gly',
              )}
              aria-hidden
            >
              {a.gender === 'M' ? '남' : '여'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-body-sm font-medium text-ink">{a.name}</div>
              <div className="truncate text-caption text-ink-4">{a.team}</div>
            </div>
            {a.bib_number && (
              <span className="ml-auto shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-caption text-ink-4">
                #{a.bib_number}
              </span>
            )}
          </div>
        ))}
      </div>
      {filtered.length > 100 && (
        <p className="mt-4 text-center text-body-sm text-ink-4">상위 100명만 표시 (전체 {filtered.length}명)</p>
      )}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

const TABS: readonly { readonly key: PaceRiseTab; readonly label: string; readonly icon: string }[] = [
  { key: 'results', label: '경기 결과', icon: '🏅' },
  { key: 'schedule', label: '시간표', icon: '📋' },
  { key: 'athletes', label: '선수 명단', icon: '👥' },
];

export default function PaceRisePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [competitions, setCompetitions] = useState<PrCompetition[]>([]);
  const [liveData, setLiveData] = useState<PrLiveCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStaleCompetitionNotice, setHasStaleCompetitionNotice] = useState(false);
  const hasStartedInitialLoadRef = useRef(false);
  const recoveredSearchRef = useRef<string | null>(null);
  const resolvedUrl = resolvePaceRiseUrl(searchParams, competitions);
  const selectedCompId = resolvedUrl.competitionId;
  const activeTab = resolvedUrl.tab;
  const currentSearch = searchParams.toString();
  const canonicalSearch = resolvedUrl.canonicalSearch.toString();

  // Initial load
  useEffect(() => {
    if (hasStartedInitialLoadRef.current) return;
    hasStartedInitialLoadRef.current = true;

    (async () => {
      setLoading(true);
      try {
        const [compData, liveResult] = await Promise.all([
          getPrCompetitions(),
          getPrLiveCompetitions(),
        ]);
        setCompetitions(compData.competitions);
        setLiveData(liveResult.competitions || []);

      } catch (err: unknown) {
        setError(getErrorMessage(err, '데이터를 불러올 수 없습니다'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!resolvedUrl.needsCanonicalUrl) {
      if (recoveredSearchRef.current !== currentSearch) {
        setHasStaleCompetitionNotice(false);
      }
      return;
    }

    if (resolvedUrl.hasStaleCompetitionLink) {
      setHasStaleCompetitionNotice(true);
      recoveredSearchRef.current = canonicalSearch;
    } else {
      setHasStaleCompetitionNotice(false);
      recoveredSearchRef.current = null;
    }

    setSearchParams(new URLSearchParams(canonicalSearch), { replace: true });
  }, [canonicalSearch, currentSearch, resolvedUrl.hasStaleCompetitionLink, resolvedUrl.needsCanonicalUrl, setSearchParams]);

  const handleSelectComp = (id: number) => {
    setHasStaleCompetitionNotice(false);
    recoveredSearchRef.current = null;
    setSearchParams(createPaceRiseSearchParams(searchParams, id, activeTab));
  };

  const handleTabChange = (tab: PaceRiseTab) => {
    if (selectedCompId !== null) {
      setHasStaleCompetitionNotice(false);
      recoveredSearchRef.current = null;
      setSearchParams(createPaceRiseSearchParams(searchParams, selectedCompId, tab));
    }
  };

  const selectedComp = competitions.find(c => c.id === selectedCompId);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <PaceRiseLoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <ErrorMessage message={error} onRetry={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Header */}
      <header className="border-b border-hair bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="text-2xl" aria-hidden>🏃</span>
            <h1 className="text-h2 font-semibold tracking-tight text-ink">실업 LIVE</h1>
            {/* PaceRise 연동 배지 — 한눈에 "3차 가공"임을 알린다 */}
            <span className="rounded-full border border-info/40 bg-info/10 px-2.5 py-0.5 text-mono-xs font-semibold uppercase tracking-wider-2 text-info">
              {PACERISE_POLICY.badge}
            </span>
            {liveData.length > 0 && <LiveBadge />}
          </div>
          <p className="text-body-sm text-ink-3">{PACERISE_POLICY.tagline}</p>
          {/* 상태 인지형 안내 — 진행 중일 때만 "실시간 결과", 없을 땐 정직하게 */}
          <p className="mt-0.5 text-body-sm text-ink-3">
            {liveData.length > 0 ? PACERISE_POLICY.liveNotice : PACERISE_POLICY.idleNotice}
          </p>
          {/* PaceRise 원본 바로가기 — 사용자가 1차 출처로 직접 이동 */}
          <a
            href={PACERISE_POLICY.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'mt-2 gap-1.5 border-info/40 text-info hover:border-info/60 hover:text-ink',
            )}
          >
            {PACERISE_POLICY.linkLabel}
            <span aria-hidden>↗</span>
          </a>
          <p className="mt-2 text-caption text-ink-4">
            * 이 페이지는 {BRAND.full}가 PaceRise 데이터를 가져와 다시 정리해 보여드리는 화면이에요. 어떠한 연맹·협회의 공식 서비스가 아니에요.
          </p>
          {/* 확정 기록 안내 배너 */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
            <span className="text-lg" aria-hidden>📊</span>
            <div className="flex-1">
              <p className="text-body-sm font-medium text-ink">확정된 경기 기록을 찾으시나요?</p>
              <p className="mt-0.5 text-caption text-ink-3">종료된 대회의 결과는 대회·기록 탭에서 통합 조회할 수 있습니다.</p>
            </div>
            <Link
              to="/competitions?tab=results"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0 border-brand/40 text-brand hover:border-brand/60 hover:text-brand-ink')}
            >
              대회·기록 →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Live Section */}
        <LiveSection data={liveData} />

        {hasStaleCompetitionNotice && (
          <div role="status" aria-live="polite" className="mb-6 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-body-sm text-ink-2">
            요청하신 대회를 찾을 수 없어 현재 선택 가능한 대회로 표시했어요.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar - Competition list */}
          <div className="lg:col-span-1">
            <h2 className="mb-3 text-h3 text-ink">대회 목록</h2>
            <CompetitionList
              competitions={competitions}
              selectedId={selectedCompId}
              onSelect={handleSelectComp}
            />
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            {selectedComp ? (
              <>
                {/* Competition header */}
                <div className="mb-4 rounded-lg border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-h3 font-semibold text-ink">{selectedComp.name}</h2>
                      <p className="mt-1 text-body-sm text-ink-3">
                        {selectedComp.venue} | {selectedComp.start_date} ~ {selectedComp.end_date} | {selectedComp.federation_label}
                      </p>
                    </div>
                    <StatusBadge status={selectedComp.status} label={selectedComp.status_label} />
                  </div>
                  {selectedComp.video_url && (
                    <a
                      href={selectedComp.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 border-b border-info/40 text-body-sm text-info hover:border-info/70"
                    >
                      실시간 영상 보기 ↗
                    </a>
                  )}
                </div>

                {/* Tabs */}
                <div role="tablist" aria-label="대회 정보 탭" className="mb-6 flex gap-1 rounded-lg border border-line bg-surface p-1">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={activeTab === tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-body-sm font-medium transition-colors',
                        activeTab === tab.key
                          ? 'bg-brand/10 text-brand'
                          : 'text-ink-3 hover:bg-surface-2 hover:text-ink',
                      )}
                    >
                      <span aria-hidden>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {activeTab === 'results' && <ResultsView competitionId={selectedComp.id} />}
                {activeTab === 'schedule' && <ScheduleView competitionId={selectedComp.id} />}
                {activeTab === 'athletes' && <AthletesView competitionId={selectedComp.id} />}
              </>
            ) : (
              <div className="py-20 text-center">
                <p className="text-h3 text-ink-4">대회를 선택해주세요</p>
              </div>
            )}
          </div>
        </div>

        {/* PaceRise 연동(3차 가공) 고지 — 출처 → PaceRise → AthleteTime 체인을 명명백백히 */}
        <div className="mt-8 space-y-2 rounded-lg border border-info/20 bg-info/5 p-4 text-caption text-ink-3">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-mono-xs font-semibold uppercase tracking-wider-2 text-info">{PACERISE_POLICY.badge}</span>
            <span className="font-medium text-ink-2">데이터 출처 및 면책 안내</span>
          </div>
          {/* 데이터 흐름 시각화 */}
          <div className="flex flex-wrap items-center gap-1.5 text-caption text-ink-4">
            <span>연맹·협회(원출처)</span>
            <span aria-hidden>→</span>
            <span className="font-medium text-info">PaceRise(운영·집계)</span>
            <span aria-hidden>→</span>
            <span className="font-medium text-ink-2">{BRAND.name}(재가공·표시)</span>
          </div>
          <p>📌 {PACERISE_POLICY.thirdPartyNotice}</p>
          <p>⚠️ {PACERISE_POLICY.rightsNotice}</p>
          <p className="text-ink-4">
            ℹ️ {BRAND.name}은 비공식 커뮤니티 프로젝트이며, 어떠한 육상 연맹·협회·단체의 공식 서비스가 아니에요.{' '}
            <a href={PACERISE_POLICY.url} target="_blank" rel="noreferrer" className="text-info underline underline-offset-2 hover:text-ink">{PACERISE_POLICY.linkLabel} ↗</a>
          </p>
        </div>
      </div>
    </div>
  );
}
