import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getAnalyticsFilters,
  getAthleteAnalytics,
  searchRecordAthletes,
  type AnalyticsFilters,
  type AthleteAnalyticsProfile,
  type AthleteSearchCard,
  type PublicRecord,
} from '../api/recordAnalytics';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { resolveRecordDisplay } from '../lib/recordStatus';
import { AnonymousInsightCards } from '../components/record-insights/AnonymousInsightCards';
import { EstimatedSameAthleteCard } from '../components/record-insights/EstimatedSameAthleteCard';
import { useRecordDetailPref, detailToggleLabel } from '../components/record-insights/useRecordDetailPref';
import { MAX_MY_ATHLETE_ENTRIES, useMyAthlete } from '../components/record-insights/useMyAthlete';
import { AthleteEventTrail } from '../components/record-insights/AthleteEventTrail';
import { AthleteHighlightBadges } from '../components/record-insights/AthleteHighlightBadges';
import { CompareTray } from '../components/record-insights/CompareTray';
import { CompareView } from '../components/record-insights/CompareView';
import { ShareCard } from '../components/record-insights/ShareCard';
import { useCompareTray } from '../components/record-insights/useCompareTray';
import { RecordsBrowseGateway, type BrowseChoice } from '../components/records/RecordsBrowseGateway';
import { RecordsHub } from '../components/records/RecordsHub';
import { RecordSearchForm } from '../components/records/RecordSearchForm';
import { RecordsMineFlow } from '../components/records/RecordsMineFlow';
import { normalizeMineStep, type MineStep } from '../components/records/RecordsMineTypes';
import { RecordDeviceDataControls } from '../components/records/RecordDeviceDataControls';
import { TeamStatisticsResults } from '../components/records/TeamStatisticsResults';
import { TeamCategoryFilter } from '../features/team-performance/TeamCategoryFilter';
import { searchTeamPerformance } from '../features/team-performance/teamPerformanceApi';
import { parseTeamCategory } from '../features/team-performance/teamPerformanceContracts';
import type { TeamCategory, TeamSearchSummary } from '../features/team-performance/teamPerformanceContracts';
import { RecordCandidatesSurface } from '../features/record-workspace/components/RecordCandidatesSurface';
import { SeasonRecordsPanel } from '../features/record-workspace/season-navigation/SeasonRecordsPanel';
import {
  resolveAthleteSeasonSelection,
  resolveSeasonSelection,
  updateSeasonSelectionParams,
  type SeasonSelection,
} from '../features/record-workspace/season-navigation/seasonNavigation';
import { useSeasonRecordsController } from '../features/record-workspace/season-navigation/useSeasonRecordsController';
import { useRecordWorkspaceStore } from '../features/record-workspace/useRecordWorkspaceStore';
import { TRUST_NOTICE, TRUST_POINTS as POLICY_TRUST_POINTS, resolveProviderLabel, SHARE_POLICY } from '../config/dataPolicy';

type Mode = 'athlete' | 'season';
type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type RecordsFlow = 'mine' | 'browse';

// 카피·신뢰 문구는 중앙 정책(dataPolicy)에서 관리 — 패치 한 곳.
const DATA_NOTICE = TRUST_NOTICE.collectedPublic;
const TRUST_POINTS = POLICY_TRUST_POINTS;

