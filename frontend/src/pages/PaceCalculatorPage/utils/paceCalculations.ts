// 페이스 계산 유틸리티 함수들

// IAAF 표준 레인 거리
export const LANE_DISTANCES: Record<number, number> = {
  1: 400.00,
  2: 407.04,
  3: 414.70,
  4: 422.37,
  5: 430.03,
  6: 437.70,
  7: 445.37,
  8: 453.03
};

// 레인 색상
export const LANE_COLORS = [
  '#ef4444', // 1 - red
  '#f97316', // 2 - orange
  '#eab308', // 3 - yellow
  '#84cc16', // 4 - lime
  '#22c55e', // 5 - green
  '#06b6d4', // 6 - cyan
  '#3b82f6', // 7 - blue
  '#8b5cf6', // 8 - violet
];

// World Athletics 공식 표준 트랙 규격
export const TRACK_SPECS = {
  STRAIGHT_LENGTH: 84.39,
  LANE_WIDTH: 1.22,
  KERB_RADIUS: 36.50,
  MEASUREMENT_OFFSET_LANE1: 0.30,
  MEASUREMENT_OFFSET_OTHER: 0.20,
};

// 표준 거리 (미터)
export const STANDARD_DISTANCES = {
  '100m': 100,
  '200m': 200,
  '400m': 400,
  '800m': 800,
  '1km': 1000,
  '3km': 3000,
  '5km': 5000,
  '10km': 10000,
  '15km': 15000,
  'half': 21097.5,
  '30km': 30000,
  'full': 42195,
};

