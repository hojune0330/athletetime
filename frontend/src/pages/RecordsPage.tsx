import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getAnalyticsFilters,
  getAthleteAnalytics,
  getSeasonRecordTable,
  searchRecordAthletes,
  type AnalyticsFilters,
  type AthleteAnalyticsProfile,
  type AthleteSearchCard,
  type PublicRecord,
  type SeasonRecordTable,
} from '../api/recordAnalytics';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { resolveRecordDisplay } from '../lib/recordStatus';
import { AnonymousInsightCards } from '../components/record-insights/AnonymousInsightCards';
import { EstimatedSameAthleteCard } from '../components/record-insights/EstimatedSameAthleteCard';
import { MyRecordsCard } from '../components/record-insights/MyRecordsCard';
import { useRecordDetailPref, detailToggleLabel } from '../components/record-insights/useRecordDetailPref';
import { useMyAthlete } from '../components/record-insights/useMyAthlete';
import { AthleteEventTrail } from '../components/record-insights/AthleteEventTrail';
import { AthleteHighlightBadges } from '../components/record-insights/AthleteHighlightBadges';
import { CompareTray } from '../components/record-insights/CompareTray';
import { CompareView } from '../components/record-insights/CompareView';
import { ShareCard } from '../components/record-insights/ShareCard';
import { useCompareTray } from '../components/record-insights/useCompareTray';
import { RecordSearchResults } from '../components/records/RecordSearchResults';
import { TRUST_NOTICE, TRUST_POINTS as POLICY_TRUST_POINTS, resolveProviderLabel, scopeCount, SHARE_POLICY } from '../config/dataPolicy';

type Mode = 'athlete' | 'season';
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

// 카피·신뢰 문구는 중앙 정책(dataPolicy)에서 관리 — 패치 한 곳.
const DATA_NOTICE = TRUST_NOTICE.collectedPublic;
const TRUST_POINTS = POLICY_TRUST_POINTS;

