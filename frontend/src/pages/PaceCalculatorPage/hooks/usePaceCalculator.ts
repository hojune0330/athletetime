import { useState, useCallback, useMemo } from 'react';
import {
  formatTime,
  formatPace,
  calculateFinishTime,
  calculatePaceFromTarget,
  calculateSpeed,
  calculate400mLap,
  calculate100mTime,
  calculateAllLanesData,
  calculateSplits,
  STANDARD_DISTANCES,
  type LaneData,
  type SplitData,
  type PaceStrategy,
} from '../utils/paceCalculations';

// 페이스 차트 데이터 생성 훅
export function usePaceChart() {
  const paceChartData = useMemo(() => {
    const paces: { pace: string; seconds: number }[] = [];
    
    // km 페이스 목록 (2:30부터 8:00까지 10초 간격)
    for (let seconds = 150; seconds <= 480; seconds += 10) {
      paces.push({
        pace: formatPace(seconds),
        seconds,
      });
    }
    
    const distances = [
      { name: '100m', meters: 100 },
      { name: '200m', meters: 200 },
      { name: '400m', meters: 400 },
      { name: '800m', meters: 800 },
      { name: '1km', meters: 1000 },
      { name: '3km', meters: 3000 },
      { name: '5km', meters: 5000 },
      { name: '10km', meters: 10000 },
      { name: '15km', meters: 15000 },
      { name: '하프', meters: 21097.5 },
      { name: '30km', meters: 30000 },
      { name: '풀코스', meters: 42195 },
    ];
    
    return paces.map(paceData => ({
      pace: paceData.pace,
      paceSeconds: paceData.seconds,
      times: distances.map(dist => ({
        distance: dist.name,
        time: formatTime(calculateFinishTime(paceData.seconds, dist.meters)),
        rawSeconds: calculateFinishTime(paceData.seconds, dist.meters),
      })),
      isHighlight: [180, 240, 300, 360, 420].includes(paceData.seconds),
      isSubHighlight: [210, 270, 330, 390, 450].includes(paceData.seconds),
    }));
  }, []);
  
  return { paceChartData };
}

// 목표 페이스 계산기 훅
export function useTargetPaceCalculator() {
  const [distance, setDistance] = useState<number>(5000); // 미터
  const [targetTime, setTargetTime] = useState<number>(1200); // 초 (20분)
  
  const result = useMemo(() => {
    const pacePerKm = calculatePaceFromTarget(targetTime, distance);
    const pace400m = calculate400mLap(pacePerKm);
    const pace100m = calculate100mTime(pacePerKm);
    const speed = calculateSpeed(distance, targetTime);
    
    return {
      pacePerKm: formatPace(pacePerKm),
      pacePerKmSeconds: pacePerKm,
      pace400m: formatTime(pace400m),
      pace100m: formatTime(pace100m),
      speedKmh: speed.toFixed(2),
      finishTime: formatTime(targetTime),
    };
  }, [distance, targetTime]);
  
  return {
    distance,
    setDistance,
    targetTime,
    setTargetTime,
    result,
  };
}

// 트랙 레인 계산기 훅
export function useTrackLaneCalculator() {
  const [selectedLane, setSelectedLane] = useState<number>(1);
  const [targetTime, setTargetTime] = useState<number>(60); // 초
  
  const lanesData = useMemo(() => {
    return calculateAllLanesData(targetTime, selectedLane);
  }, [targetTime, selectedLane]);
  
  const selectedLaneData = useMemo(() => {
    return lanesData.find(l => l.isSelected);
  }, [lanesData]);
  
  return {
    selectedLane,
    setSelectedLane,
    targetTime,
    setTargetTime,
    lanesData,
    selectedLaneData,
  };
}

// 스플릿 계산기 훅
export function useSplitCalculator() {
  const [distance, setDistance] = useState<number>(21.0975); // km (하프마라톤)
  const [hours, setHours] = useState<number>(1);
  const [minutes, setMinutes] = useState<number>(45);
  const [seconds, setSeconds] = useState<number>(0);
  const [strategy, setStrategy] = useState<PaceStrategy>('even');
  const [splits, setSplits] = useState<SplitData[] | null>(null);
  
  const targetTimeSeconds = useMemo(() => {
    return hours * 3600 + minutes * 60 + seconds;
  }, [hours, minutes, seconds]);
  
  const averagePace = useMemo(() => {
    return targetTimeSeconds / distance;
  }, [targetTimeSeconds, distance]);
  
  const calculate = useCallback(() => {
    const result = calculateSplits(distance, targetTimeSeconds, strategy);
    setSplits(result);
  }, [distance, targetTimeSeconds, strategy]);
  
  const reset = useCallback(() => {
    setSplits(null);
  }, []);
  
  return {
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
    targetTimeSeconds,
    averagePace,
    averagePaceFormatted: formatPace(averagePace),
    speedKmh: calculateSpeed(distance * 1000, targetTimeSeconds).toFixed(1),
    splits,
    calculate,
    reset,
  };
}

// 즐겨찾기 관리 훅
interface Favorite {
  id: string;
  name: string;
  distance: number;
  targetTime: number;
  strategy: PaceStrategy;
  createdAt: number;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('paceCalculatorFavorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const saveFavorite = useCallback((name: string, distance: number, targetTime: number, strategy: PaceStrategy) => {
    const newFavorite: Favorite = {
      id: Date.now().toString(),
      name,
      distance,
      targetTime,
      strategy,
      createdAt: Date.now(),
    };
    
    setFavorites(prev => {
      const updated = [...prev, newFavorite];
      localStorage.setItem('paceCalculatorFavorites', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  const deleteFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f.id !== id);
      localStorage.setItem('paceCalculatorFavorites', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  return {
    favorites,
    saveFavorite,
    deleteFavorite,
  };
}
