import React, { useState } from 'react';
import { useSplitCalculator, useFavorites } from '../hooks/usePaceCalculator';
import { formatTime, formatPace, type PaceStrategy } from '../utils/paceCalculations';

// 빠른 거리 선택 옵션
const QUICK_DISTANCES = [
  { label: '5km', value: 5 },
  { label: '10km', value: 10 },
  { label: '하프', value: 21.0975 },
  { label: '풀코스', value: 42.195 },
];

// 빠른 시간 프리셋 (거리별)
const TIME_PRESETS: Record<number, { label: string; hours: number; minutes: number }[]> = {
  5: [
    { label: '20분', hours: 0, minutes: 20 },
    { label: '25분', hours: 0, minutes: 25 },
    { label: '30분', hours: 0, minutes: 30 },
  ],
  10: [
    { label: '40분', hours: 0, minutes: 40 },
    { label: '50분', hours: 0, minutes: 50 },
    { label: '60분', hours: 1, minutes: 0 },
  ],
  21.0975: [
    { label: '1:30', hours: 1, minutes: 30 },
    { label: '1:45', hours: 1, minutes: 45 },
    { label: '2:00', hours: 2, minutes: 0 },
  ],
  42.195: [
    { label: '3:00', hours: 3, minutes: 0 },
    { label: '3:30', hours: 3, minutes: 30 },
    { label: '4:00', hours: 4, minutes: 0 },
  ],
};

// 전략 정보
const STRATEGY_INFO: Record<PaceStrategy, { icon: string; name: string; desc: string; badge: string; badgeClass: string; detail: string }> = {
  even: {
    icon: '⚖️',
    name: '균등 페이스',
    desc: '모든 구간 동일 속도',
    badge: '추천',
    badgeClass: 'bg-green-100 text-green-700',
    detail: '모든 구간을 동일한 속도로 달립니다. 에너지 효율이 가장 좋고, 초보자부터 엘리트까지 권장되는 전략입니다.',
  },
  negative: {
    icon: '🚀',
    name: '네거티브',
    desc: '후반부 가속 (±1%)',
    badge: '프로 전략',
    badgeClass: 'bg-blue-100 text-blue-700',
    detail: '전반부를 조금 느리게 시작하고 후반부에 가속합니다. 에너지를 아끼고 마지막에 스퍼트를 넣는 전략입니다.',
  },
  positive: {
    icon: '⚡',
    name: '포지티브',
    desc: '전반부 가속 (±1%)',
    badge: '공격적',
    badgeClass: 'bg-orange-100 text-orange-700',
    detail: '전반부를 빠르게 시작하고 후반부에 페이스를 유지합니다. 리스크가 있지만 기록 단축에 도전할 때 사용합니다.',
  },
};