export default function RecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>('athlete');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [searchState, setSearchState] = useState<LoadState>('idle');
  const [athletes, setAthletes] = useState<AthleteSearchCard[]>([]);
  const [selectedAthleteKey, setSelectedAthleteKey] = useState('');
  const [profile, setProfile] = useState<AthleteAnalyticsProfile | null>(null);
  const [profileState, setProfileState] = useState<LoadState>('idle');
  const [filters, setFilters] = useState<AnalyticsFilters | null>(null);
  const [season, setSeason] = useState<number | undefined>();
  const [eventKey, setEventKey] = useState('');
  const [divisionKey, setDivisionKey] = useState('');
  const [seasonTable, setSeasonTable] = useState<SeasonRecordTable | null>(null);
  const [seasonState, setSeasonState] = useState<LoadState>('idle');
  const [compareNotice, setCompareNotice] = useState('');
  // 내 기록 카드는 담긴 게 있으면 버튼 없이 항상 보인다 — 접기만 가능(숨김 아님)
  const [myRecordsCollapsed, setMyRecordsCollapsed] = useState(false);
  const revealMyRecords = () => {
    setMyRecordsCollapsed(false);
    window.setTimeout(() => {
      document.getElementById('my-records')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };
  const compareTray = useCompareTray();
  const { entries: myEntries, isMine, toggle: toggleMyAthlete, addMany: addManyMyAthletes, remove: removeMyAthlete } = useMyAthlete();
  const selectedAthleteParam = (searchParams.get('athlete') || '').trim();

  useEffect(() => {
    let active = true;
    getAnalyticsFilters()
      .then((nextFilters) => {
        if (!active) return;
        setFilters(nextFilters);
        setSeason(nextFilters.seasons[0]);
        setEventKey(nextFilters.events[0]?.key || '');
        setDivisionKey(nextFilters.divisions[0]?.key || '');
      })
      .catch(() => {
        if (active) setFilters({ seasons: [], events: [], divisions: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const nextQuery = (searchParams.get('q') || '').trim();
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedAthleteParam) {
      if (selectedAthleteKey) {
        setSelectedAthleteKey('');
        setProfile(null);
        setProfileState('idle');
      }
      return;
    }

    if (selectedAthleteParam === selectedAthleteKey) return;
    void handleSelectAthlete(selectedAthleteParam, { syncUrl: false });
  }, [selectedAthleteParam, selectedAthleteKey]);

  useEffect(() => {
    const trimmed = submittedQuery.trim();
    if (trimmed.length < 2) {
      setAthletes([]);
      setSearchState('idle');
      if (!selectedAthleteParam) {
        setProfile(null);
        setSelectedAthleteKey('');
      }
      return;
    }

    let active = true;
    setSearchState('loading');
    if (!selectedAthleteParam) {
      setProfile(null);
      setSelectedAthleteKey('');
    }

    searchRecordAthletes(trimmed)
      .then((results) => {
        if (!active) return;
        setAthletes(results);
        setSearchState('ready');
      })
      .catch(() => {
        if (active) setSearchState('error');
      });

    return () => {
      active = false;
    };
  }, [submittedQuery, selectedAthleteParam]);

  useEffect(() => {
    if (!season || !eventKey || !divisionKey) return;
    let active = true;
    setSeasonState('loading');
    getSeasonRecordTable({
      season,
      eventKey,
      divisionKey,
      athleteKey: selectedAthleteKey || undefined,
      limit: 100,
    })
      .then((table) => {
        if (!active) return;
        setSeasonTable(table);
        setSeasonState('ready');
      })
      .catch(() => {
        if (active) setSeasonState('error');
      });
    return () => {
      active = false;
    };
  }, [season, eventKey, divisionKey, selectedAthleteKey]);

  const compareKeys = useMemo(() => {
    const raw = (searchParams.get('compare') || '').trim();
    if (!raw) return [] as string[];
    return Array.from(new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))).slice(0, 4);
  }, [searchParams]);

  const closeCompare = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('compare');
    setSearchParams(next);
  };

  const highlightedRow = useMemo(
    () => seasonTable?.rows.find((row) => row.highlighted) || null,
    [seasonTable],
  );
  const shouldShowAthletePanel = mode === 'athlete' && (profile || profileState !== 'idle');
  const shouldPrioritizeAthletePanel = shouldShowAthletePanel && Boolean(selectedAthleteParam);
  const isSharedLinkFallback = Boolean(selectedAthleteParam) && profileState === 'error';

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setSubmittedQuery(trimmed);
    const next = new URLSearchParams(searchParams);
    next.set('q', trimmed);
    next.delete('athlete');
    setSearchParams(next);
  };

  const handleSelectAthlete = async (athleteKey: string, options: { syncUrl?: boolean } = {}) => {
    const { syncUrl = true } = options;
    if (syncUrl) {
      const next = new URLSearchParams(searchParams);
      next.set('athlete', athleteKey);
      setSearchParams(next);
    }
    setSelectedAthleteKey(athleteKey);
    setProfileState('loading');
    try {
      const nextProfile = await getAthleteAnalytics(athleteKey);
      setProfile(nextProfile);
      setProfileState('ready');

      const mainRecord = nextProfile.summary.latest || nextProfile.summary.indexedBest || nextProfile.records[0];
      if (mainRecord) {
        setSeason(mainRecord.season);
        setEventKey(mainRecord.eventKey);
        setDivisionKey(mainRecord.divisionKey);
      }
    } catch {
      setProfileState('error');
    }
  };

  const showSearchCandidates = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('athlete');
    setSearchParams(next);
    setSelectedAthleteKey('');
    setProfile(null);
    setProfileState('idle');
  };

  return (
    <div className="space-y-6">
      <section className="border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand">공개 기록 모아보기</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              내 기록, 이름만 알면 찾아요.
            </h1>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="grid grid-cols-2 border border-line bg-surface-2 p-1">
              <ModeButton active={mode === 'athlete'} onClick={() => setMode('athlete')}>
                기록 한눈에
              </ModeButton>
              <ModeButton active={mode === 'season'} onClick={() => setMode('season')}>
                시즌 기록표
              </ModeButton>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label htmlFor="records-search" className="sr-only">
            공개 기록 검색
          </label>
          <Input
            id="records-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름 또는 소속(예: 홍길동, 서울고)"
            aria-describedby="records-search-help"
            className="h-12 border-line bg-white text-base"
          />
          <Button type="submit" size="lg" disabled={query.trim().length < 2 || searchState === 'loading'}>
            {searchState === 'loading' ? '검색 중' : '검색'}
          </Button>
        </form>
        <p id="records-search-help" className="mt-2 text-xs leading-5 text-ink-4">
          두 글자 이상 입력하면 검색할 수 있어요.
        </p>
      </section>

      {compareKeys.length >= 2 && (
        <CompareView
          athleteKeys={compareKeys}
          onSelectAthlete={(key) => {
            closeCompare();
            handleSelectAthlete(key);
          }}
          onClose={closeCompare}
        />
      )}

      {searchState === 'error' && (
        <NoticeCard
          role="alert"
          title="검색을 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
        />
      )}

      {searchState === 'ready' && submittedQuery.trim().length >= 2 && athletes.length === 0 && (
        <NoticeCard
          role="status"
          title="찾는 기록이 아직 없어요"
          description="이름이나 소속을 바꿔보세요. 시즌 기록표에서 종목·부문으로도 둘러볼 수 있어요."
          action={
            <Button type="button" variant="outline" onClick={() => setMode('season')}>
              시즌 기록표 보기
            </Button>
          }
        />
      )}

      {searchState === 'idle' && athletes.length === 0 && !profile && (
        <div className="space-y-6">
          <StartPanel onSeasonMode={() => setMode('season')} />
          <AnonymousInsightCards
            onPickEvent={(key) => {
              setEventKey(key);
              setMode('season');
            }}
          />
        </div>
      )}

      {/* 내 기록 — 별도 진입 버튼 없이 항상 보임. 접으면 슬림 바로 남는다. */}
      {myEntries.length > 0 && (
        myRecordsCollapsed ? (
          <button
            type="button"
            id="my-records"
            onClick={() => setMyRecordsCollapsed(false)}
            className="flex w-full items-center justify-between gap-3 border border-brand border-l-4 bg-brand/5 px-4 py-3 text-left transition hover:bg-brand/10"
          >
            <span className="min-w-0 truncate text-sm text-ink">
              <span className="font-bold text-brand">내 기록</span>
              <span className="ml-2 font-semibold">{myEntries[0].name}</span>
              <span className="ml-2 text-ink-4">{myEntries.length}개 묶음 합산 중</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-brand">펼치기</span>
          </button>
        ) : (
          <div id="my-records">
            <MyRecordsCard
              entries={myEntries}
              onClose={() => setMyRecordsCollapsed(true)}
              onRemove={removeMyAthlete}
            />
          </div>
        )
      )}

      {shouldPrioritizeAthletePanel && (
        <AthletePanel
          profile={profile}
          state={profileState}
          isSharedLinkFallback={isSharedLinkFallback}
          inTray={profile ? compareTray.isInTray(profile.athlete.athleteKey) : false}
          isMyAthlete={profile ? isMine(profile.athlete.athleteKey) : false}
          onSetMyAthlete={() => {
            if (!profile) return;
            const wasMine = isMine(profile.athlete.athleteKey);
            toggleMyAthlete({
              athleteKey: profile.athlete.athleteKey,
              name: profile.athlete.name,
              team: profile.athlete.team,
            });
            if (!wasMine) revealMyRecords();
          }}
          onShowSearchCandidates={showSearchCandidates}
          onToggleCompare={() => {
            if (!profile) return;
            const res = compareTray.toggle({
              athleteKey: profile.athlete.athleteKey,
              name: profile.athlete.name,
              team: profile.athlete.team,
            });
            if (!res.ok && res.reason === 'full') {
              setCompareNotice('비교는 최대 4명까지 나란히 볼 수 있어요.');
              window.setTimeout(() => setCompareNotice(''), 2400);
            }
          }}
        />
      )}

      {athletes.length > 0 && (
        <RecordSearchResults
          athletes={athletes}
          query={submittedQuery}
          selectedAthleteKey={selectedAthleteKey}
          compareNotice={compareNotice}
          isInCompareTray={compareTray.isInTray}
          isMine={isMine}
          myCount={myEntries.length}
          onViewMyRecords={revealMyRecords}
          onToggleMine={(athlete) => {
            // 검색 후보에서 바로 "나" 지정 — 누르는 즉시 내 기록으로 합산 (여러 개 누르면 전부 합산)
            toggleMyAthlete({
              athleteKey: athlete.athleteKey,
              name: athlete.name,
              team: athlete.team,
            });
          }}
          onSelectAthlete={handleSelectAthlete}
          onToggleCompare={(athlete) => {
            const res = compareTray.toggle({
              athleteKey: athlete.athleteKey,
              name: athlete.name,
              team: athlete.team,
            });
            if (!res.ok && res.reason === 'full') {
              setCompareNotice('비교는 최대 4명까지 나란히 볼 수 있어요.');
              window.setTimeout(() => setCompareNotice(''), 2400);
            }
          }}
        />
      )}

      {shouldShowAthletePanel && !shouldPrioritizeAthletePanel && (
        <AthletePanel
          profile={profile}
          state={profileState}
          inTray={profile ? compareTray.isInTray(profile.athlete.athleteKey) : false}
          isMyAthlete={profile ? isMine(profile.athlete.athleteKey) : false}
          onSetMyAthlete={() => {
            if (!profile) return;
            const wasMine = isMine(profile.athlete.athleteKey);
            toggleMyAthlete({
              athleteKey: profile.athlete.athleteKey,
              name: profile.athlete.name,
              team: profile.athlete.team,
            });
            if (!wasMine) revealMyRecords();
          }}
          onToggleCompare={() => {
            if (!profile) return;
            const res = compareTray.toggle({
              athleteKey: profile.athlete.athleteKey,
              name: profile.athlete.name,
              team: profile.athlete.team,
            });
            if (!res.ok && res.reason === 'full') {
              setCompareNotice('비교는 최대 4명까지 나란히 볼 수 있어요.');
              window.setTimeout(() => setCompareNotice(''), 2400);
            }
          }}
        />
      )}

      {shouldShowAthletePanel && profileState === 'ready' && selectedAthleteKey && (
        <EstimatedSameAthleteCard
          athleteKey={selectedAthleteKey}
          athleteName={profile?.athlete.name || ''}
          onSelectAthlete={handleSelectAthlete}
          onCombine={(segments) => {
            // 원탭 합산 — 묶음 전부를 바로 내 기록으로 (확인 절차 없음, 빼기는 나중에)
            addManyMyAthletes(segments);
            revealMyRecords();
          }}
        />
      )}

      {mode === 'season' && (
        <SeasonPanel
          filters={filters}
          season={season}
          eventKey={eventKey}
          divisionKey={divisionKey}
          table={seasonTable}
          state={seasonState}
          highlightedRow={highlightedRow}
          onSeasonChange={setSeason}
          onEventChange={setEventKey}
          onDivisionChange={setDivisionKey}
        />
      )}

      {/* 안내·신뢰 문구는 페이지 맨 아래 한 줄로 */}
      <p className="text-[11px] leading-4 text-ink-4">
        지금은 2018년 이후 기록을 보여드려요 (2005-2017 기록은 정리 중). {DATA_NOTICE} {TRUST_POINTS.join(' · ')} ·{' '}
        <Link to="/about-data" className="font-medium text-brand-500 underline-offset-2 hover:underline">
          데이터 안내 보기
        </Link>
      </p>

      {/* 비교 트레이 분량만큼 하단 여백 (담은 게 있을 때만) */}
      {compareTray.count > 0 && <div aria-hidden className="h-28 sm:h-24" />}
      <CompareTray
        onCompare={(athleteKeys) => {
          setSearchParams({ compare: athleteKeys.join(',') });
        }}
      />
    </div>
  );
}