export default function RecordsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('athlete');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [searchState, setSearchState] = useState<LoadState>('idle');
  const [athletes, setAthletes] = useState<AthleteSearchCard[]>([]);
  const [teamStatistics, setTeamStatistics] = useState<readonly TeamSearchSummary[]>([]);
  const [selectedAthleteKey, setSelectedAthleteKey] = useState('');
  const [profile, setProfile] = useState<AthleteAnalyticsProfile | null>(null);
  const [profileState, setProfileState] = useState<LoadState>('idle');
  const [filters, setFilters] = useState<AnalyticsFilters | null>(null);
  const filtersRef = useRef<AnalyticsFilters | null>(null);
  const filtersRequestRef = useRef<Promise<AnalyticsFilters> | null>(null);
  const seasonController = useSeasonRecordsController({
    filters,
    athleteKey: selectedAthleteKey,
  });
  const [workspaceSelectionMode, setWorkspaceSelectionMode] = useState(false);
  const [compareNotice, setCompareNotice] = useState('');
  const compareTray = useCompareTray();
  const workspaceStore = useRecordWorkspaceStore();
  const { entries: myEntries, isMine, toggle: toggleMyAthlete, addMany: addManyMyAthletes, remove: removeMyAthlete } = useMyAthlete();
  const selectedAthleteParam = (searchParams.get('athlete') || '').trim();
  const activeFlow = normalizeRecordsFlow(searchParams.get('flow'));
  const mineStep = normalizeMineStep(searchParams.get('step'));
  const browseChoice = normalizeBrowseChoice(searchParams.get('browse'));
  const isTeamBrowse = activeFlow === 'browse' && browseChoice === 'team';
  const teamCategory = parseTeamCategory(searchParams.get('category'));
  const mineAvailableSlots = Math.max(0, MAX_MY_ATHLETE_ENTRIES - myEntries.length);
  const mineDraftKeys = parseKeyList(searchParams.get('mineDraft')).slice(0, mineAvailableSlots);
  const workspaceDraftKeys = workspaceStore.workspaceDraft?.subjectKeys ?? [];
  const deviceDraftCount = workspaceDraftKeys.length + (workspaceStore.selfClaimDraft?.subjectKeys.length ?? 0);

  const toggleProfileComparison = (currentProfile: AthleteAnalyticsProfile) => {
    const result = compareTray.toggle({
      athleteKey: currentProfile.athlete.athleteKey,
      name: currentProfile.athlete.name,
      team: currentProfile.athlete.team,
    });
    setCompareNotice(!result.removed && result.reason === 'full' ? '선수 비교는 4명까지 가능해요.' : '');
  };

  useEffect(() => {
    const state = location.state as { focusSearch?: boolean; workspaceSelection?: boolean } | null;
    if (state?.focusSearch) searchInputRef.current?.focus();
    if (state?.workspaceSelection) setWorkspaceSelectionMode(true);
  }, [location.key, location.state]);

  useEffect(() => {
    let active = true;
    const filtersRequest = getAnalyticsFilters();
    filtersRequestRef.current = filtersRequest;
    filtersRequest
      .then((nextFilters) => {
        if (!active) return;
        filtersRef.current = nextFilters;
        setFilters(nextFilters);
      })
      .catch(() => {
        if (active) {
          const fallbackFilters: AnalyticsFilters = {
            seasons: [],
            events: [],
            divisions: [],
            genderOptions: [],
            levelOptions: [],
            availableSeasonCombinations: [],
            defaultSeasonSelection: {
              season: new Date().getFullYear(),
              eventKey: '',
              eventLabel: '',
              divisionKey: 'men-all',
              divisionLabel: '',
              genderKey: 'men',
              divisionLevel: 'all',
              rowCount: 0,
            },
          };
          filtersRef.current = fallbackFilters;
          setFilters(fallbackFilters);
        }
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
    if (activeFlow !== 'browse') return;
    if (browseChoice === 'season') {
      setMode('season');
      return;
    }
    if (browseChoice === 'athlete' || browseChoice === 'team') setMode('athlete');
  }, [activeFlow, browseChoice]);

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
      setTeamStatistics([]);
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

    if (isTeamBrowse) {
      setAthletes([]);
      searchTeamPerformance({ query: trimmed, category: teamCategory })
        .then((results) => {
          if (!active) return;
          setTeamStatistics(results);
          setSearchState('ready');
        })
        .catch(() => {
          if (active) setSearchState('error');
        });
    } else {
      setTeamStatistics([]);
      searchRecordAthletes(trimmed)
        .then((results) => {
          if (!active) return;
          setAthletes(results);
          setSearchState('ready');
        })
        .catch(() => {
          if (active) setSearchState('error');
        });
    }

    return () => {
      active = false;
    };
  }, [submittedQuery, selectedAthleteParam, isTeamBrowse, teamCategory]);

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
    () => seasonController.table?.rows.find((row) => row.highlighted) || null,
    [seasonController.table],
  );
  const shouldShowAthletePanel = mode === 'athlete' && (profile || profileState !== 'idle');
  const shouldPrioritizeAthletePanel = shouldShowAthletePanel && Boolean(selectedAthleteParam);
  const isSharedLinkFallback = Boolean(selectedAthleteParam) && profileState === 'error';

  const handleSearch = (trimmedQuery: string) => {
    setSubmittedQuery(trimmedQuery);
    const next = new URLSearchParams(searchParams);
    next.set('q', trimmedQuery);
    next.delete('athlete');
    setSearchParams(next);
  };

  const handleSelectAthlete = async (
    athleteKey: string,
    options: { syncUrl?: boolean; deferSelection?: boolean } = {},
  ): Promise<PublicRecord | null> => {
    const { syncUrl = true, deferSelection = false } = options;
    if (syncUrl) {
      const next = new URLSearchParams(searchParams);
      next.set('athlete', athleteKey);
      setSearchParams(next);
    }
    if (!deferSelection) setSelectedAthleteKey(athleteKey);
    setProfileState('loading');
    try {
      const nextProfile = await getAthleteAnalytics(athleteKey);
      setProfile(nextProfile);
      setProfileState('ready');

      const mainRecord = nextProfile.summary.latest || nextProfile.summary.indexedBest || nextProfile.records[0] || null;
      const activeFilters = filtersRef.current;
      if (mainRecord && activeFilters && !deferSelection) {
        const nextSelection = resolveAthleteSeasonSelection(activeFilters, mainRecord);
        if (nextSelection) seasonController.setTransientSelection(nextSelection);
      }
      return mainRecord;
    } catch {
      setProfileState('error');
      return null;
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

  const openHub = () => {
    setQuery('');
    setSubmittedQuery('');
    const next = new URLSearchParams(searchParams);
    deleteRecordsFlowParams(next);
    next.delete('q');
    next.delete('athlete');
    next.delete('compare');
    setSearchParams(next);
  };

  const openMineStart = () => {
    setQuery('');
    setSubmittedQuery('');
    const next = new URLSearchParams(searchParams);
    next.set('flow', 'mine');
    next.set('step', 'name');
    next.delete('q');
    next.delete('browse');
    next.delete('mineDraft');
    next.delete('athlete');
    next.delete('compare');
    setSearchParams(next);
  };

  const showMyRecordsHome = () => {
    const next = new URLSearchParams(searchParams);
    next.set('flow', 'mine');
    next.set('step', 'done');
    next.delete('browse');
    next.delete('mineDraft');
    next.delete('athlete');
    next.delete('compare');
    setSearchParams(next);
  };

  const openBrowseChoice = (
    choice: BrowseChoice,
    requestedEventKey?: string,
    selectionOverride?: SeasonSelection | null,
  ) => {
    let next = new URLSearchParams(searchParams);
    next.set('flow', 'browse');
    next.set('browse', choice);
    next.delete('step');
    next.delete('mineDraft');
    next.delete('athlete');
    next.delete('compare');
    next.delete('category');

    const activeFilters = filtersRef.current;
    if (choice === 'season' && activeFilters) {
      const resolved = selectionOverride ?? resolveSeasonSelection(activeFilters, {
        season: seasonController.selection?.season ?? null,
        eventKey: requestedEventKey ?? seasonController.selection?.eventKey ?? null,
        divisionKey: seasonController.selection?.divisionKey ?? null,
      });
      if (resolved) {
        next = updateSeasonSelectionParams(next, resolved);
      }
    }

    setMode(choice === 'season' ? 'season' : 'athlete');
    setSearchParams(next);
  };

  const selectTeamCategory = (category: TeamCategory | null) => {
    const next = new URLSearchParams(searchParams);
    if (category) next.set('category', category);
    else next.delete('category');
    next.delete('athlete');
    setSearchParams(next);
  };

  const handleMineNameSubmit = (value: string) => {
    setQuery(value);
    setSubmittedQuery(value);
    const next = new URLSearchParams(searchParams);
    next.set('flow', 'mine');
    next.set('step', 'candidates');
    next.set('q', value);
    next.delete('browse');
    next.delete('mineDraft');
    next.delete('athlete');
    next.delete('compare');
    setSearchParams(next);
  };

  const goMineStep = (step: MineStep) => {
    const next = new URLSearchParams(searchParams);
    next.set('flow', 'mine');
    next.set('step', step);
    next.delete('browse');
    if (step === 'done' || step === 'name') next.delete('mineDraft');
    setSearchParams(next);
  };

  const handleMineBack = () => {
    if (mineStep === 'done') {
      openHub();
      return;
    }
    if (mineStep === 'confirm') {
      goMineStep('candidates');
      return;
    }
    if (mineStep === 'candidates') {
      goMineStep('name');
      return;
    }
    openHub();
  };

  const toggleMineDraft = (athlete: AthleteSearchCard) => {
    const selected = new Set(mineDraftKeys);
    if (selected.has(athlete.athleteKey)) {
      selected.delete(athlete.athleteKey);
    } else if (selected.size < mineAvailableSlots) {
      selected.add(athlete.athleteKey);
    }
    const nextKeys = Array.from(selected);
    const next = new URLSearchParams(searchParams);
    next.set('flow', 'mine');
    next.set('step', mineStep === 'confirm' ? 'confirm' : 'candidates');
    if (nextKeys.length > 0) {
      next.set('mineDraft', serializeKeyList(nextKeys));
    } else {
      next.delete('mineDraft');
    }
    setSearchParams(next, { replace: true });
  };

  const confirmMineDraft = (selectedAthletes: readonly AthleteSearchCard[]) => {
    if (selectedAthletes.length === 0) return;
    addManyMyAthletes(selectedAthletes.map((athlete) => ({
      athleteKey: athlete.athleteKey,
      name: athlete.name,
      team: athlete.team,
    })));
    const next = new URLSearchParams(searchParams);
    next.set('flow', 'mine');
    next.set('step', 'done');
    next.delete('mineDraft');
    next.delete('athlete');
    next.delete('compare');
    setSearchParams(next);
  };

  const showSeasonForMine = async () => {
    const firstEntry = myEntries[0];
    const mainRecord = firstEntry
      ? await handleSelectAthlete(firstEntry.athleteKey, { syncUrl: false, deferSelection: true })
      : null;
    if (!filtersRef.current) await filtersRequestRef.current?.catch(() => undefined);
    const activeFilters = filtersRef.current;
    const selection = mainRecord && activeFilters
      ? resolveAthleteSeasonSelection(activeFilters, mainRecord)
      : null;
    if (selection) seasonController.setTransientSelection(selection);
    openBrowseChoice('season', undefined, selection);
    if (firstEntry) setSelectedAthleteKey(firstEntry.athleteKey);
  };

  const isDirectRecordsLink = Boolean(selectedAthleteParam) || compareKeys.length >= 2;
  const shouldShowHub = !isDirectRecordsLink && !activeFlow && !submittedQuery.trim();
  const shouldShowMineFlow = !isDirectRecordsLink && activeFlow === 'mine';
  const shouldShowBrowseGateway = !isDirectRecordsLink && activeFlow === 'browse' && !browseChoice;
  const shouldShowRecordsSurface = !shouldShowHub && !shouldShowMineFlow && !shouldShowBrowseGateway;

  return (
    <div className="space-y-6">
      {shouldShowHub && (
        <RecordsHub
          myEntriesCount={myEntries.length}
          myEntryName={myEntries[0]?.name || ''}
          onOpenMyRecords={showMyRecordsHome}
          onStartMine={openMineStart}
          onOpenTeamPerformance={() => openBrowseChoice('team')}
        >
          <RecordDeviceDataControls
            candidateCount={myEntries.length}
            comparisonCount={compareTray.count}
            draftCount={deviceDraftCount}
            workspaceCount={workspaceStore.workspaces.length}
            onClear={workspaceStore.clearRecordDeviceData}
          />
          <AnonymousInsightCards
            onPickEvent={(key) => openBrowseChoice('season', key)}
          />
        </RecordsHub>
      )}

      {shouldShowMineFlow && (
        <RecordsMineFlow
          step={mineStep}
          query={query}
          searchState={searchState}
          athletes={athletes}
          selectedDraftKeys={mineDraftKeys}
          myEntries={myEntries}
          onQueryChange={setQuery}
          onSubmitName={handleMineNameSubmit}
          onToggleDraft={toggleMineDraft}
          onBack={handleMineBack}
          onQuit={openHub}
          onGoToStep={goMineStep}
          onConfirm={confirmMineDraft}
          onRemoveMyAthlete={removeMyAthlete}
          onSeasonForMine={showSeasonForMine}
        />
      )}

      {shouldShowBrowseGateway && (
        <RecordsBrowseGateway
          onBackToHub={openHub}
          onPick={openBrowseChoice}
        />
      )}

      {shouldShowRecordsSurface && (
        <section className="border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-brand">{isTeamBrowse ? '소속 통계' : '공개 기록 모아보기'}</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
                {isTeamBrowse ? '소속의 기록을 숫자로 살펴봐요.' : '공개 기록, 이름만 알면 찾아요.'}
              </h1>
              {activeFlow === 'browse' && browseChoice && (
                <p className="mt-2 text-sm text-ink-3">
                  {browseChoice === 'season'
                    ? '시즌 기록표를 둘러보고 있어요.'
                    : isTeamBrowse
                      ? '이 소속으로 출전한 기록의 시즌·종목·순위 표기를 모아 봐요.'
                      : '이름이나 소속으로 공개 기록 후보를 찾아보세요.'}
                </p>
              )}
            </div>
            {!isTeamBrowse && <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="grid grid-cols-2 border border-line bg-surface-2 p-1">
                <ModeButton active={mode === 'athlete'} onClick={() => openBrowseChoice('athlete')}>
                  기록 한눈에
                </ModeButton>
                <ModeButton active={mode === 'season'} onClick={() => openBrowseChoice('season')}>
                  시즌 기록표
                </ModeButton>
              </div>
            </div>}
          </div>

          {mode === 'athlete' && (
            <>
              <RecordSearchForm
                query={query}
                loading={searchState === 'loading'}
                teamSearch={isTeamBrowse}
                inputRef={searchInputRef}
                onQueryChange={setQuery}
                onSubmit={handleSearch}
              />
              {isTeamBrowse && (
                <TeamCategoryFilter selected={teamCategory} onSelect={selectTeamCategory} />
              )}
            </>
          )}
        </section>
      )}

      {!isTeamBrowse && compareKeys.length >= 2 && (
        <CompareView
          athleteKeys={compareKeys}
          onSelectAthlete={(key) => {
            closeCompare();
            handleSelectAthlete(key);
          }}
          onClose={closeCompare}
        />
      )}

      {shouldShowRecordsSurface && searchState === 'error' && (
        <NoticeCard
          role="alert"
          title="검색을 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
          action={<Button type="button" variant="outline" onClick={() => navigate(0)}>다시 시도</Button>}
        />
      )}

      {shouldShowRecordsSurface && searchState === 'ready' && submittedQuery.trim().length >= 2
        && (isTeamBrowse ? teamStatistics.length === 0 : athletes.length === 0) && (
        <NoticeCard
          role="status"
          title={isTeamBrowse ? '찾는 소속이 아직 없어요' : '찾는 기록이 아직 없어요'}
          description={isTeamBrowse
            ? '원천 경기 결과의 소속 표기를 기준으로 찾아요. 소속 이름을 줄이거나 다른 표기로 검색해 보세요.'
            : '이름이나 소속을 바꿔보세요. 시즌 기록표에서 종목·부문으로도 둘러볼 수 있어요.'}
          action={!isTeamBrowse ? (
            <Button type="button" variant="outline" onClick={() => openBrowseChoice('season')}>
              시즌 기록표 보기
            </Button>
          ) : undefined}
        />
      )}

      {shouldShowRecordsSurface && !isTeamBrowse && mode === 'athlete' && searchState === 'idle' && athletes.length === 0 && !profile && (
        <div className="space-y-6">
          <StartPanel onSeasonMode={() => openBrowseChoice('season')} />
          <AnonymousInsightCards
            onPickEvent={(key) => openBrowseChoice('season', key)}
          />
        </div>
      )}

      {shouldShowRecordsSurface && !isTeamBrowse && shouldPrioritizeAthletePanel && (
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
            if (!wasMine) showMyRecordsHome();
          }}
          onShowSearchCandidates={showSearchCandidates}
          onRetry={() => navigate(0)}
          onToggleCompare={() => {
            if (!profile) return;
            toggleProfileComparison(profile);
          }}
        />
      )}

      {shouldShowRecordsSurface && !isTeamBrowse && mode === 'athlete' && athletes.length > 0 && !selectedAthleteParam && (
        <RecordCandidatesSurface
          athletes={athletes}
          draftSubjectKeys={workspaceDraftKeys}
          selectionMode={workspaceSelectionMode}
          onDraftChange={(subjectKeys) => {
            workspaceStore.saveWorkspaceDraft(subjectKeys);
          }}
          onEnterSelectionMode={() => setWorkspaceSelectionMode(true)}
          onExitSelectionMode={() => {
            workspaceStore.clearWorkspaceDraft();
            setWorkspaceSelectionMode(false);
          }}
        />
      )}

      {shouldShowRecordsSurface && isTeamBrowse && teamStatistics.length > 0 && (
        <TeamStatisticsResults teams={teamStatistics} query={submittedQuery} />
      )}

      {shouldShowRecordsSurface && !isTeamBrowse && shouldShowAthletePanel && !shouldPrioritizeAthletePanel && (
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
            if (!wasMine) showMyRecordsHome();
          }}
          onRetry={() => navigate(0)}
          onToggleCompare={() => {
            if (!profile) return;
            toggleProfileComparison(profile);
          }}
        />
      )}

      {shouldShowRecordsSurface && shouldShowAthletePanel && profileState === 'ready' && selectedAthleteKey && (
        <EstimatedSameAthleteCard
          athleteKey={selectedAthleteKey}
          onSelectAthlete={handleSelectAthlete}
        />
      )}

      {shouldShowRecordsSurface && mode === 'season' && (
        filters && seasonController.selection ? (
          <SeasonRecordsPanel
            filters={filters}
            selection={seasonController.selection}
            table={seasonController.table}
            state={seasonController.state}
            highlightedRow={highlightedRow}
            onSelectionChange={seasonController.replaceSelection}
            onRetry={() => navigate(0)}
          />
        ) : (
          <NoticeCard
            role={filters ? 'alert' : 'status'}
            title={filters ? '시즌 조건을 준비하지 못했습니다' : '시즌 조건을 불러오는 중입니다'}
            description={filters ? '잠시 후 다시 시도해 주세요.' : '기록이 있는 조건을 확인하고 있습니다.'}
            action={filters ? (
              <Button type="button" variant="outline" onClick={() => navigate(0)}>
                다시 시도
              </Button>
            ) : undefined}
          />
        )
      )}

      {/* 안내·신뢰 문구는 페이지 맨 아래 한 줄로 */}
      <p className="break-keep [text-wrap:pretty] text-[11px] leading-4 text-ink-4">
        자료가 있는 대회 기록만 보여드려요. 연도와 대회별로{' '}
        <span className="whitespace-nowrap">빠진 기록이 있을 수 있어요.</span> {DATA_NOTICE} {TRUST_POINTS.join(' · ')} ·{' '}
        <Link to="/about-data" className="font-medium text-brand-500 underline-offset-2 hover:underline">
          데이터 안내 보기
        </Link>
      </p>

      {/* 비교 트레이 분량만큼 하단 여백 (담은 게 있을 때만) */}
      {compareNotice && <p role="status" className="text-sm font-medium text-warn">{compareNotice}</p>}
      {compareTray.count > 0 && !workspaceSelectionMode && activeFlow !== 'mine' && compareKeys.length === 0 && <div aria-hidden className="h-28 sm:h-24" />}
      <CompareTray hidden={workspaceSelectionMode || activeFlow === 'mine' || compareKeys.length > 0} onCompare={(athleteKeys) => {
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
            같은 이름이 여러 명이면 소속을 확인한 뒤, 원하는 선수만 "이 선수 담기"로 이 기기에서 모아 보세요.
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
  onRetry,
  onToggleCompare,
}: {
  profile: AthleteAnalyticsProfile | null;
  state: LoadState;
  isSharedLinkFallback?: boolean;
  inTray?: boolean;
  isMyAthlete?: boolean;
  onSetMyAthlete?: () => void;
  onShowSearchCandidates?: () => void;
  onRetry?: () => void;
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
          ) : onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              다시 시도
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
    const shareUrl = `${window.location.origin}/records/athletes/${encodeURIComponent(athlete.athleteKey)}`;
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
                  {isMyAthlete ? '✓ 기록 모음에 담은 선수 — 누르면 빼요' : '이 선수 담기'}
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

function normalizeRecordsFlow(value: string | null): RecordsFlow | '' {
  if (value === 'mine' || value === 'browse') return value;
  return '';
}

function normalizeBrowseChoice(value: string | null): BrowseChoice | '' {
  if (value === 'athlete' || value === 'team' || value === 'season') return value;
  return '';
}

function parseKeyList(value: string | null): string[] {
  if (!value) return [];
  return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean))).slice(0, 6);
}

function serializeKeyList(values: readonly string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(',');
}

function deleteRecordsFlowParams(params: URLSearchParams) {
  params.delete('flow');
  params.delete('step');
  params.delete('browse');
  params.delete('mineDraft');
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
