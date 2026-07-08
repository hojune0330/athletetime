import React, { useState } from 'react';
import {
  PaceChartTable,
  TargetPaceTable,
  TrackLaneCalculator,
  SplitCalculator,
  TargetPaceCalculator,
  TrackEventSplits,
} from './components';
import PageHeader from '../../components/common/PageHeader';
import './styles/pace-calculator.css';

type TabType = 'target' | 'track' | 'chart' | 'lane' | 'split';

type TabConfig = {
  readonly id: TabType;
  readonly label: string;
  readonly eyebrow: string;
};

const TABS = [
  { id: 'target', label: '목표 페이스', eyebrow: 'MAIN' },
  { id: 'track', label: '트랙 종목', eyebrow: '800·1500·SC' },
  { id: 'chart', label: '페이스 차트', eyebrow: 'TABLE' },
  { id: 'lane', label: '트랙 레인', eyebrow: 'TRACK' },
  { id: 'split', label: '스플릿 계산', eyebrow: 'SPLIT' },
] as const satisfies readonly TabConfig[];

const QUICK_ACTIONS = [
  {
    tab: 'target',
    step: '01',
    title: '목표 기록 넣기',
    text: '목표 기록으로 km·400m·100m 페이스를 바로 확인해요',
  },
  {
    tab: 'lane',
    step: '02',
    title: '트랙 랩 계산',
    text: '레인별 거리와 랩타임을 확인해요',
  },
  {
    tab: 'split',
    step: '03',
    title: '스플릿 나누기',
    text: '구간별 목표 시간을 쪼개요',
  },
] as const satisfies readonly {
  readonly tab: TabType;
  readonly step: string;
  readonly title: string;
  readonly text: string;
}[];

const PaceCalculatorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('target');

  return (
    <div>
      <div>
        <div className="no-print">
          <PageHeader
            title="페이스 계산기"
            description="목표 기록으로 km·400m·100m 페이스를 바로 확인해요"
          />
        </div>

        <div className="mb-4 border border-line bg-surface px-4 py-3 text-body-sm text-ink-2 sm:hidden no-print">
          표가 넓으면 좌우로 밀어서 확인하세요.
        </div>

        <section className="mb-6 border border-line bg-surface p-4 md:p-6 no-print">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
                QUICK START
              </p>
              <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">오늘 필요한 계산부터</h2>
            </div>
            <p className="max-w-xl text-body-sm leading-relaxed text-ink-3">
              처음 들어온 선수도 목표 기록만 넣으면 바로 페이스를 확인할 수 있게, 가장 많이 쓰는 계산을 앞에 뒀어요.
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.tab}
                type="button"
                onClick={() => setActiveTab(action.tab)}
                className={`border p-4 text-left transition-colors ${
                  activeTab === action.tab
                    ? 'border-ink bg-surface-2'
                    : 'border-line bg-surface hover:border-line-2'
                }`}
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
                  STEP {action.step}
                </span>
                <span className="mt-2 block text-body-sm font-semibold text-ink">{action.title}</span>
                <span className="mt-1 block text-caption leading-snug text-ink-3">{action.text}</span>
              </button>
            ))}
          </div>
        </section>

        <nav className="mb-6 no-print" role="tablist" aria-label="페이스 계산기 메뉴">
          <div className="grid border border-line bg-surface sm:grid-cols-5">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-left transition-colors ${
                  index > 0 ? 'border-t border-hair sm:border-l sm:border-t-0' : ''
                } ${activeTab === tab.id ? 'bg-ink text-bg' : 'bg-surface text-ink hover:bg-surface-2'}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-content`}
              >
                <span className={`block font-mono text-[9.5px] font-semibold uppercase tracking-widest-2 ${
                  activeTab === tab.id ? 'text-bg/65' : 'text-ink-4'
                }`}>
                  {tab.eyebrow}
                </span>
                <span className="mt-1 block text-body-sm font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="tab-content-wrapper">
          {activeTab === 'chart' && (
            <div id="chart-content" role="tabpanel" aria-labelledby="tab-chart">
              <div className="mb-6 border border-line bg-surface p-5 md:p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
                      PACE TABLE
                    </p>
                    <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">러닝 페이스 차트</h2>
                  </div>
                  <p className="max-w-xl text-body-sm leading-relaxed text-ink-3">
                    km 페이스를 기준으로 거리별 예상 시간을 한 번에 봅니다.
                  </p>
                </div>
              </div>
              <PaceChartTable id="chart1" />
              <TargetPaceTable id="chart2" />
            </div>
          )}

          {activeTab === 'lane' && (
            <div id="lane-content" role="tabpanel" aria-labelledby="tab-lane">
              <TrackLaneCalculator />
            </div>
          )}

          {activeTab === 'target' && (
            <div id="target-content" role="tabpanel" aria-labelledby="tab-target">
              <TargetPaceCalculator />
            </div>
          )}

          {activeTab === 'track' && (
            <div id="track-content" role="tabpanel" aria-labelledby="tab-track">
              <TrackEventSplits />
            </div>
          )}

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
