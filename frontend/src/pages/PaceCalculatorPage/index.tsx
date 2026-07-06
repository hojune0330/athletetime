import React, { useState } from 'react';
import {
  PaceChartTable,
  TargetPaceTable,
  TrackLaneCalculator,
  SplitCalculator,
  TargetPaceCalculator,
} from './components';
import PageHeader from '../../components/common/PageHeader';
import './styles/pace-calculator.css';
import athleteTimeLogo from '../../assets/athlete-time-logo.jpg';

type TabType = 'chart' | 'lane' | 'target' | 'split';

interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'chart', label: '페이스 차트', icon: 'fa-table' },
  { id: 'lane', label: '트랙 레인', icon: 'fa-road' },
  { id: 'target', label: '목표 페이스', icon: 'fa-bullseye' },
  { id: 'split', label: '스플릿 계산', icon: 'fa-chart-line' },
];

const PaceCalculatorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('target');

  return (
    <div>
      <div>
        {/* Header */}
        <div className="no-print">
          <PageHeader
            title="페이스 계산기 & 차트"
            icon="⏱️"
            description="러닝 페이스 분석 및 훈련 계획 도구"
          />
        </div>
        {/* 모바일 안내 메시지 */}
        <div className="sm:hidden mb-4 no-print">
          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <i className="fas fa-hand-point-left animate-bounce"></i>
            <span>테이블을 좌우로 스크롤하세요</span>
          </div>
        </div>

        <section className="card mb-6 no-print">
          <div className="card-body p-4 md:p-6">
            <p className="text-sm font-semibold text-blue-600">
              빠른 시작
            </p>
            <h2 className="mt-2 text-2xl font-bold text-neutral-900">오늘 필요한 계산부터</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              표 전체를 먼저 읽지 않아도 됩니다. 목표 기록, 랩타임, 스플릿 중 지금 필요한 계산을 바로 고르세요.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setActiveTab('target')}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
              >
                목표 기록 넣기
                <span className="mt-1 block text-xs font-normal text-blue-600">완주 기록으로 km·400m 페이스 보기</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lane')}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                트랙 랩 계산
                <span className="mt-1 block text-xs font-normal text-neutral-500">레인별 거리와 랩타임 확인</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                스플릿 나누기
                <span className="mt-1 block text-xs font-normal text-neutral-500">구간별 목표 시간을 쪼개기</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className="tab-container mb-6 no-print" role="tablist" aria-label="페이스 계산기 메뉴">
          <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-content`}
              >
                <i className={`fas ${tab.icon} mr-2`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Contents */}
        <div className="tab-content-wrapper">
          {/* 페이스 차트 탭 */}
          {activeTab === 'chart' && (
            <div id="chart-content" role="tabpanel" aria-labelledby="tab-chart">
              {/* 개발자 정보 카드 */}
              <div className="card mb-6 bg-gradient-to-r from-primary-50 to-primary-100">
                <div className="card-body p-4 md:p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={athleteTimeLogo} 
                        alt="Athlete Time" 
                        className="h-14 md:h-16 w-auto opacity-90"
                      />
                      <div>
                        <h2 className="text-lg md:text-xl font-bold text-blue-800">러닝 페이스 차트</h2>
                        <p className="text-sm text-blue-600">과학적 훈련을 위한 정밀 분석 도구</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-blue-500">만든 사람</div>
                      <p className="text-lg font-bold text-blue-800">장호준 코치</p>
                      <p className="text-sm font-semibold text-blue-600">ATHLETE TIME</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 페이스 차트 테이블 */}
              <PaceChartTable id="chart1" />

              {/* 목표 기록별 페이스 */}
              <TargetPaceTable id="chart2" />
            </div>
          )}

          {/* 트랙 레인 탭 */}
          {activeTab === 'lane' && (
            <div id="lane-content" role="tabpanel" aria-labelledby="tab-lane">
              <TrackLaneCalculator />
            </div>
          )}

          {/* 목표 페이스 탭 */}
          {activeTab === 'target' && (
            <div id="target-content" role="tabpanel" aria-labelledby="tab-target">
              <TargetPaceCalculator />
            </div>
          )}

          {/* 스플릿 계산 탭 */}
          {activeTab === 'split' && (
            <div id="split-content" role="tabpanel" aria-labelledby="tab-split">
              <SplitCalculator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaceCalculatorPage;
