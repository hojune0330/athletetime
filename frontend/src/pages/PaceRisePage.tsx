/**
 * PaceRisePage - 실업 LIVE 경기결과 페이지
 * 
 * pace-rise-node.com 데이터를 연동하여 표시합니다.
 * 대회 목록, 경기 결과, 시간표, 선수 명단을 제공합니다.
 * 
 * v5.7.0: PaceRise 연동(3차 가공) 명시 — 출처→PaceRise→AthleteTime 체인 고지,
 *         원본 바로가기 추가, 상태 인지형 LIVE 카피(과장 제거), 브랜드 표기 통일.
 */

import { useState, useEffect, useCallback } from 'react';
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

// ============================================
// 카테고리 색상 매핑
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
  track: '#c8ff00',
  field_distance: '#4ecdc4',
  field_height: '#ff6b6b',
  relay: '#a78bfa',
  combined: '#f59e0b',
  road: '#60a5fa',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#4ade80',
  in_progress: '#fbbf24',
  heats_generated: '#94a3b8',
  created: '#64748b',
  active: '#fbbf24',
};

// ============================================
// Sub Components
// ============================================

/** 로딩 스피너 */
function LoadingSpinner({ text = '데이터를 불러오는 중...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#c8ff00] border-t-transparent mb-4" />
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}

/** 에러 메시지 */
function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
      <p className="text-red-400 mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors">
          다시 시도
        </button>
      )}
    </div>
  );
}

/** 라이브 배지 */
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full text-xs text-red-400 animate-pulse">
      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
      LIVE
    </span>
  );
}