function StartPanel({ onSeasonMode }: { onSeasonMode: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">위 검색창에 이름을 적어보세요.</h2>
          <p className="mt-1 text-sm text-ink-3">
            같은 이름이 여러 명이면 소속을 보고, "내 기록이에요"를 누르면(=나로 지정) 바로 내 기록이 돼요.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onSeasonMode} className="shrink-0">
          시즌 기록표 보기
        </Button>
      </CardContent>
    </Card>
  );
}

function AthletePanel({
  profile,
  state,
  isSharedLinkFallback = false,
  inTray = false,
  isMyAthlete = false,
  onSetMyAthlete,
  onShowSearchCandidates,
  onToggleCompare,
}: {
  profile: AthleteAnalyticsProfile | null;
  state: LoadState;
  isSharedLinkFallback?: boolean;
  inTray?: boolean;
  isMyAthlete?: boolean;
  onSetMyAthlete?: () => void;
  onShowSearchCandidates?: () => void;
  onToggleCompare?: () => void;
}) {
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareLinkMessage, setShareLinkMessage] = useState('');
  // 토스식 단계 공개 — 요약은 바로, 발자취/전체 기록은 누르면 열림
  const [openSection, setOpenSection] = useState<'' | 'trail' | 'records'>('');
  // 날짜·순위·비고 표시 여부 (기기 단위 기억)
  const detailPref = useRecordDetailPref();
  const shareCopyStartedAtRef = useRef(0);

  if (state === 'loading') {
    return <NoticeCard role="status" title="기록을 정리하는 중입니다" description="모은 공개 기록을 기준으로 요약하고 있습니다." />;
  }

  if (state === 'error') {
    return (
      <NoticeCard
        role="alert"
        title={isSharedLinkFallback ? '링크의 선수를 못 찾았어요' : '선수 기록을 불러오지 못했습니다'}
        description={
          isSharedLinkFallback
            ? '데이터 정리로 주소가 바뀌었을 수 있어요. 검색 결과에서 다시 선택해 주세요.'
            : '검색 결과에서 다시 선택해 주세요.'
        }
        action={
          isSharedLinkFallback && onShowSearchCandidates ? (
            <Button type="button" variant="outline" onClick={onShowSearchCandidates}>
              검색 결과 보기
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (!profile) {
    return <NoticeCard title="선수 이름으로 공개 기록을 찾아보세요" description="검색 결과에서 이름과 소속을 확인한 뒤 선택해 주세요." />;
  }

  const { athlete, summary } = profile;
  const clearShareLinkMessage = () => {
    window.setTimeout(() => setShareLinkMessage(''), 2400);
  };

  const handleCopyShareLink = () => {
    const now = Date.now();
    if (now - shareCopyStartedAtRef.current < 500) return;
    shareCopyStartedAtRef.current = now;
    const shareUrl = window.location.href;
    setShareLinkMessage('공유 링크를 복사하는 중이에요.');
    if (!navigator.clipboard?.writeText) {
      setShareLinkMessage('주소창의 링크를 직접 복사해 주세요.');
      clearShareLinkMessage();
      return;
    }

    window.setTimeout(() => {
      void navigator.clipboard.writeText(shareUrl)
        .then(() => setShareLinkMessage('공유 링크를 복사했어요.'))
        .catch(() => setShareLinkMessage('주소창의 링크를 직접 복사해 주세요.'))
        .finally(clearShareLinkMessage);
    }, 0);
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand">기록 한눈에</p>
              <CardTitle className="mt-2 text-3xl">{athlete.name}</CardTitle>
              <p className="mt-2 text-sm text-ink-3">{athlete.team || '소속 미상'} · {formatYearRange(athlete.years)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onSetMyAthlete && (
                <button
                  type="button"
                  onClick={onSetMyAthlete}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-bold transition ${
                    isMyAthlete
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-brand-500 bg-white text-brand hover:bg-brand-50'
                  }`}
                >
                  {isMyAthlete ? '✓ 내 기록에 담김' : '내 기록이에요'}
                </button>
              )}
              <button
                type="button"
                onClick={onToggleCompare}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  inTray
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-line bg-surface-2 text-ink-3 hover:border-brand-500/50 hover:text-ink'
                }`}
              >
                {inTray ? '✓ 비교에 담음' : '+ 비교에 담기'}
              </button>
              <button
                type="button"
                onClick={handleCopyShareLink}
                onMouseDown={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-medium text-ink-3 transition hover:border-brand-500/50 hover:text-ink"
              >
                기록 링크 공유
              </button>
              {SHARE_POLICY.status === 'enabled' ? (
                <button
                  type="button"
                  onClick={() => setShowShareCard((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    showShareCard
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-line bg-surface-2 text-ink-3 hover:border-brand-500/50 hover:text-ink'
                  }`}
                >
                  {showShareCard ? '공유 카드 닫기' : SHARE_POLICY.enabledLabel}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title={SHARE_POLICY.preparingTitle}
                  className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-sm font-medium text-ink-4"
                >
                  {SHARE_POLICY.enabledLabel} <span className="text-[11px]">{SHARE_POLICY.preparingLabel}</span>
                </button>
              )}
              <Link to={`/data-request?athlete=${encodeURIComponent(athlete.name)}`}>
                <Button variant="outline">기록 고치거나 숨기기</Button>
              </Link>
            </div>
          </div>
          {shareLinkMessage && (
            <div role="status" className="mt-2 space-y-1 text-xs leading-5 text-ink-4 sm:text-right">
              <p className="font-medium text-brand">{shareLinkMessage}</p>
              <p>틀렸거나 빼고 싶다면 이 화면에서 정정·비노출을 요청할 수 있어요.</p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <MetricCard label="모은 기록 중 최고" record={summary.indexedBest} />
            <MetricCard label="이번 시즌 최고" record={summary.seasonBest} />
            <MetricCard label="최근 기록" record={summary.latest} />
            <div className="border border-line bg-surface-2 p-4">
              <p className="text-xs text-ink-4">모은 기록 수</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{summary.indexedResultCount}</p>
              <p className="mt-1 text-xs text-ink-4">비교 가능 기록 {summary.comparableResultCount}</p>
            </div>
          </div>
          <AthleteHighlightBadges profile={profile} />
          {/* 안내문구는 전부 맨 아래로 */}
          <div className="mt-4 border-t border-hair pt-3 text-[11px] leading-4 text-ink-4">
            <p>같은 이름의 다른 선수일 수 있어요. 소속·연도를 함께 확인하세요. {summary.disclaimer}</p>
            <p className="mt-1">링크는 이 화면을 다시 열기 위한 주소예요. 공식 기록 서비스는 아니에요. {TRUST_NOTICE.partial}</p>
          </div>
        </CardContent>
      </Card>

      {SHARE_POLICY.status === 'enabled' && showShareCard ? (
        <ShareCard profile={profile} onClose={() => setShowShareCard(false)} />
      ) : null}

      {/* 단계 공개: 요약 아래는 눌러야 열리는 섹션 — 한번에 다 보여주지 않는다 */}
      <DisclosureSection
        title="기록 발자취"
        description="종목별 기록 흐름을 그래프로 보여줘요"
        open={openSection === 'trail'}
        onToggle={() => setOpenSection(openSection === 'trail' ? '' : 'trail')}
      >
        <p className="mb-3 text-sm text-ink-3">공개 기록의 흐름이에요. 평가나 예측은 하지 않아요.</p>
        <AthleteEventTrail profile={profile} />
      </DisclosureSection>

      <DisclosureSection
        title="최근 모은 기록"
        description={`최근 기록 ${Math.min(profile.records.length, 8)}개를 한 줄씩 보여줘요`}
        open={openSection === 'records'}
        onToggle={() => setOpenSection(openSection === 'records' ? '' : 'records')}
      >
        {/* 날짜·순위·비고 보기/숨기기 — 디자인이 답답하면 간단히로 접기 */}
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={detailPref.toggle}
            aria-pressed={detailPref.detail}
            className="border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-3 transition hover:border-line-2 hover:text-ink"
          >
            {detailToggleLabel(detailPref.detail)}
          </button>
        </div>
        <div className="space-y-2">
          {profile.records.slice(0, 8).map((record) => (
            <RecordLine key={record.id} record={record} detail={detailPref.detail} />
          ))}
        </div>
      </DisclosureSection>
    </section>
  );
}

/** 토스식 단계 공개 카드 — 제목줄을 누르면 내용이 열린다 */
function DisclosureSection({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-6 text-left transition hover:bg-surface-2/60"
      >
        <div>
          <p className="text-lg font-semibold text-ink">{title}</p>
          {!open && <p className="mt-1 text-sm text-ink-3">{description}</p>}
        </div>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 shrink-0 text-ink-4 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

function SeasonPanel({
  filters,
  season,
  eventKey,
  divisionKey,
  table,
  state,
  highlightedRow,
  onSeasonChange,
  onEventChange,
  onDivisionChange,
}: {
  filters: AnalyticsFilters | null;
  season?: number;
  eventKey: string;
  divisionKey: string;
  table: SeasonRecordTable | null;
  state: LoadState;
  highlightedRow: SeasonRecordTable['rows'][number] | null;
  onSeasonChange: (season: number) => void;
  onEventChange: (eventKey: string) => void;
  onDivisionChange: (divisionKey: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">시즌 기록표</p>
            <CardTitle className="mt-2">시즌 기록 모음</CardTitle>
            <p className="mt-2 text-sm text-ink-3">모은 기록 기준 정렬이라 실제와 다를 수 있어요.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <SelectBox value={String(season || '')} onChange={(value) => onSeasonChange(Number(value))}>
              {(filters?.seasons || []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </SelectBox>
            <SelectBox value={eventKey} onChange={onEventChange}>
              {(filters?.events || []).map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </SelectBox>
            <SelectBox value={divisionKey} onChange={onDivisionChange}>
              {(filters?.divisions || []).map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </SelectBox>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {highlightedRow && (
          <div className="mb-4 border border-brand bg-brand/5 p-4">
            <p className="text-xs font-semibold text-brand">선택한 선수 표시</p>
            <p className="mt-1 text-sm text-ink">
              {highlightedRow.name} · {highlightedRow.rank}번째 기록 · {highlightedRow.record}
            </p>
          </div>
        )}

        {state === 'loading' && <NoticeCard role="status" title="시즌 기록표를 불러오는 중입니다" description="모은 기록을 정렬하고 있습니다." />}
        {state === 'error' && <NoticeCard role="alert" title="시즌 기록표를 불러오지 못했습니다" description="필터를 바꾸거나 다시 시도해 주세요." />}

        {table && state !== 'loading' && (
          <>
            <div className="mb-3 flex flex-col gap-1 text-xs text-ink-4 sm:flex-row sm:items-center sm:justify-between">
              <span>{table.season} · {table.eventLabel} · {table.divisionLabel}</span>
              <span>{scopeCount(table.totalIndexedAthletes, '명')}</span>
            </div>
            {/* 데스크탑: 표 — 기록/일자는 줄바꿈 없이 모노 폰트로 선명하게 */}
            <div className="hidden overflow-x-auto border border-line sm:block">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="bg-surface-2 text-left text-xs text-ink-4">
                  <tr>
                    <th className="w-12 p-2.5">순서</th>
                    <th className="p-2.5">선수</th>
                    <th className="w-28 p-2.5">기록</th>
                    <th className="p-2.5">대회</th>
                    <th className="w-28 p-2.5">일자</th>
                    <th className="w-16 p-2.5">풍속</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => (
                    <tr
                      key={`${row.rank}-${row.athleteKey}`}
                      className={row.highlighted ? 'bg-brand/5' : 'border-t border-line'}
                    >
                      <td className="w-12 p-2.5 font-mono tabular-nums text-ink-3">{row.rank}</td>
                      <td className="max-w-[180px] p-2.5">
                        <p className="truncate font-semibold text-ink">{row.name}</p>
                        <p className="truncate text-xs text-ink-4">{row.team || '소속 미상'}</p>
                      </td>
                      <td className="w-28 whitespace-nowrap p-2.5 font-mono text-base font-semibold tabular-nums text-ink">{row.record}</td>
                      <td className="max-w-[220px] truncate p-2.5 text-ink-3">{row.competitionName}</td>
                      <td className="w-28 whitespace-nowrap p-2.5 font-mono text-xs tabular-nums text-ink-3">{row.date}</td>
                      <td className="w-16 whitespace-nowrap p-2.5 font-mono text-xs tabular-nums text-ink-3">{row.wind || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일: 가로 스크롤 없는 카드 행 — 기록·대회·일자가 한눈에 */}
            <div className="space-y-1.5 sm:hidden">
              {table.rows.map((row) => (
                <div
                  key={`m-${row.rank}-${row.athleteKey}`}
                  className={`border p-3 ${row.highlighted ? 'border-brand bg-brand/5' : 'border-line bg-surface'}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-ink">
                      <span className="mr-1.5 font-mono text-xs tabular-nums text-ink-4">{row.rank}</span>
                      {row.name}
                    </p>
                    <p className="shrink-0 font-mono text-base font-semibold tabular-nums text-ink">{row.record}</p>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-ink-4">
                    <p className="min-w-0 truncate">{row.team || '소속 미상'} · {row.competitionName}</p>
                    <p className="shrink-0 font-mono tabular-nums">{row.date}{row.wind ? ` · ${row.wind}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-ink-4">{table.disclaimer}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'text-ink-3 hover:bg-surface hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function SelectBox({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 border border-line bg-surface px-3 text-sm text-ink"
    >
      {children}
    </select>
  );
}

function MetricCard({ label, record }: { label: string; record: PublicRecord | null }) {
  const display = record ? resolveRecordDisplay(record.record, record.note) : null;
  return (
    <div className="border border-line bg-surface-2 p-4">
      <p className="text-xs text-ink-4">{label}</p>
      <p className={`mt-2 font-semibold ${display?.hasMark ? 'text-2xl text-ink' : 'text-lg text-ink-3'}`}>
        {display ? display.text : '-'}
      </p>
      <p className="mt-1 truncate text-xs text-ink-4">{record ? `${record.eventLabel} · ${record.season}` : '모은 기록 없음'}</p>
    </div>
  );
}

function RecordLine({ record, detail = true }: { record: PublicRecord; detail?: boolean }) {
  const display = resolveRecordDisplay(record.record, record.note);
  return (
    <div className="border border-line p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-ink">
          {record.eventLabel} · {record.competitionName}
        </p>
        <p className={`shrink-0 font-mono tabular-nums ${display.hasMark ? 'text-base font-semibold text-ink' : 'text-sm font-medium text-ink-4'}`}>
          {display.text}
          {detail && record.rank != null && (
            <span className="ml-1.5 text-xs font-medium text-ink-4">{record.rank}위</span>
          )}
        </p>
      </div>
      {detail && (
        <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-ink-4">
          <p className="min-w-0 truncate">{record.divisionLabel} · {record.venue || '장소 미상'} · 출처 {resolveProviderLabel(record.source.provider)}</p>
          <p className="shrink-0 font-mono tabular-nums">{record.date}</p>
        </div>
      )}
    </div>
  );
}

function NoticeCard({
  title,
  description,
  role,
  action,
}: {
  title: string;
  description: string;
  role?: 'status' | 'alert';
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6" {...(role ? { role, 'aria-live': role === 'alert' ? 'assertive' : 'polite' } : {})}>
        <p className="text-lg font-semibold text-ink">{title}</p>
        <p className="mt-2 text-sm text-ink-3">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

function formatYearRange(years: number[]) {
  if (!years.length) return '연도 미상';
  if (years.length === 1) return String(years[0]);
  return `${years[0]}-${years[years.length - 1]}`;
}
