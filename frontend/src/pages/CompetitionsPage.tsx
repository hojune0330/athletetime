/**
 * CompetitionsPage - 통합 육상 기록 허브
 * /competitions
 *
 * URL 연동: ?tab=schedule|results|search&comp=...&q=...
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { DataNoticeBar, DataNoticeBlock } from '../components/common/DataNotice';
import { ResultsTab } from '../components/competitions/tabs/ResultsTab';
import { ScheduleTab } from '../components/competitions/tabs/ScheduleTab';
import { SearchTab } from '../components/competitions/tabs/SearchTab';

type TabKey = 'schedule' | 'results' | 'search';

const TABS: readonly { readonly key: TabKey; readonly label: string; readonly emoji: string; readonly desc: string }[] = [
  { key: 'schedule', label: '대회 일정', emoji: '📅', desc: '육상 대회 일정 목록' },
  { key: 'results', label: '경기 결과', emoji: '🏆', desc: '대회별 종목 결과 조회' },
  { key: 'search', label: '선수 검색', emoji: '🔍', desc: '이름/소속으로 기록 검색' },
];

export default function CompetitionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeTab = TABS.find((tab) => tab.key === tabParam)?.key || 'schedule';

  const setActiveTab = useCallback((tab: TabKey) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'schedule') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    if (tab !== 'results') newParams.delete('comp');
    if (tab !== 'search') {
      newParams.delete('q');
      newParams.delete('stype');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div>
      <PageHeader
        title="대회 · 기록"
        icon="🏟️"
        description="육상 대회 일정, 경기 결과 조회, 선수 기록 검색을 한 곳에서"
      />

      <div className="bg-white rounded-xl border border-neutral-200 mb-6 shadow-sm overflow-hidden">
        <div className="flex border-b border-neutral-100">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-3 sm:py-3.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-primary-700 bg-primary-50 border-b-2 border-primary-500 -mb-px'
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className="text-base">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="hidden sm:block px-4 py-2 bg-neutral-50 text-xs text-neutral-400 text-center">
          {TABS.find((tab) => tab.key === activeTab)?.desc}
        </div>
      </div>

      <DataNoticeBar className="mb-6" />

      {activeTab === 'schedule' && <ScheduleTab />}
      {activeTab === 'results' && <ResultsTab searchParams={searchParams} setSearchParams={setSearchParams} />}
      {activeTab === 'search' && <SearchTab searchParams={searchParams} setSearchParams={setSearchParams} />}

      <div className="mt-8 border-t border-hair pt-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded border border-hair px-1.5 py-0.5 text-body-sm font-medium text-ink-3">
            공개 기록
          </span>
          <span className="text-body-sm font-medium text-ink-2">데이터 출처 및 정정 안내</span>
        </div>
        <DataNoticeBlock />
      </div>
    </div>
  );
}
