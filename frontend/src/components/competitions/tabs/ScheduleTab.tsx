import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowTopRightOnSquareIcon, CalendarIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { Competition, ResultCompetition } from '../../../api/competitions';
import { getResultCompetitions } from '../../../api/competitions';
import { useCompetitions } from '../../../hooks/useCompetitions';
import { CATEGORY_ORDER, currentYear, DdayBadge, EmptyState, formatDateRange, LoadingSpinner, STATUS_OPTIONS, YEAR_OPTIONS } from './shared';

export function ScheduleTab() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 결과 보유 대회 목록 (뱃지 표시용)
  const [resultCompNames, setResultCompNames] = useState<Set<string>>(new Set());
  const [resultCompetitions, setResultCompetitions] = useState<ResultCompetition[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await getResultCompetitions();
        const names = new Set(res.data.map(c => c.competition));
        setResultCompetitions(res.data);
        setResultCompNames(names);
      } catch { /* ignore */ }
    })();
  }, []);

  const { data, isLoading, isError } = useCompetitions({
    year: selectedYear,
    category: selectedCategory || undefined,
    status: selectedStatus || undefined,
    search: searchQuery || undefined,
  });

  const groupedCompetitions = useMemo(() => {
    if (!data?.competitions) return {};
    const grouped: Record<string, Competition[]> = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat.key] = []; });
    data.competitions.forEach(comp => {
      if (grouped[comp.category]) grouped[comp.category].push(comp);
    });
    return grouped;
  }, [data?.competitions]);

  const totalCount = data?.competitions?.length || 0;
  const clearFilters = () => { setSelectedCategory(''); setSelectedStatus(''); setSearchQuery(''); };
  const hasFilters = selectedCategory || selectedStatus || searchQuery;

  return (
    <>
      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* 연도 */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-neutral-400 hidden sm:block" />
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="input w-24 sm:w-28 text-sm">
              {YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}년</option>)}
            </select>
          </div>
          {/* 종별 */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-neutral-400 hidden sm:block" />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input w-28 sm:w-32 text-sm">
              <option value="">전체 종별</option>
              {CATEGORY_ORDER.map((cat) => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
            </select>
          </div>
          {/* 상태 필터 */}
          <div className="hidden sm:flex rounded-lg overflow-hidden border border-neutral-200">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => setSelectedStatus(opt.key)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  selectedStatus === opt.key ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}>{opt.label}</button>
            ))}
          </div>
          {/* 모바일 상태 필터 */}
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
            className="sm:hidden input w-24 text-sm">
            {STATUS_OPTIONS.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
          </select>
          {/* 검색 */}
          <div className="flex-1 min-w-[160px] sm:min-w-[200px] relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="대회명/장소 검색..." className="input w-full pl-9 text-sm" />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">초기화</button>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
          <span>{selectedYear}년 총 <strong className="text-neutral-600">{totalCount}개</strong> 대회</span>
          {resultCompNames.size > 0 && (
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              결과 보유 대회 {resultCompNames.size}건
            </span>
          )}
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && <EmptyState emoji="⚠️" title="데이터를 불러올 수 없습니다" description="잠시 후 다시 시도해주세요." />}
      {!isLoading && !isError && totalCount === 0 && (
        <EmptyState emoji="🏆" title="등록된 대회가 없습니다"
          description={hasFilters ? '검색 조건에 맞는 대회가 없습니다.' : `${selectedYear}년 대회 정보가 아직 등록되지 않았습니다.`}
          action={hasFilters ? <button onClick={clearFilters} className="btn-primary mt-4">필터 초기화</button> : undefined} />
      )}
      {!isLoading && !isError && totalCount > 0 && (
        <div>
          {selectedCategory ? (
            <ScheduleCategorySection
              categoryLabel={CATEGORY_ORDER.find(c => c.key === selectedCategory)?.label || selectedCategory}
              categoryBg={CATEGORY_ORDER.find(c => c.key === selectedCategory)?.bgClass || 'bg-neutral-600'}
              competitions={groupedCompetitions[selectedCategory] || []}
              resultCompetitions={resultCompetitions}
            />
          ) : (
            CATEGORY_ORDER.map((cat) => (
              <ScheduleCategorySection key={cat.key} categoryLabel={cat.label}
                categoryBg={cat.bgClass} competitions={groupedCompetitions[cat.key] || []}
                resultCompetitions={resultCompetitions} />
            ))
          )}
        </div>
      )}
    </>
  );
}