/** 상태 배지 */
function StatusBadge({ status, label }: { status: string; label: string }) {
  const color = STATUS_COLORS[status] || '#64748b';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

/** 카테고리 배지 */
function CategoryBadge({ category, label }: { category: string; label: string }) {
  const color = CATEGORY_COLORS[category] || '#888';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

// ============================================
// Live Section
// ============================================

function LiveSection({ data }: { data: PrLiveCompetition[] }) {
  if (data.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <LiveBadge /> 현재 진행중인 대회
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map(item => (
          <div key={item.competition.id} className="bg-gradient-to-br from-danger-50 to-accent-50 border border-red-500/20 rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-white text-lg">{item.competition.name}</h3>
                <p className="text-gray-400 text-sm">{item.competition.venue} | {item.competition.federation_label}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#c8ff00]">{item.progress.percentage}%</div>
                <div className="text-xs text-gray-500">진행률</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
              <div
                className="bg-gradient-to-r from-[#c8ff00] to-green-400 h-2 rounded-full transition-all"
                style={{ width: `${item.progress.percentage}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-gray-400 mb-3">
              <span>완료: <b className="text-green-400">{item.progress.completed}</b></span>
              <span>진행중: <b className="text-yellow-400">{item.progress.in_progress}</b></span>
              <span>대기: <b className="text-gray-500">{item.progress.pending}</b></span>
            </div>
            {/* Recent results */}
            {item.recent_results.length > 0 && (
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500 mb-2">최근 결과</p>
                {item.recent_results.map((r, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white font-medium">{r.gender_label} {r.event_name}</span>
                      {r.wind && <span className="text-xs text-gray-500">풍속: {r.wind}</span>}
                    </div>
                    <div className="flex gap-3 text-xs">
                      {r.top3.map((a, j) => (
                        <span key={j} className="text-gray-300">
                          <span className={j === 0 ? 'text-[#c8ff00] font-bold' : ''}>{j + 1}.</span> {a.name} <span className="text-gray-500">{a.record}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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
          className={`w-full text-left p-4 rounded-xl border transition-all ${
            selectedId === comp.id
              ? 'bg-[#c8ff00]/10 border-[#c8ff00]/30'
              : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-white">{comp.name}</h3>
              <p className="text-sm text-gray-400 mt-1">
                {comp.venue} | {comp.start_date} ~ {comp.end_date}
              </p>
              <p className="text-xs text-gray-500 mt-1">{comp.federation_label}</p>
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
    } catch (err: any) {
      setError(err.message || '결과를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [competitionId, filter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  if (loading) return <LoadingSpinner text="경기 결과 불러오는 중..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchResults} />;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
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
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
        >
          <option value="">전체 성별</option>
          <option value="M">남자</option>
          <option value="F">여자</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white cursor-pointer">
          <input
            type="checkbox"
            checked={filter.finalsOnly}
            onChange={e => setFilter(f => ({ ...f, finalsOnly: e.target.checked }))}
            className="rounded"
          />
          결승만
        </label>
        <span className="text-sm text-gray-500 flex items-center">{results.length}개 종목</span>
      </div>

      {/* Results list */}
      {results.length === 0 ? (
        <p className="text-gray-500 text-center py-10">조건에 맞는 결과가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {results.map((event, idx) => (
            <div key={`${event.event_id}-${event.heat_number}-${idx}`} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
              {/* Event header */}
              <button
                onClick={() => setExpandedEvent(expandedEvent === idx ? null : idx)}
                className="w-full text-left p-4 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge category={event.category} label={event.category_label} />
                    <span className="font-bold text-white">
                      {event.gender === 'M' ? '남자' : '여자'} {event.event_name}
                    </span>
                    <span className="text-xs text-gray-400">{event.round_label}</span>
                    {event.wind && <span className="text-xs text-gray-500">풍속: {event.wind}</span>}
                    {event.video_url && (
                      <a href={event.video_url} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300" onClick={e => e.stopPropagation()}>
                        📹 영상
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{event.athletes_count}명</span>
                    <span className={`text-gray-400 transition-transform ${expandedEvent === idx ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>
                {/* Top 3 preview */}
                {expandedEvent !== idx && event.results.length > 0 && (
                  <div className="flex gap-4 mt-2 text-sm">
                    {event.results.slice(0, 3).map((r, j) => (
                      <span key={j} className="text-gray-300">
                        <span className={j === 0 ? 'text-[#c8ff00] font-bold' : 'text-gray-500'}>{r.rank}.</span>{' '}
                        {r.name} <span className="text-gray-500">{r.record}</span>
                      </span>
                    ))}
                  </div>
                )}
              </button>

              {/* Expanded results table */}
              {expandedEvent === idx && (
                <div className="border-t border-gray-700 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs">
                        <th className="text-left pb-2 w-12">순위</th>
                        <th className="text-left pb-2">선수</th>
                        <th className="text-left pb-2">소속</th>
                        <th className="text-right pb-2">기록</th>
                        {event.results.some(r => r.wind) && <th className="text-right pb-2">풍속</th>}
                        <th className="text-right pb-2 w-16">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.results.map((r, j) => (
                        <tr key={j} className={`border-t border-gray-700/50 ${j === 0 ? 'text-[#c8ff00]' : j < 3 ? 'text-white' : 'text-gray-400'}`}>
                          <td className="py-2 font-bold">{r.rank}</td>
                          <td className="py-2">{r.name}</td>
                          <td className="py-2 text-gray-400">{r.team}</td>
                          <td className="py-2 text-right font-mono">{r.record}</td>
                          {event.results.some(r2 => r2.wind) && <td className="py-2 text-right text-gray-500 text-xs">{r.wind || ''}</td>}
                          <td className="py-2 text-right text-xs text-gray-500">{r.remark || r.status_code || ''}</td>
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
      } catch (err: any) {
        setError(err.message || '시간표를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, [competitionId]);

  if (loading) return <LoadingSpinner text="시간표 불러오는 중..." />;
  if (error) return <ErrorMessage message={error} />;

  // 상태 필터링 함수
  const filterEntries = (entries: PrScheduleEntry[]) => {
    if (!statusFilter) return entries;
    return entries.filter(e => e.round_status === statusFilter);
  };

  // 상태별 통계
  const statusStats = {
    total: schedule.length,
    completed: schedule.filter(e => e.round_status === 'completed').length,
    in_progress: schedule.filter(e => e.round_status === 'in_progress').length,
    pending: schedule.filter(e => e.round_status === 'heats_generated' || e.round_status === 'created').length,
  };

  const CATEGORY_ORDER = ['track', 'field_distance', 'field_height', 'relay', 'combined', 'road'];
  const CATEGORY_EMOJI: Record<string, string> = {
    track: '🏃', field_distance: '📏', field_height: '📐', relay: '🤝', combined: '🔢', road: '🛣️',
  };

  // 카테고리별 뷰 (날짜가 하나일 때 우선 사용)
  const renderCategoryView = () => {
    const orderedCats = CATEGORY_ORDER.filter(c => byCategory[c]?.length > 0);
    return orderedCats.map(cat => {
      const entries = filterEntries(byCategory[cat] || []);
      if (entries.length === 0) return null;
      const label = entries[0]?.category_label || cat;
      return (
        <div key={cat} className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span>{CATEGORY_EMOJI[cat] || '🏟️'}</span>
            {label}
            <span className="text-sm font-normal text-gray-500">({entries.length}개)</span>
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

  // 날짜별 뷰
  const renderDateView = () => {
    const dates = Object.keys(byDate).sort();
    return dates.map(date => {
      const entries = filterEntries(byDate[date] || []);
      if (entries.length === 0) return null;
      return (
        <div key={date} className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#c8ff00] rounded-full" />
            {date}
            <span className="text-sm font-normal text-gray-500">({entries.length}개)</span>
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

  return (
    <div>
      {/* 필터 바 */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!statusFilter ? 'bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
        >전체 ({statusStats.total})</button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
        >완료 ({statusStats.completed})</button>
        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
        >진행중 ({statusStats.in_progress})</button>
        {statusStats.pending > 0 && (
          <button
            onClick={() => setStatusFilter('heats_generated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === 'heats_generated' ? 'bg-gray-500/10 text-gray-300 border border-gray-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
          >대기 ({statusStats.pending})</button>
        )}
      </div>

      {/* 메인 뷰: 날짜가 여러 개면 날짜별, 아니면 카테고리별 */}
      {hasMultipleDates ? renderDateView() : renderCategoryView()}
    </div>
  );
}

/** 시간표 항목 한 줄 */
function ScheduleEntryRow({ entry, showCategory }: { entry: PrScheduleEntry; showCategory: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
        entry.round_status === 'completed'
          ? 'bg-green-500/5 border border-green-500/10'
          : entry.round_status === 'in_progress'
          ? 'bg-yellow-500/10 border border-yellow-500/20'
          : 'bg-gray-800/30 border border-gray-700/30'
      }`}
    >
      {entry.scheduled_time && (
        <span className="text-sm font-mono text-gray-400 w-14 shrink-0">
          {entry.scheduled_time}
        </span>
      )}
      {showCategory && <CategoryBadge category={entry.category} label={entry.category_label} />}
      <span className="text-sm text-white">
        {entry.gender_label} {entry.event_name}
      </span>
      <span className="text-xs text-gray-500">{entry.round_label}</span>
      {entry.heat_count > 1 && <span className="text-xs text-gray-600">{entry.heat_count}조</span>}
      {entry.video_url && (
        <a href={entry.video_url} target="_blank" rel="noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300" onClick={e => e.stopPropagation()}>
          📹
        </a>
      )}
      <div className="ml-auto">
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
      } catch (err: any) {
        setError(err.message || '선수 명단을 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, [competitionId]);

  if (loading) return <LoadingSpinner text="선수 명단 불러오는 중..." />;
  if (error) return <ErrorMessage message={error} />;

  const filtered = athletes.filter(a => {
    if (selectedTeam && a.team !== selectedTeam) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.team.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="선수/팀 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white w-48"
        />
        <select
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
        >
          <option value="">전체 팀 ({teams.length})</option>
          {teams.map(t => (
            <option key={t} value={t}>{t} ({(byTeam[t] || []).length}명)</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 flex items-center">{filtered.length}명</span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 100).map(a => (
          <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${a.gender === 'M' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
              {a.gender === 'M' ? '남' : '여'}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{a.name}</div>
              <div className="text-xs text-gray-500">{a.team}</div>
            </div>
            {a.bib_number && (
              <span className="ml-auto text-xs font-mono text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded">
                #{a.bib_number}
              </span>
            )}
          </div>
        ))}
      </div>
      {filtered.length > 100 && (
        <p className="text-center text-gray-500 text-sm mt-4">상위 100명만 표시 (전체 {filtered.length}명)</p>
      )}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

type TabType = 'results' | 'schedule' | 'athletes';

export default function PaceRisePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [competitions, setCompetitions] = useState<PrCompetition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('results');
  const [liveData, setLiveData] = useState<PrLiveCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [compData, liveResult] = await Promise.all([
          getPrCompetitions(),
          getPrLiveCompetitions(),
        ]);
        setCompetitions(compData.competitions);
        setLiveData(liveResult.competitions || []);
        
        // URL parameter or default to first active/latest
        const paramId = searchParams.get('id');
        if (paramId) {
          setSelectedCompId(Number(paramId));
        } else if (compData.competitions.length > 0) {
          const active = compData.competitions.find(c => c.status === 'active');
          setSelectedCompId(active ? active.id : compData.competitions[0].id);
        }

        const paramTab = searchParams.get('tab') as TabType;
        if (paramTab && ['results', 'schedule', 'athletes'].includes(paramTab)) {
          setActiveTab(paramTab);
        }
      } catch (err: any) {
        setError(err.message || '데이터를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelectComp = (id: number) => {
    setSelectedCompId(id);
    setSearchParams({ id: String(id), tab: activeTab });
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (selectedCompId) {
      setSearchParams({ id: String(selectedCompId), tab });
    }
  };

  const selectedComp = competitions.find(c => c.id === selectedCompId);

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <LoadingSpinner text="실업 대회 데이터 연결 중..." />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-900 p-8">
      <ErrorMessage message={error} onRetry={() => window.location.reload()} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-2xl">🏃</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#c8ff00] to-green-400 bg-clip-text text-transparent">
              실업 LIVE
            </h1>
            {/* PaceRise 연동 배지 — 한눈에 "3차 가공"임을 알린다 */}
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-300 text-[11px] font-bold rounded-full border border-blue-400/30">
              {PACERISE_POLICY.badge}
            </span>
            {liveData.length > 0 && <LiveBadge />}
          </div>
          <p className="text-gray-400 text-sm">
            {PACERISE_POLICY.tagline}
          </p>
          {/* 상태 인지형 안내 — 진행 중일 때만 "실시간 결과", 없을 땐 정직하게 */}
          <p className="text-gray-400 text-sm mt-0.5">
            {liveData.length > 0 ? PACERISE_POLICY.liveNotice : PACERISE_POLICY.idleNotice}
          </p>
          {/* PaceRise 원본 바로가기 — 사용자가 1차 출처로 직접 이동 */}
          <a
            href={PACERISE_POLICY.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-sm text-blue-300 hover:text-blue-200 rounded-lg border border-blue-400/20 transition-colors"
          >
            🔗 {PACERISE_POLICY.linkLabel}
            <span aria-hidden>↗</span>
          </a>
          <p className="text-gray-500 text-xs mt-2">
            * 이 페이지는 {BRAND.full}가 PaceRise 데이터를 가져와 다시 정리해 보여드리는 화면이에요. 어떠한 연맹·협회의 공식 서비스가 아니에요.
          </p>
          {/* 확정 기록 안내 배너 */}
          <div className="mt-4 flex items-center gap-3 p-3 bg-[#c8ff00]/5 border border-[#c8ff00]/20 rounded-xl">
            <span className="text-lg">📊</span>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">확정된 경기 기록을 찾으시나요?</p>
              <p className="text-xs text-gray-400 mt-0.5">종료된 대회의 결과는 대회·기록 탭에서 통합 조회할 수 있습니다.</p>
            </div>
            <Link to="/competitions?tab=results" className="shrink-0 px-4 py-2 bg-[#c8ff00]/10 text-[#c8ff00] text-sm font-medium rounded-lg border border-[#c8ff00]/20 hover:bg-[#c8ff00]/20 transition-colors">
              대회·기록 →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Live Section */}
        <LiveSection data={liveData} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Competition list */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-bold text-white mb-3">대회 목록</h2>
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
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedComp.name}</h2>
                      <p className="text-gray-400 text-sm mt-1">
                        {selectedComp.venue} | {selectedComp.start_date} ~ {selectedComp.end_date} | {selectedComp.federation_label}
                      </p>
                    </div>
                    <StatusBadge status={selectedComp.status} label={selectedComp.status_label} />
                  </div>
                  {selectedComp.video_url && (
                    <a href={selectedComp.video_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-blue-400 hover:text-blue-300">
                      📹 실시간 영상 보기
                    </a>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-800/30 p-1 rounded-xl">
                  {([
                    { key: 'results', label: '경기 결과', icon: '🏅' },
                    { key: 'schedule', label: '시간표', icon: '📋' },
                    { key: 'athletes', label: '선수 명단', icon: '👥' },
                  ] as { key: TabType; label: string; icon: string }[]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.key
                          ? 'bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {activeTab === 'results' && <ResultsView competitionId={selectedCompId!} />}
                {activeTab === 'schedule' && <ScheduleView competitionId={selectedCompId!} />}
                {activeTab === 'athletes' && <AthletesView competitionId={selectedCompId!} />}
              </>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg">대회를 선택해주세요</p>
              </div>
            )}
          </div>
        </div>

        {/* PaceRise 연동(3차 가공) 고지 — 출처 → PaceRise → AthleteTime 체인을 명명백백히 */}
        <div className="mt-8 p-4 bg-blue-500/5 border border-blue-400/20 rounded-xl text-xs text-gray-400 space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 text-[10px] font-bold rounded-full border border-blue-400/30">{PACERISE_POLICY.badge}</span>
            <span className="font-medium text-gray-300">데이터 출처 및 면책 안내</span>
          </div>
          {/* 데이터 흐름 시각화 */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
            <span>연맹·협회(원출처)</span>
            <span aria-hidden>→</span>
            <span className="text-blue-300 font-medium">PaceRise(운영·집계)</span>
            <span aria-hidden>→</span>
            <span className="text-gray-300 font-medium">{BRAND.name}(재가공·표시)</span>
          </div>
          <p>📌 {PACERISE_POLICY.thirdPartyNotice}</p>
          <p>⚠️ {PACERISE_POLICY.rightsNotice}</p>
          <p className="text-gray-500">
            ℹ️ {BRAND.name}은 비공식 커뮤니티 프로젝트이며, 어떠한 육상 연맹·협회·단체의 공식 서비스가 아니에요.
            {' '}
            <a href={PACERISE_POLICY.url} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline underline-offset-2">{PACERISE_POLICY.linkLabel} ↗</a>
          </p>
        </div>
      </div>
    </div>
  );
}
