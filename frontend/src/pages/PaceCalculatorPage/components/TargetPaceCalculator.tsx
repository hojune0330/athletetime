import React, { useState, useMemo } from 'react';
import { 
  formatTime, 
  formatPace, 
  calculatePaceFromTarget,
  calculate400mLap,
  calculate100mTime,
  calculateSpeed,
} from '../utils/paceCalculations';

// 빠른 거리 선택 옵션
const QUICK_DISTANCES = [
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
  { label: '하프', value: 21097.5 },
  { label: '풀코스', value: 42195 },
];

export const TargetPaceCalculator: React.FC = () => {
  const [distance, setDistance] = useState<number>(5000);
  const [customDistance, setCustomDistance] = useState<string>('5');
  const [isCustom, setIsCustom] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(20);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<{
    pacePerKm: string;
    pace400m: string;
    pace100m: string;
    speedKmh: string;
    finishTime: string;
  } | null>(null);

  const targetTimeSeconds = useMemo(() => {
    return hours * 3600 + minutes * 60 + seconds;
  }, [hours, minutes, seconds]);

  const handleDistanceSelect = (dist: number) => {
    setDistance(dist);
    setIsCustom(false);
  };

  const handleCustomDistanceChange = (value: string) => {
    setCustomDistance(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setDistance(numValue * 1000); // km to meters
    }
    setIsCustom(true);
  };

  const calculate = () => {
    if (targetTimeSeconds <= 0 || distance <= 0) {
      alert('올바른 거리와 시간을 입력해주세요.');
      return;
    }

    const pacePerKm = calculatePaceFromTarget(targetTimeSeconds, distance);
    const pace400m = calculate400mLap(pacePerKm);
    const pace100m = calculate100mTime(pacePerKm);
    const speed = calculateSpeed(distance, targetTimeSeconds);

    setResult({
      pacePerKm: formatPace(pacePerKm),
      pace400m: formatTime(pace400m),
      pace100m: formatTime(pace100m),
      speedKmh: speed.toFixed(2),
      finishTime: formatTime(targetTimeSeconds),
    });
  };

  const reset = () => {
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="text-3xl">🎯</span>
          목표 페이스 계산기
        </h2>

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
                onClick={() => handleDistanceSelect(d.value)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  !isCustom && distance === d.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                }`}
              >
                {d.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                isCustom
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
              }`}
            >
              직접 입력
            </button>
          </div>
          
          {isCustom && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customDistance}
                onChange={(e) => handleCustomDistanceChange(e.target.value)}
                min="0.1"
                step="0.1"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="거리"
              />
              <span className="text-gray-600">km</span>
            </div>
          )}
          
          <p className="text-sm text-gray-500 mt-2">
            현재 선택: <span className="font-semibold">{(distance / 1000).toFixed(3)}km</span>
          </p>
        </div>

        {/* 목표 시간 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⏱️ 목표 완주 시간
          </label>
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
        </div>

        {/* 계산 버튼 */}
        <button
          type="button"
          onClick={calculate}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-[1.02]"
        >
          <i className="fas fa-calculator mr-2"></i>
          페이스 계산하기
        </button>
      </div>

      {/* 결과 */}
      {result ? (
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            📋 계산 결과
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <div className="text-sm text-blue-600 mb-1">km 페이스</div>
              <div className="text-3xl font-bold text-blue-800">{result.pacePerKm}</div>
              <div className="text-xs text-blue-500">/km</div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <div className="text-sm text-green-600 mb-1">400m 랩</div>
              <div className="text-3xl font-bold text-green-800">{result.pace400m}</div>
              <div className="text-xs text-green-500">초</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl text-center">
              <div className="text-sm text-orange-600 mb-1">100m 타임</div>
              <div className="text-3xl font-bold text-orange-800">{result.pace100m}</div>
              <div className="text-xs text-orange-500">초</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl text-center">
              <div className="text-sm text-purple-600 mb-1">평균 속도</div>
              <div className="text-3xl font-bold text-purple-800">{result.speedKmh}</div>
              <div className="text-xs text-purple-500">km/h</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center col-span-2 md:col-span-1">
              <div className="text-sm text-gray-600 mb-1">목표 거리</div>
              <div className="text-3xl font-bold text-gray-800">{(distance / 1000).toFixed(3)}</div>
              <div className="text-xs text-gray-500">km</div>
            </div>
            <div className="p-4 bg-red-50 rounded-xl text-center col-span-2 md:col-span-1">
              <div className="text-sm text-red-600 mb-1">완주 시간</div>
              <div className="text-3xl font-bold text-red-800">{result.finishTime}</div>
            </div>
          </div>

          {/* 추가 정보 */}
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <h4 className="font-bold text-sm mb-2 text-yellow-800">💡 참고 정보</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 이 페이스는 균등 페이스 기준입니다</li>
              <li>• 실제 레이스에서는 급수, 코스 난이도에 따라 변동됩니다</li>
              <li>• 트랙 경기의 경우 레인에 따라 실제 거리가 다릅니다</li>
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
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">목표 페이스를 확인해보세요!</h3>
          <p className="text-sm text-gray-600 mb-4">
            목표 거리와 완주 시간을 입력하고<br />
            <strong>"페이스 계산하기"</strong> 버튼을 클릭하세요.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>📏</span>
            <span>거리는 드롭다운에서 선택하거나 직접 입력할 수 있습니다.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetPaceCalculator;