export const SplitCalculator: React.FC = () => {
  const {
    distance,
    setDistance,
    hours,
    setHours,
    minutes,
    setMinutes,
    seconds,
    setSeconds,
    strategy,
    setStrategy,
    averagePaceFormatted,
    speedKmh,
    splits,
    calculate,
    reset,
  } = useSplitCalculator();

  const { favorites, saveFavorite, deleteFavorite } = useFavorites();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');

  // 빠른 거리 선택
  const handleQuickDistance = (dist: number) => {
    setDistance(dist);
  };

  // 빠른 시간 선택
  const handleQuickTime = (h: number, m: number) => {
    setHours(h);
    setMinutes(m);
    setSeconds(0);
  };

  // 즐겨찾기 저장
  const handleSaveFavorite = () => {
    if (!favoriteName.trim()) return;
    const targetTime = hours * 3600 + minutes * 60 + seconds;
    saveFavorite(favoriteName, distance, targetTime, strategy);
    setShowSaveModal(false);
    setFavoriteName('');
  };

  // 즐겨찾기 적용
  const handleApplyFavorite = (fav: { distance: number; targetTime: number; strategy: PaceStrategy }) => {
    setDistance(fav.distance);
    setHours(Math.floor(fav.targetTime / 3600));
    setMinutes(Math.floor((fav.targetTime % 3600) / 60));
    setSeconds(fav.targetTime % 60);
    setStrategy(fav.strategy);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="text-3xl">📊</span>
          스플릿 계산기
        </h2>
        <p className="text-gray-600 mb-6">레이스 구간별 목표 시간과 페이스를 계산합니다</p>

        {/* 거리 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📏 목표 거리
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_DISTANCES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => handleQuickDistance(d.value)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  Math.abs(distance - d.value) < 0.01
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              min="0.1"
              step="0.1"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-600">km</span>
          </div>
        </div>

        {/* 목표 시간 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⏱️ 목표 완주 시간
          </label>
          
          {/* 빠른 시간 선택 */}
          {TIME_PRESETS[distance] && (
            <div className="flex flex-wrap gap-2 mb-3">
              {TIME_PRESETS[distance].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleQuickTime(preset.hours, preset.minutes)}
                  className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                min="0"
                max="12"
                className="w-20 px-3 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">시간</span>
            </div>
            <span className="text-2xl font-bold text-gray-400">:</span>
            <div className="flex flex-col items-center">
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                min="0"
                max="59"
                className="w-20 px-3 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">분</span>
            </div>
            <span className="text-2xl font-bold text-gray-400">:</span>
            <div className="flex flex-col items-center">
              <input
                type="number"
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                min="0"
                max="59"
                className="w-20 px-3 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1">초</span>
            </div>
          </div>
          
          {/* 예상 페이스 미리보기 */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">예상 평균 페이스: </span>
            <span className="font-bold text-blue-900">{averagePaceFormatted}/km</span>
            <span className="text-sm text-blue-600 ml-2">({speedKmh} km/h)</span>
          </div>
        </div>

        {/* 페이스 전략 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🎯 페이스 전략
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(STRATEGY_INFO) as PaceStrategy[]).map((strat) => {
              const info = STRATEGY_INFO[strat];
              return (
                <label
                  key={strat}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    strategy === strat
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={strat}
                    checked={strategy === strat}
                    onChange={() => setStrategy(strat)}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-3xl mb-2">{info.icon}</div>
                    <div className="font-bold text-gray-800">{info.name}</div>
                    <div className="text-xs text-gray-500">{info.desc}</div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-semibold ${info.badgeClass}`}>
                      {info.badge}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          
          {/* 전략 상세 설명 */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-start gap-2">
            <span className="text-xl">💡</span>
            <p className="text-sm text-gray-700">{STRATEGY_INFO[strategy].detail}</p>
          </div>
        </div>

        {/* 즐겨찾기 */}
        <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-amber-800 flex items-center gap-2">
              <i className="fas fa-star"></i>
              즐겨찾기
            </h4>
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              <i className="fas fa-bookmark mr-1"></i>
              현재 설정 저장
            </button>
          </div>
          
          {favorites.length > 0 ? (
            <div className="space-y-2">
              {favorites.map((fav) => (
                <div key={fav.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleApplyFavorite(fav)}
                    className="flex-1 text-left hover:text-amber-700"
                  >
                    <span className="font-semibold">{fav.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {fav.distance}km / {formatTime(fav.targetTime)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFavorite(fav.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-amber-700 py-3">
              저장된 즐겨찾기가 없습니다. 자주 사용하는 설정을 저장해보세요!
            </p>
          )}
        </div>

        {/* 계산 버튼 */}
        <button
          type="button"
          onClick={calculate}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-[1.02]"
        >
          <i className="fas fa-calculator mr-2"></i>
          스플릿 계산하기
        </button>
      </div>

      {/* 결과 */}
      {splits ? (
        <div className="card p-6">
          {/* 전략 요약 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <h3 className="font-bold text-lg mb-2">
              {STRATEGY_INFO[strategy].icon} {STRATEGY_INFO[strategy].name} 전략
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">목표 거리:</span>
                <span className="font-bold ml-1">{distance}km</span>
              </div>
              <div>
                <span className="text-gray-500">목표 시간:</span>
                <span className="font-bold ml-1">{formatTime(hours * 3600 + minutes * 60 + seconds)}</span>
              </div>
              <div>
                <span className="text-gray-500">평균 페이스:</span>
                <span className="font-bold ml-1">{averagePaceFormatted}/km</span>
              </div>
              <div>
                <span className="text-gray-500">평균 속도:</span>
                <span className="font-bold ml-1">{speedKmh} km/h</span>
              </div>
            </div>
          </div>

          {/* 페이스 그래프 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="font-bold text-sm mb-3">📊 구간별 페이스 변화</h4>
            <div className="flex items-end justify-around gap-2 h-32">
              {splits.slice(0, 10).map((split, idx) => {
                const avgPace = (hours * 3600 + minutes * 60 + seconds) / distance;
                const paceRatio = split.pace / avgPace;
                const height = Math.max(20, Math.min(100, paceRatio * 80));
                const isFast = paceRatio < 0.99;
                const isSlow = paceRatio > 1.01;
                
                return (
                  <div key={idx} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-t transition-all ${
                        isFast ? 'bg-green-500' : isSlow ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-500 mt-1">{split.km}km</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 스플릿 테이블 */}
          <div className="table-container">
            <table className="pace-table w-full">
              <thead>
                <tr>
                  <th>구간</th>
                  <th>페이스</th>
                  <th>랩 타임</th>
                  <th>누적 시간</th>
                  <th>누적 거리</th>
                </tr>
              </thead>
              <tbody>
                {splits.map((split, idx) => (
                  <tr key={idx}>
                    <td className="font-bold">{split.km}km</td>
                    <td>{formatPace(split.pace)}/km</td>
                    <td>{formatTime(split.lapTime)}</td>
                    <td className="font-semibold">{formatTime(split.cumulativeTime)}</td>
                    <td>{split.cumulativeDistance.toFixed(2)}km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 레이스 팁 */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <h4 className="font-bold text-sm mb-2 text-yellow-800">💡 레이스 팁</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 첫 1km은 목표 페이스보다 5-10초 느리게 시작하세요</li>
              <li>• 급수대에서 2-3초 손실을 감안하세요</li>
              <li>• 오르막 구간에서는 페이스가 10-15% 느려질 수 있습니다</li>
            </ul>
          </div>

          {/* 리셋 버튼 */}
          <button
            type="button"
            onClick={reset}
            className="mt-4 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>
            새로 계산하기
          </button>
        </div>
      ) : (
        /* 계산 전 안내 */
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">🏃‍♂️</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">레이스 전략을 계산해보세요!</h3>
          <p className="text-sm text-gray-600 mb-4">
            목표 거리와 시간을 설정하고 페이스 전략을 선택한 뒤<br />
            <strong>"스플릿 계산하기"</strong> 버튼을 클릭하세요.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>💡 Tip:</span>
            <span>빠른 거리 선택 버튼과 시간 프리셋을 활용해보세요!</span>
          </div>
        </div>
      )}

      {/* 즐겨찾기 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">즐겨찾기 저장</h3>
            <input
              type="text"
              value={favoriteName}
              onChange={(e) => setFavoriteName(e.target.value)}
              placeholder="즐겨찾기 이름 입력"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveFavorite}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-semibold"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitCalculator;
