import React from 'react';
import { usePaceChart } from '../hooks/usePaceCalculator';
import { ChartDownloadButtons } from './ChartDownloadButtons';

interface PaceChartTableProps {
  id?: string;
}

export const PaceChartTable: React.FC<PaceChartTableProps> = ({ id = 'chart1' }) => {
  const { paceChartData } = usePaceChart();
  
  const distanceHeaders = [
    { name: '100m', className: '' },
    { name: '200m', className: '' },
    { name: '400m', className: '' },
    { name: '800m', className: '' },
    { name: '1km', className: '' },
    { name: '3km', className: '' },
    { name: '5km', className: 'bg-yellow-50' },
    { name: '10km', className: 'bg-green-50' },
    { name: '15km', className: '' },
    { name: '하프', className: 'bg-blue-50' },
    { name: '30km', className: '' },
    { name: '풀코스', className: 'bg-purple-50' },
  ];

  return (
    <div className="card chart-container p-4 md:p-6 mb-6" id={id}>
      {/* 다운로드 버튼 */}
      <ChartDownloadButtons 
        chartId={id} 
        filename="페이스_거리별_완주시간" 
      />
      
      {/* 제목 */}
      <h3 className="text-xl font-bold mb-3 text-center">
        <i className="fas fa-tachometer-alt text-blue-500 mr-2"></i>
        킬로미터 페이스 → 거리별 완주 시간
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
      
      <div className="text-right mb-2">
        <span className="text-xs text-gray-500">단위: 분:초</span>
      </div>
      
      {/* 설명 박스 */}
      <div className="info-box info-box-blue mb-4">
        <h4 className="font-bold text-blue-900 text-sm mb-1">📖 이 차트는 언제 사용하나요?</h4>
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>"내가 km당 4분 페이스로 뛰면..."</strong> 이라고 생각할 때 사용합니다.<br />
          • 예: km당 4분 페이스 → 5km는 20분, 10km는 40분, 하프는 1:24:23<br />
          • 훈련 시 목표 페이스를 정하고 각 거리별 통과 시간을 확인할 때 활용하세요.
        </p>
      </div>
      
      {/* 테이블 */}
      <div className="table-container">
        <table className="pace-table w-full">
          <thead>
            <tr>
              <th className="pace-header">km 페이스</th>
              {distanceHeaders.map((header, idx) => (
                <th key={idx} className={header.className}>{header.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paceChartData.map((row, rowIdx) => (
              <tr 
                key={rowIdx}
                className={
                  row.isHighlight ? 'highlight-row' : 
                  row.isSubHighlight ? 'sub-highlight' : ''
                }
              >
                <td className="pace-header font-bold">{row.pace}</td>
                {row.times.map((timeData, colIdx) => (
                  <td 
                    key={colIdx}
                    className={distanceHeaders[colIdx]?.className || ''}
                  >
                    {timeData.time}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 제작 정보 푸터 */}
      <div className="mt-4 pt-3 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-600">
          <span className="font-bold">© ATHLETE TIME</span> · 제작: 장호준 코치 · 
          <span className="text-gray-500">러닝 전문 트레이닝 프로그램</span>
        </p>
      </div>
    </div>
  );
};

export default PaceChartTable;
