import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PaceChartTable,
  TargetPaceTable,
  TrackLaneCalculator,
  SplitCalculator,
  TargetPaceCalculator,
} from './components';
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
  const [activeTab, setActiveTab] = useState<TabType>('chart');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="header no-print sticky top-0 z-50 bg-white shadow-sm">
        <div className="header-content max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                to="/" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="뒤로가기"
              >
                <i className="fas fa-arrow-left text-gray-600"></i>
              </Link>
              <img 
                src={athleteTimeLogo} 
                alt="Athlete Time Logo" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-800">페이스 계산기 & 차트</h1>
                <p className="text-xs text-gray-500">ATHLETE TIME</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                to="/" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="홈으로"
              >
                <i className="fas fa-home text-gray-600"></i>
              </Link>
              <button 
                type="button"
                onClick={handlePrint}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="인쇄"
              >
                <i className="fas fa-print text-gray-600"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 모바일 안내 메시지 */}
        <div className="sm:hidden mb-4 no-print">
          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <i className="fas fa-hand-point-left animate-bounce"></i>
            <span>테이블을 좌우로 스크롤하세요</span>
          </div>
        </div>

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
              <div className="card mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
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
                      <div className="text-xs uppercase tracking-wider font-medium text-blue-500">Developer</div>
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-8 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            <span className="font-bold">© ATHLETE TIME</span> · 제작: 장호준 코치
          </p>
          <p className="text-xs text-gray-400 mt-1">
            러닝 전문 트레이닝 프로그램
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PaceCalculatorPage;
