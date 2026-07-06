import { useEffect, useMemo, useState } from 'react';
import type { ResultCompetition, ResultEvent, ResultMeta } from '../../../api/competitions';
import { getResultCompetitions, getResultEvents } from '../../../api/competitions';
import { ResultSourceSummary } from '../ResultSourceSummary';
import { ResultEventAccordion } from './ResultEventAccordion';
import { EmptyState, EVENT_TYPE_FILTERS, GENDER_FILTERS, LoadingSpinner } from './shared';

export function ResultsTab({ searchParams, setSearchParams }: { searchParams: URLSearchParams; setSearchParams: (p: URLSearchParams, opts?: { replace?: boolean }) => void }) {
  const [resultComps, setResultComps] = useState<ResultCompetition[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedComp, setSelectedComp] = useState<string>(searchParams.get('comp') || '');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [resultData, setResultData] = useState<{ meta: ResultMeta; events: ResultEvent[]; totalEvents: number; totalAthletes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  // 결과 보유 대회 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await getResultCompetitions();
        setResultComps(res.data);
        setAvailableYears(res.years);
        if (searchParams.get('comp') && res.data.find(c => c.filename === searchParams.get('comp'))) {
          setSelectedComp(searchParams.get('comp')!);
        } else if (res.data.length === 1) {
          setSelectedComp(res.data[0].filename);
        } else if (res.data.length > 1) {
          const latestResultCompetition = res.data[0];
          setSelectedComp(latestResultCompetition.filename);
          setSelectedYear(latestResultCompetition.year || '');
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  // 대회 선택 시 결과 로드
  useEffect(() => {
    if (!selectedComp) { setResultData(null); return; }
    (async () => {
      setLoadingEvents(true);
      setExpandedEvents(new Set());
      try {
        const data = await getResultEvents(selectedComp, eventTypeFilter || undefined);
        setResultData(data);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', 'results');
        newParams.set('comp', selectedComp);
        setSearchParams(newParams, { replace: true });
      } catch (e) { console.error(e); }
      finally { setLoadingEvents(false); }
    })();
  }, [selectedComp, eventTypeFilter]);

  // 성별 필터 (프론트엔드 필터링)
  const displayEvents = useMemo(() => {
    if (!resultData?.events) return [];
    if (!genderFilter) return resultData.events;
    return resultData.events.filter(ev => ev.event.includes(genderFilter));
  }, [resultData?.events, genderFilter]);

  const filteredComps = selectedYear ? resultComps.filter(c => c.year === selectedYear) : resultComps;

  const toggleEvent = (idx: number) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const expandAll = () => setExpandedEvents(new Set(displayEvents.map((_, i) => i)));
  const collapseAll = () => setExpandedEvents(new Set());

  if (loading) return <LoadingSpinner />;

  if (resultComps.length === 0) {
    return <EmptyState emoji="📊" title="아직 수록된 경기 결과가 없어요"
      description="AthleteTime은 공개된 결과를 모아 보여줘요. 이 대회 결과는 아직 모으지 못했어요." />;
  }

  return (
    <>
      {/* 대회 선택 바 */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* 연도 필터 */}
          {availableYears.length > 0 && (
            <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedComp(''); setResultData(null); }}
              className="input w-28 text-sm">
              <option value="">전체 연도</option>
              {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
          )}
          {/* 대회 선택 드롭다운 */}
          <div className="flex-1 min-w-[200px]">
            <select value={selectedComp} onChange={(e) => setSelectedComp(e.target.value)} className="input w-full text-sm">
              <option value="">📌 대회를 선택하세요</option>
              {filteredComps.map(c => (
                <option key={c.filename} value={c.filename}>
                  {c.source === 'pacerise' ? '[실업] ' : ''}{c.competition} ({c.venue}, {c.period})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
          <span className="rounded-full border border-neutral-200 px-2.5 py-1">최신 회차 먼저</span>
          <span className="rounded-full border border-neutral-200 px-2.5 py-1">대회는 직접 바꿀 수 있어요</span>
        </div>

        {/* 종목 / 성별 필터 (결과 로드 후 표시) */}
        {resultData && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* 종목 유형 */}
            <div className="flex rounded-lg overflow-hidden border border-neutral-200">
              {EVENT_TYPE_FILTERS.map(f => (
                <button key={f.key} onClick={() => setEventTypeFilter(f.key)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    eventTypeFilter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}>{f.label}</button>
              ))}
            </div>
            {/* 성별 */}
            <div className="flex rounded-lg overflow-hidden border border-neutral-200">
              {GENDER_FILTERS.map(f => (
                <button key={f.key} onClick={() => setGenderFilter(f.key)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    genderFilter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}>{f.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* 대회 정보 요약 */}
        {resultData && (
          <ResultSourceSummary
            meta={resultData.meta}
            eventCount={displayEvents.length}
            athleteCount={displayEvents.reduce((sum, event) => sum + event.totalAthletes, 0)}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
          />
        )}
      </div>

      {/* 대회 미선택 */}
      {!selectedComp && (
        <EmptyState emoji="👆" title="대회를 선택하세요"
          description={`위 드롭다운에서 결과를 확인할 대회를 선택해주세요. 현재 ${resultComps.length}개 대회의 결과가 등록되어 있습니다.`} />
      )}

      {loadingEvents && <LoadingSpinner />}

      {/* 종목별 아코디언 */}
      {resultData && !loadingEvents && displayEvents.length === 0 && (
        <EmptyState emoji="🔍" title="조건에 맞는 종목이 없습니다"
          description="종목 유형 또는 성별 필터를 변경해보세요."
          action={<button onClick={() => { setEventTypeFilter(''); setGenderFilter(''); }} className="mt-3 px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600">필터 초기화</button>} />
      )}

      {resultData && !loadingEvents && displayEvents.length > 0 && (
        <div className="space-y-2">
          {displayEvents.map((event, index) => (
            <ResultEventAccordion
              key={index}
              resultEvent={event}
              index={index}
              isExpanded={expandedEvents.has(index)}
              resultPeriod={resultData.meta.period}
              onToggle={toggleEvent}
            />
          ))}
        </div>
      )}
    </>
  );
}
