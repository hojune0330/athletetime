import React from 'react';
import { 
  formatTime, 
  formatPace, 
  calculatePaceFromTarget,
  calculate400mLap,
  calculate100mTime,
  calculateSpeed,
  TARGETS_5KM,
  TARGETS_10KM,
  TARGETS_HALF,
  TARGETS_FULL,
  type TargetRecord 
} from '../utils/paceCalculations';
import { ChartDownloadButtons } from './ChartDownloadButtons';

interface TargetTableProps {
  title: string;
  distance: number;
  targets: TargetRecord[];
  showColumns: string[];
}

const TargetTable: React.FC<TargetTableProps> = ({ title, distance, targets, showColumns }) => {
  return (
    <div className="mb-4">
      <h4 className="font-bold text-sm mb-2 text-gray-700">{title}</h4>
      <div className="table-container">
        <table className="pace-table w-full">
          <thead>
            <tr>
              <th>목표 기록</th>
              <th>km 페이스</th>
              <th>400m 랩</th>
              {showColumns.includes('100m') && <th>100m</th>}
              {showColumns.includes('5km') && <th>5km 통과</th>}
              {showColumns.includes('10km') && <th>10km 통과</th>}
              {showColumns.includes('half') && <th>하프 통과</th>}
              {showColumns.includes('30km') && <th>30km 통과</th>}
              <th>속도(km/h)</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target, idx) => {
              const pacePerKm = calculatePaceFromTarget(target.time, distance);
              const pace400m = calculate400mLap(pacePerKm);
              const pace100m = calculate100mTime(pacePerKm);
              const speed = calculateSpeed(distance, target.time);
              
              // 중간 통과 시간 계산
              const time5km = (pacePerKm / 1000) * 5000;
              const time10km = (pacePerKm / 1000) * 10000;
              const timeHalf = (pacePerKm / 1000) * 21097.5;
              const time30km = (pacePerKm / 1000) * 30000;
              
              return (
                <tr key={idx} className={target.highlight ? 'highlight-row' : ''}>
                  <td className="font-bold">{formatTime(target.time)}</td>
                  <td>{formatPace(pacePerKm)}</td>
                  <td>{formatTime(pace400m)}</td>
                  {showColumns.includes('100m') && <td>{formatTime(pace100m)}</td>}
                  {showColumns.includes('5km') && <td>{formatTime(time5km)}</td>}
                  {showColumns.includes('10km') && <td>{formatTime(time10km)}</td>}
                  {showColumns.includes('half') && <td>{formatTime(timeHalf)}</td>}
                  {showColumns.includes('30km') && <td>{formatTime(time30km)}</td>}
                  <td>{speed.toFixed(1)}</td>
                  <td className="text-xs">{target.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TargetPaceTable: React.FC<{ id?: string }> = ({ id = 'chart2' }) => {
  return (
    <div className="card chart-container p-4 md:p-6 mb-6" id={id}>
      {/* 다운로드 버튼 */}
      <ChartDownloadButtons chartId={id} filename="목표_기록별_페이스" />
      
      {/* 제목 */}
      <h3 className="text-xl font-bold mb-3 text-center">
        <i className="fas fa-trophy text-accent-500 mr-2"></i>
        목표 기록별 필요 페이스 분석
      </h3>
      
      {/* 제작 정보 */}
      <div className="text-center mb-4 pb-3 border-b-2 border-gray-200">
        <div className="inline-block">
          <div className="text-[22px] font-black tracking-tight text-gray-800">
            <span className="italic">ATHLETE</span> <span>TIME</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">제작: 장호준 코치</div>
        </div>
      </div>
      
      {/* 설명 박스 */}
      <div className="info-box info-box-orange mb-4">
        <h4 className="font-bold text-accent-700 text-sm mb-1">🎯 이 차트는 언제 사용하나요?</h4>
        <p className="text-xs text-accent-700 leading-relaxed">
          <strong>"5km를 20분에 완주하려면..."</strong> 이라고 생각할 때 사용합니다.<br />
          • 대회 목표 기록을 설정하고 필요한 페이스를 확인할 때<br />
          • 인기 목표 시간별로 km 페이스, 400m 랩타임, 속도를 한눈에 확인 가능
        </p>
      </div>
      
      {/* 5km 목표 기록 */}
      <TargetTable 
        title="🏃 5km 목표 기록"
        distance={5000}
        targets={TARGETS_5KM}
        showColumns={['100m']}
      />
      
      {/* 10km 목표 기록 */}
      <TargetTable 
        title="🏃 10km 목표 기록"
        distance={10000}
        targets={TARGETS_10KM}
        showColumns={['5km']}
      />
      
      {/* 하프마라톤 목표 기록 */}
      <TargetTable 
        title="🏃 하프마라톤 목표 기록"
        distance={21097.5}
        targets={TARGETS_HALF}
        showColumns={['5km', '10km']}
      />
      
      {/* 풀마라톤 목표 기록 */}
      <TargetTable 
        title="🏃 풀마라톤 목표 기록"
        distance={42195}
        targets={TARGETS_FULL}
        showColumns={['10km', 'half', '30km']}
      />
      
      {/* 제작 정보 푸터 */}
      <div className="mt-4 pt-3 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-600">
          <span className="font-bold">© ATHLETE TIME</span> · 제작: 장호준 코치 · 
          <span className="text-gray-500">목표 달성을 위한 정확한 페이스 가이드</span>
        </p>
      </div>
    </div>
  );
};

export default TargetPaceTable;
