import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTrackLaneCalculator } from '../hooks/usePaceCalculator';
import { LANE_COLORS, formatPace } from '../utils/paceCalculations';

export const TrackLaneCalculator: React.FC<{ id?: string }> = ({ id = 'lane-calculator' }) => {
  const {
    selectedLane,
    setSelectedLane,
    targetTime,
    setTargetTime,
    lanesData,
    selectedLaneData,
  } = useTrackLaneCalculator();
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 애니메이션 시작
  const startAnimation = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(0);
    startTimeRef.current = performance.now();
    
    const animationDuration = Math.min(targetTime * 1000, 10000);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const newProgress = Math.min(elapsed / animationDuration, 1);
      setProgress(newProgress);
      
      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRunning(false);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isRunning, targetTime]);

  // 애니메이션 일시정지
  const pauseAnimation = useCallback(() => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // 애니메이션 리셋
  const resetAnimation = useCallback(() => {
    pauseAnimation();
    setProgress(0);
  }, [pauseAnimation]);

  // 컴포넌트 언마운트 시 애니메이션 정리
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 트랙 SVG 경로 계산
  const getTrackPath = (_lane: number, radius: number) => {
    const scaleFactor = 2.5;
    const straightLength = 84.39 * scaleFactor;
    const centerX = 450;
    const centerY = 280;
    const scaledRadius = radius * scaleFactor;
    
    const leftCenterX = centerX - straightLength / 2;
    const rightCenterX = centerX + straightLength / 2;
    
    return `
      M ${leftCenterX} ${centerY - scaledRadius}
      L ${rightCenterX} ${centerY - scaledRadius}
      A ${scaledRadius} ${scaledRadius} 0 0 1 ${rightCenterX} ${centerY + scaledRadius}
      L ${leftCenterX} ${centerY + scaledRadius}
      A ${scaledRadius} ${scaledRadius} 0 0 1 ${leftCenterX} ${centerY - scaledRadius}
    `;
  };

  // 선수 위치 계산
  const getRunnerPosition = () => {
    const scaleFactor = 2.5;
    const straightLength = 84.39 * scaleFactor;
    const centerX = 450;
    const centerY = 280;
    const radius = (selectedLaneData?.radius || 36.80) * scaleFactor;
    
    const leftCenterX = centerX - straightLength / 2;
    const rightCenterX = centerX + straightLength / 2;
    
    const totalPathLength = straightLength * 2 + Math.PI * radius * 2;
    const currentPosition = progress * totalPathLength;
    
    const segment1 = straightLength;
    const segment2 = Math.PI * radius;
    const segment3 = straightLength;
    
    let x: number, y: number;
    
    if (currentPosition < segment1) {
      const t = currentPosition / segment1;
      x = rightCenterX - t * straightLength;
      y = centerY + radius;
    } else if (currentPosition < segment1 + segment2) {
      const t = (currentPosition - segment1) / segment2;
      const angle = Math.PI / 2 + t * Math.PI;
      x = leftCenterX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius * 0.9;
    } else if (currentPosition < segment1 + segment2 + segment3) {
      const t = (currentPosition - segment1 - segment2) / segment3;
      x = leftCenterX + t * straightLength;
      y = centerY - radius;
    } else {
      const t = (currentPosition - segment1 - segment2 - segment3) / (Math.PI * radius);
      const angle = -Math.PI / 2 + t * Math.PI;
      x = rightCenterX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius * 0.9;
    }
    
    return { x, y };
  };

  const runnerPos = getRunnerPosition();

  return (
    <div className="space-y-6" id={id}>
      {/* 헤더 */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span className="text-3xl">🏟️</span>
          400m 트랙 레인별 구간 시간 계산기
        </h2>
        
        {/* 입력 컨트롤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 목표 시간 (초)
            </label>
            <input
              type="number"
              value={targetTime}
              onChange={(e) => setTargetTime(Number(e.target.value))}
              min="30"
              max="120"
              step="0.1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏃 레인 선택
            </label>
            <select
              value={selectedLane}
              onChange={(e) => setSelectedLane(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(lane => (
                <option key={lane} value={lane}>
                  {lane}번 레인 ({lanesData[lane-1]?.distance.toFixed(2)}m)
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* 3D 트랙 시각화 */}
        <div className="track-visualization-container mb-6">
          <div className="track-header">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span>🏃</span>
              트랙 레인 시각화
            </h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-blue-500"></span>
                직선 구간
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-red-500"></span>
                곡선 구간
              </span>
            </div>
          </div>
          
          <div className="track-3d-wrapper p-6">
            <svg viewBox="0 0 900 560" className="w-full h-auto min-h-[400px]">
              {/* 배경 */}
              <defs>
                <linearGradient id="trackGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* 트랙 레인 */}
              {lanesData.map((lane) => (
                <path
                  key={lane.lane}
                  d={getTrackPath(lane.lane, lane.radius)}
                  stroke={LANE_COLORS[lane.lane - 1]}
                  strokeWidth={lane.isSelected ? 4 : 2}
                  fill="none"
                  opacity={lane.isSelected ? 1 : 0.4}
                  filter={lane.isSelected ? "url(#glow)" : undefined}
                />
              ))}
              
              {/* 선수 마커 */}
              <g transform={`translate(${runnerPos.x}, ${runnerPos.y})`}>
                <circle r="12" fill={LANE_COLORS[selectedLane - 1]} opacity="0.6" />
                <circle r="8" fill={LANE_COLORS[selectedLane - 1]} />
                <text y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                  🏃
                </text>
              </g>
              
              {/* 구간 라벨 */}
              {selectedLaneData && (
                <>
                  <text x="450" y="180" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">
                    직선① {selectedLaneData.sectionTimes.straight1.toFixed(2)}초
                  </text>
                  <text x="450" y="380" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">
                    직선② {selectedLaneData.sectionTimes.straight2.toFixed(2)}초
                  </text>
                  <text x="200" y="280" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                    곡선① {selectedLaneData.sectionTimes.curve1.toFixed(2)}초
                  </text>
                  <text x="700" y="280" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                    곡선② {selectedLaneData.sectionTimes.curve2.toFixed(2)}초
                  </text>
                </>
              )}
            </svg>
          </div>
          
          {/* 애니메이션 컨트롤 */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg mx-4 mb-4">
            <button
              onClick={startAnimation}
              disabled={isRunning}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-green-600 transition-colors"
            >
              <i className="fas fa-play mr-2"></i>
              재생
            </button>
            <button
              onClick={pauseAnimation}
              disabled={!isRunning}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-yellow-600 transition-colors"
            >
              <i className="fas fa-pause mr-2"></i>
              일시정지
            </button>
            <button
              onClick={resetAnimation}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              <i className="fas fa-redo mr-2"></i>
              리셋
            </button>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-600">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>
        
        {/* 레인 비교 테이블 */}
        <div className="table-container">
          <table className="pace-table w-full">
            <thead>
              <tr>
                <th>레인</th>
                <th>총 거리</th>
                <th>스태거</th>
                <th>완주 시간</th>
                <th>시간 차이</th>
                <th>직선①</th>
                <th>곡선①</th>
                <th>직선②</th>
                <th>곡선②</th>
              </tr>
            </thead>
            <tbody>
              {lanesData.map((lane) => {
                const timeDiff = lane.lane === 1 ? 0 : lane.adjustedTime - lanesData[0].adjustedTime;
                
                return (
                  <tr 
                    key={lane.lane}
                    className={lane.isSelected ? 'bg-amber-100' : ''}
                  >
                    <td style={{ borderLeft: `4px solid ${LANE_COLORS[lane.lane - 1]}` }}>
                      <span className="font-bold" style={{ color: LANE_COLORS[lane.lane - 1] }}>
                        {lane.lane}
                      </span>
                      {lane.isSelected && <span className="text-amber-500 ml-1">★</span>}
                    </td>
                    <td className="font-bold">{lane.distance.toFixed(2)}m</td>
                    <td className={lane.stagger > 0 ? 'text-accent-600' : ''}>
                      {lane.stagger > 0 ? `+${lane.stagger.toFixed(2)}` : '0.00'}m
                    </td>
                    <td className={`font-bold ${lane.isSelected ? 'text-amber-700 text-lg' : ''}`}>
                      {lane.adjustedTime.toFixed(2)}초
                    </td>
                    <td className={`text-xs ${timeDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {timeDiff === 0 ? '-' : `+${timeDiff.toFixed(2)}`}
                    </td>
                    <td className="text-blue-600 font-mono">{lane.sectionTimes.straight1.toFixed(2)}</td>
                    <td className="text-red-600 font-mono">{lane.sectionTimes.curve1.toFixed(2)}</td>
                    <td className="text-blue-600 font-mono">{lane.sectionTimes.straight2.toFixed(2)}</td>
                    <td className="text-red-600 font-mono">{lane.sectionTimes.curve2.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* 선택된 레인 상세 정보 */}
        {selectedLaneData && (
          <div 
            className="mt-6 p-5 rounded-xl"
            style={{ 
              background: `linear-gradient(135deg, ${LANE_COLORS[selectedLane - 1]}15, ${LANE_COLORS[selectedLane - 1]}25)`,
              border: `2px solid ${LANE_COLORS[selectedLane - 1]}50`
            }}
          >
            <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span style={{ color: LANE_COLORS[selectedLane - 1] }}>●</span>
              {selectedLane}번 레인 상세 분석
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">🚀 평균 속도</div>
                <div className="text-2xl font-bold" style={{ color: LANE_COLORS[selectedLane - 1] }}>
                  {selectedLaneData.speedKMH.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">km/h</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">⏱️ km 페이스</div>
                <div className="text-2xl font-bold" style={{ color: LANE_COLORS[selectedLane - 1] }}>
                  {formatPace(selectedLaneData.pacePerKm)}
                </div>
                <div className="text-xs text-gray-400">/km</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">🏃 400m 환산</div>
                <div className="text-2xl font-bold" style={{ color: LANE_COLORS[selectedLane - 1] }}>
                  {(400 / selectedLaneData.speedMPS).toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">초 (1레인 기준)</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">📏 100m 평균</div>
                <div className="text-2xl font-bold" style={{ color: LANE_COLORS[selectedLane - 1] }}>
                  {(targetTime / (selectedLaneData.distance / 100)).toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">초</div>
              </div>
            </div>
          </div>
        )}
        
        {/* 트랙 정보 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-2xl mb-2">📐</div>
            <h4 className="font-bold text-blue-900 mb-2">World Athletics 공식 규격</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 직선 구간: <strong>84.39m</strong></li>
              <li>• 레인 폭: <strong>1.22m</strong></li>
              <li>• 측정선: 안쪽에서 30cm(1레인) / 20cm(2~8레인)</li>
            </ul>
          </div>
          <div className="p-4 bg-accent-50 rounded-xl border border-accent-200">
            <div className="text-2xl mb-2">🎯</div>
            <h4 className="font-bold text-accent-700 mb-2">스태거(Stagger)란?</h4>
            <p className="text-sm text-accent-700">
              바깥 레인이 안쪽보다 더 길기 때문에 공정한 경주를 위해 출발선을 앞으로 배치하는 것입니다.
              8레인은 1레인보다 <strong>53.03m</strong> 앞에서 출발합니다.
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="text-2xl mb-2">💡</div>
            <h4 className="font-bold text-green-900 mb-2">레인 선택 팁</h4>
            <p className="text-sm text-green-800">
              <strong>4~6레인</strong>이 경기에서 유리합니다. 상대 선수를 볼 수 있고, 
              곡선에서 원심력 부담이 적당합니다. 1레인은 가장 짧지만 곡선이 급합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackLaneCalculator;