// 시간 포맷팅 함수
export function formatTime(seconds: number, forceHours = false): string {
  if (isNaN(seconds) || seconds === null) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0 || forceHours) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(Math.floor(secs)).padStart(2, '0')}`;
  } else if (mins > 0) {
    return `${mins}:${String(Math.floor(secs)).padStart(2, '0')}`;
  } else {
    return secs.toFixed(1);
  }
}

// 페이스를 분:초 형식으로 포맷
export function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// km 페이스에서 거리별 완주 시간 계산
export function calculateFinishTime(pacePerKm: number, distanceMeters: number): number {
  return (pacePerKm / 1000) * distanceMeters;
}

// 목표 기록에서 km 페이스 계산
export function calculatePaceFromTarget(targetSeconds: number, distanceMeters: number): number {
  return targetSeconds / (distanceMeters / 1000);
}

// 속도 계산 (km/h)
export function calculateSpeed(distanceMeters: number, timeSeconds: number): number {
  return (distanceMeters / timeSeconds) * 3.6;
}

// 400m 랩타임 계산
export function calculate400mLap(pacePerKm: number): number {
  return pacePerKm * 0.4;
}

// 100m 타임 계산
export function calculate100mTime(pacePerKm: number): number {
  return pacePerKm * 0.1;
}

// 레인별 거리 계산
export function calculateLaneDistance(lane: number): number {
  const { STRAIGHT_LENGTH, LANE_WIDTH, KERB_RADIUS, MEASUREMENT_OFFSET_LANE1, MEASUREMENT_OFFSET_OTHER } = TRACK_SPECS;
  
  let measurementRadius: number;
  if (lane === 1) {
    measurementRadius = KERB_RADIUS + MEASUREMENT_OFFSET_LANE1;
  } else {
    measurementRadius = KERB_RADIUS + (LANE_WIDTH * (lane - 1)) + MEASUREMENT_OFFSET_OTHER;
  }
  
  const curveLength = Math.PI * measurementRadius * 2;
  return (STRAIGHT_LENGTH * 2) + curveLength;
}

// 레인별 스태거 계산
export function calculateStagger(lane: number): number {
  if (lane === 1) return 0;
  return calculateLaneDistance(lane) - 400;
}

// 레인 데이터 인터페이스
export interface LaneData {
  lane: number;
  radius: number;
  distance: number;
  stagger: number;
  adjustedTime: number;
  sectionDistances: {
    straight1: number;
    curve1: number;
    straight2: number;
    curve2: number;
  };
  sectionTimes: {
    straight1: number;
    curve1: number;
    straight2: number;
    curve2: number;
  };
  isSelected: boolean;
  speedMPS: number;
  speedKMH: number;
  pacePerKm: number;
}

// 모든 레인 데이터 계산
export function calculateAllLanesData(targetTime: number, selectedLane: number): LaneData[] {
  const { STRAIGHT_LENGTH, LANE_WIDTH, KERB_RADIUS, MEASUREMENT_OFFSET_LANE1, MEASUREMENT_OFFSET_OTHER } = TRACK_SPECS;
  
  // 선택된 레인의 거리 계산
  const selectedLaneDistance = calculateLaneDistance(selectedLane);
  const speedInSelectedLane = selectedLaneDistance / targetTime;
  
  const lanes: LaneData[] = [];
  
  for (let lane = 1; lane <= 8; lane++) {
    let measurementRadius: number;
    if (lane === 1) {
      measurementRadius = KERB_RADIUS + MEASUREMENT_OFFSET_LANE1;
    } else {
      measurementRadius = KERB_RADIUS + (LANE_WIDTH * (lane - 1)) + MEASUREMENT_OFFSET_OTHER;
    }
    
    const curveLength = Math.PI * measurementRadius * 2;
    const totalDistance = (STRAIGHT_LENGTH * 2) + curveLength;
    const stagger = lane === 1 ? 0 : totalDistance - 400;
    
    const sectionDistances = {
      straight1: STRAIGHT_LENGTH,
      curve1: curveLength / 2,
      straight2: STRAIGHT_LENGTH,
      curve2: curveLength / 2
    };
    
    const sectionTimes = {
      straight1: sectionDistances.straight1 / speedInSelectedLane,
      curve1: sectionDistances.curve1 / speedInSelectedLane,
      straight2: sectionDistances.straight2 / speedInSelectedLane,
      curve2: sectionDistances.curve2 / speedInSelectedLane
    };
    
    const adjustedTime = totalDistance / speedInSelectedLane;
    
    lanes.push({
      lane,
      radius: measurementRadius,
      distance: totalDistance,
      stagger,
      adjustedTime,
      sectionDistances,
      sectionTimes,
      isSelected: lane === selectedLane,
      speedMPS: speedInSelectedLane,
      speedKMH: speedInSelectedLane * 3.6,
      pacePerKm: 1000 / speedInSelectedLane
    });
  }
  
  return lanes;
}

// 스플릿 계산 인터페이스
export interface SplitData {
  km: number;
  pace: number;
  lapTime: number;
  cumulativeTime: number;
  cumulativeDistance: number;
}

// 페이스 전략 타입
export type PaceStrategy = 'even' | 'negative' | 'positive';

// 스플릿 계산
export function calculateSplits(
  distanceKm: number,
  targetTimeSeconds: number,
  strategy: PaceStrategy
): SplitData[] {
  const splits: SplitData[] = [];
  const basePace = targetTimeSeconds / distanceKm;
  
  for (let km = 1; km <= Math.ceil(distanceKm); km++) {
    const isLastKm = km > distanceKm;
    const actualKm = isLastKm ? distanceKm - Math.floor(distanceKm) : 1;
    
    let paceMultiplier = 1;
    const progress = km / distanceKm;
    
    switch (strategy) {
      case 'negative':
        // 후반부로 갈수록 빨라짐 (1% 변화)
        paceMultiplier = 1.01 - (progress * 0.02);
        break;
      case 'positive':
        // 전반부가 빠르고 후반부가 느림 (1% 변화)
        paceMultiplier = 0.99 + (progress * 0.02);
        break;
      case 'even':
      default:
        paceMultiplier = 1;
    }
    
    const pace = basePace * paceMultiplier;
    const lapTime = pace * actualKm;
    const prevCumulative = splits.length > 0 ? splits[splits.length - 1].cumulativeTime : 0;
    
    splits.push({
      km,
      pace,
      lapTime,
      cumulativeTime: prevCumulative + lapTime,
      cumulativeDistance: Math.min(km, distanceKm)
    });
    
    if (isLastKm) break;
  }
  
  return splits;
}

// 목표 기록 데이터 타입
export interface TargetRecord {
  time: number;
  label: string;
  highlight?: boolean;
}

// 5km 목표 기록
export const TARGETS_5KM: TargetRecord[] = [
  { time: 13 * 60, label: '세계 엘리트', highlight: true },
  { time: 14 * 60, label: '국가대표' },
  { time: 15 * 60, label: '엘리트', highlight: true },
  { time: 16 * 60, label: '준엘리트' },
  { time: 17 * 60, label: '최상급' },
  { time: 18 * 60, label: '상급' },
  { time: 19 * 60, label: '중상급' },
  { time: 20 * 60, label: '서브 20', highlight: true },
  { time: 22 * 60, label: '중급' },
  { time: 25 * 60, label: '초중급', highlight: true },
  { time: 28 * 60, label: '초급' },
  { time: 30 * 60, label: '입문', highlight: true },
  { time: 35 * 60, label: '완주 목표' },
  { time: 40 * 60, label: '건강 조깅', highlight: true }
];

// 10km 목표 기록
export const TARGETS_10KM: TargetRecord[] = [
  { time: 27 * 60, label: '세계 엘리트', highlight: true },
  { time: 30 * 60, label: '국가대표' },
  { time: 32 * 60, label: '엘리트', highlight: true },
  { time: 35 * 60, label: '준엘리트' },
  { time: 38 * 60, label: '최상급' },
  { time: 40 * 60, label: '서브 40', highlight: true },
  { time: 43 * 60, label: '상급' },
  { time: 45 * 60, label: '중상급', highlight: true },
  { time: 50 * 60, label: '중급', highlight: true },
  { time: 55 * 60, label: '초중급' },
  { time: 60 * 60, label: '입문', highlight: true },
  { time: 70 * 60, label: '완주 목표' }
];

// 하프마라톤 목표 기록
export const TARGETS_HALF: TargetRecord[] = [
  { time: 60 * 60, label: '세계 엘리트', highlight: true },
  { time: 70 * 60, label: '국가대표' },
  { time: 75 * 60, label: '엘리트', highlight: true },
  { time: 80 * 60, label: '준엘리트' },
  { time: 85 * 60, label: '최상급' },
  { time: 90 * 60, label: '서브 1:30', highlight: true },
  { time: 100 * 60, label: '상급', highlight: true },
  { time: 110 * 60, label: '중급' },
  { time: 120 * 60, label: '서브 2시간', highlight: true },
  { time: 135 * 60, label: '초중급' },
  { time: 150 * 60, label: '입문', highlight: true }
];

// 풀마라톤 목표 기록
export const TARGETS_FULL: TargetRecord[] = [
  { time: 120 * 60, label: '세계 엘리트', highlight: true },
  { time: 150 * 60, label: '국가대표' },
  { time: 165 * 60, label: '엘리트', highlight: true },
  { time: 180 * 60, label: '서브 3', highlight: true },
  { time: 195 * 60, label: '준엘리트' },
  { time: 210 * 60, label: '서브 3:30', highlight: true },
  { time: 225 * 60, label: '상급' },
  { time: 240 * 60, label: '서브 4', highlight: true },
  { time: 270 * 60, label: '중급', highlight: true },
  { time: 300 * 60, label: '서브 5', highlight: true },
  { time: 330 * 60, label: '초급' },
  { time: 360 * 60, label: '완주 목표', highlight: true }
];

// 3000m 장애물 경주 계산
export const STEEPLECHASE_SPECS = {
  INSIDE: {
    lapDistance: 396.084,
    startDistance: 227.412,
    description: 'World Athletics 표준'
  },
  OUTSIDE: {
    lapDistance: 419.407,
    startDistance: 64.151,
    description: '일부 경기장 구성'
  }
};