function findResultCompetition(comp: Competition, resultCompetitions: ResultCompetition[]) {
  return resultCompetitions.find(item => comp.name.includes(item.competition) || item.competition.includes(comp.name)) || null;
}

function ScheduleCategorySection({ categoryLabel, categoryBg, competitions, resultCompetitions }: {
  categoryLabel: string; categoryBg: string; competitions: Competition[]; resultCompetitions: ResultCompetition[];
}) {
  if (competitions.length === 0) return null;
  return (
    <div className="mb-4 bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      <div className={`${categoryBg} text-white px-4 py-2.5 font-bold flex items-center justify-between`}>
        <span>{categoryLabel}</span>
        <span className="text-sm font-normal opacity-80">{competitions.length}개</span>
      </div>

      {/* 데스크탑: 테이블 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="bg-neutral-50 border-b border-neutral-200">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-600">대회명</th>
            <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-600 w-36">기간</th>
            <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-600 w-20">장소</th>
            <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-600 w-24">상태</th>
            <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-600 w-28">상세</th>
          </tr></thead>
          <tbody>
            {competitions.map((comp) => {
              const resultCompetition = findResultCompetition(comp, resultCompetitions);
              const hasResults = Boolean(resultCompetition);
              return (
                <tr key={`${comp.id}-${comp.kaafSeq ?? `${comp.name}-${comp.start_date}`}`} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-neutral-900 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{comp.name}</span>
                      {hasResults && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">
                          📊 결과
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 text-center">{formatDateRange(comp.start_date, comp.end_date)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600 text-center">{comp.location}</td>
                  <td className="px-4 py-3 text-center"><DdayBadge dday={comp.dday} status={comp.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {hasResults && (
                        <Link to={`/competitions?tab=results&comp=${encodeURIComponent(resultCompetition?.filename || '')}`}
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded hover:bg-emerald-600 transition-colors">
                          🏆 결과
                        </Link>
                      )}
                      {comp.kaafUrl && (
                        <a href={comp.kaafUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-neutral-500 text-white text-xs font-medium rounded hover:bg-neutral-600 transition-colors">
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />원본 ↗
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="md:hidden divide-y divide-neutral-100">
        {competitions.map((comp) => {
          const resultCompetition = findResultCompetition(comp, resultCompetitions);
          const hasResults = Boolean(resultCompetition);
          return (
            <div key={`${comp.id}-${comp.kaafSeq ?? `${comp.name}-${comp.start_date}`}`} className="p-3 hover:bg-neutral-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-neutral-900 leading-snug">{comp.shortName || comp.name}</span>
                    {hasResults && (
                      <span className="inline-flex px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">
                        📊
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                    <span>{formatDateRange(comp.start_date, comp.end_date)}</span>
                    <span>·</span>
                    <span>{comp.location}</span>
                  </div>
                </div>
                <DdayBadge dday={comp.dday} status={comp.status} />
              </div>
              <div className="flex gap-1.5 mt-2">
                {hasResults && (
                  <Link to={`/competitions?tab=results&comp=${encodeURIComponent(resultCompetition?.filename || '')}`}
                    className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded border border-emerald-200">
                    🏆 결과보기
                  </Link>
                )}
                {comp.kaafUrl && (
                  <a href={comp.kaafUrl} target="_blank" rel="noopener noreferrer"
                    className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded border border-neutral-200">
                    원본 ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
