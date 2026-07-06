import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, TrophyIcon } from '@heroicons/react/24/outline';
import type { SearchSection } from '../../../api/competitions';
import { searchAthleteRecords } from '../../../api/competitions';
import { SearchResultSection } from './SearchResultSection';
import { EmptyState, LoadingSpinner } from './shared';

export function SearchTab({ searchParams, setSearchParams }: { searchParams: URLSearchParams; setSearchParams: (p: URLSearchParams, opts?: { replace?: boolean }) => void }) {
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState(searchParams.get('stype') || 'all');
  const [searchResult, setSearchResult] = useState<{
    query: string; type: string; competitions: string[]; totalMatches: number; totalEvents: number; sections: SearchSection[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // URL에서 초기 검색 실행
  useEffect(() => {
    if (searchParams.get('q')) {
      doSearch(searchParams.get('q')!, searchParams.get('stype') || 'all');
    }
  }, []);

  const doSearch = async (q: string, type: string) => {
    if (!q || q.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    setExpandedSections(new Set());
    try {
      const result = await searchAthleteRecords(q.trim(), type);
      setSearchResult(result);
      if (result.sections.length > 0) {
        setExpandedSections(new Set([result.sections[0].event]));
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', 'search');
      newParams.set('q', q.trim());
      newParams.set('stype', type);
      setSearchParams(newParams, { replace: true });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSearch(query, searchType);
  };

  const toggleSection = (event: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event); else next.add(event);
      return next;
    });
  };

  return (
    <>
      {/* 검색 바 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* 검색 유형 */}
          <div className="flex rounded-lg overflow-hidden border border-neutral-200">
            {[
              { key: 'all',         label: '전체' },
              { key: 'name',        label: '👤 이름' },
              { key: 'affiliation', label: '🏢 소속' },
            ].map(opt => (
              <button key={opt.key} type="button" onClick={() => setSearchType(opt.key)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  searchType === opt.key ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}>{opt.label}</button>
            ))}
          </div>
          {/* 검색 입력 */}
          <div className="flex-1 min-w-[180px] relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="선수명 또는 소속 (2글자 이상)" className="input w-full pl-9 pr-3 text-sm" />
          </div>
          <button type="submit" disabled={loading || query.trim().length < 2}
            className="px-5 py-2.5 bg-primary-500 text-white text-sm font-bold rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors shrink-0">
            {loading ? '검색 중...' : '🔍 검색'}
          </button>
        </div>
        {/* 검색 힌트 */}
        <div className="mt-2 text-xs text-neutral-400">
          선수 이름, 소속, 종목, 대회 이름으로 검색할 수 있어요.
        </div>
      </form>

      {loading && <LoadingSpinner />}

      {/* 검색 결과 없음 */}
      {!loading && searched && searchResult && searchResult.totalMatches === 0 && (
        <EmptyState emoji="🔍" title={`"${searchResult.query}" 검색 결과가 없어요`}
          description="이름이나 소속을 바꿔서 다시 찾아보세요. AthleteTime이 모은 공개 결과 안에서만 검색돼요."
          action={
            <button onClick={() => { setQuery(''); setSearched(false); setSearchResult(null); inputRef.current?.focus(); }}
              className="mt-3 px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600">
              다시 검색하기
            </button>
          } />
      )}

      {/* 검색 결과 */}
      {!loading && searchResult && searchResult.totalMatches > 0 && (
        <>
          {/* 검색 요약 */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <TrophyIcon className="w-5 h-5 text-primary-600 shrink-0" />
              <span className="font-bold text-primary-800">"{searchResult.query}"</span>
              <span className="text-primary-700">
                · {searchResult.totalEvents}개 종목에서 {searchResult.totalMatches}건 매칭
              </span>
            </div>
            <div className="mt-1 text-xs text-primary-600">
              📋 대회: {formatCompetitionScope(searchResult.competitions)}
            </div>
            <p className="mt-2 text-xs leading-5 text-primary-700">
              같은 이름의 다른 선수일 수 있어요. 소속·대회·연도를 함께 확인하세요.
            </p>
          </div>

          {/* 프로필 카드 CTA 배너 */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 mb-4 text-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-bold">🪪 프로필 카드를 만들어보세요!</div>
              <div className="text-xs opacity-80 mt-0.5">검색된 기록으로 나만의 선수 프로필 카드를 제작할 수 있습니다</div>
            </div>
            <Link to={`/profile-card?name=${encodeURIComponent(searchResult.query)}`}
              className="px-4 py-2 bg-white text-primary-700 text-sm font-bold rounded-lg hover:bg-primary-50 transition-colors shrink-0">
              프로필 카드 만들기 →
            </Link>
          </div>

          {/* 종목별 섹션 */}
          <div className="space-y-2">
            {searchResult.sections.map((section) => (
              <SearchResultSection
                key={section.event}
                section={section}
                isExpanded={expandedSections.has(section.event)}
                onToggle={toggleSection}
              />
            ))}
          </div>
        </>
      )}

      {/* 검색 전 초기 상태 */}
      {!searched && (
        <div className="text-center py-12 sm:py-16">
          <MagnifyingGlassIcon className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-neutral-700 mb-2">선수 기록을 검색해보세요</h3>
          <p className="text-neutral-500 text-sm">이름 또는 소속을 입력하면 수록된 대회 결과에서 기록을 찾아드립니다.</p>
        </div>
      )}
    </>
  );
}

function formatCompetitionScope(competitions: string[]): string {
  const visible = competitions.slice(0, 3);
  const hiddenCount = Math.max(0, competitions.length - visible.length);
  if (hiddenCount === 0) return visible.join(', ');
  return `${visible.join(', ')} 외 ${hiddenCount}개 대회`;
}
