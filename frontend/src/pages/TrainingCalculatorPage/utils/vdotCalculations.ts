// VDOT 계산 유틸리티 - Jack Daniels' Running Formula 기반

export interface VdotTimes {
  800: number;
  1500: number;
  3000: number;
  5000: number;
  10000: number;
  '21097.5': number;
  42195: number;
}

export interface VdotTable {
  [vdot: number]: VdotTimes;
}

// VDOT 테이블 - Jack Daniels' Running Formula 기반
// 각 거리별 시간 (초 단위)
export const VDOT_TABLES: VdotTable = {
  30: { 800: 316, 1500: 681, 3000: 1520, 5000: 2680, 10000: 5560, '21097.5': 12240, 42195: 25380 },
  35: { 800: 279, 1500: 598, 3000: 1330, 5000: 2340, 10000: 4860, '21097.5': 10680, 42195: 22140 },
  40: { 800: 249, 1500: 532, 3000: 1178, 5000: 2070, 10000: 4290, '21097.5': 9420, 42195: 19500 },
  45: { 800: 224, 1500: 477, 3000: 1053, 5000: 1845, 10000: 3825, '21097.5': 8400, 42195: 17400 },
  50: { 800: 203, 1500: 431, 3000: 948, 5000: 1658, 10000: 3435, '21097.5': 7530, 42195: 15600 },
  55: { 800: 185, 1500: 392, 3000: 859, 5000: 1500, 10000: 3105, '21097.5': 6810, 42195: 14100 },
  60: { 800: 169, 1500: 357, 3000: 781, 5000: 1362, 10000: 2820, '21097.5': 6180, 42195: 12780 },
  65: { 800: 155, 1500: 327, 3000: 713, 5000: 1242, 10000: 2565, '21097.5': 5625, 42195: 11625 },
  70: { 800: 143, 1500: 301, 3000: 654, 5000: 1137, 10000: 2346, '21097.5': 5145, 42195: 10620 },
  75: { 800: 132, 1500: 277, 3000: 601, 5000: 1044, 10000: 2154, '21097.5': 4725, 42195: 9750 },
  80: { 800: 122, 1500: 256, 3000: 554, 5000: 961, 10000: 1983, '21097.5': 4350, 42195: 8970 },
  85: { 800: 113, 1500: 237, 3000: 512, 5000: 888, 10000: 1830, '21097.5': 4020, 42195: 8280 },
};

// 거리 옵션
export const DISTANCE_OPTIONS = [
  { value: '800', label: '800m' },
  { value: '1500', label: '1500m (1.5km)' },
  { value: '3000', label: '3000m (3km)' },
  { value: '5000', label: '5000m (5km)' },
  { value: '10000', label: '10000m (10km)' },
  { value: '21097.5', label: '하프마라톤 (21.0975km)' },
  { value: '42195', label: '풀마라톤 (42.195km)' },
];

/**
 * VDOT 점수 계산
 * @param distanceMeters 거리 (미터)
 * @param timeSeconds 시간 (초)
 * @returns VDOT 점수
 */
export function calculateVDOT(distanceMeters: number, timeSeconds: number): number {
  // 가장 가까운 VDOT 값 찾기
  let closestVDOT = 30;
  let minDiff = Infinity;
  
  const distKey = distanceMeters.toString() as keyof VdotTimes;
  
  for (const [vdot, times] of Object.entries(VDOT_TABLES)) {
    const time = times[distKey];
    if (time !== undefined) {
      const diff = Math.abs(time - timeSeconds);
      if (diff < minDiff) {
        minDiff = diff;
        closestVDOT = parseInt(vdot);
      }
    }
  }
  
  // 보간법으로 더 정확한 값 계산
  const vdotKeys = Object.keys(VDOT_TABLES).map(v => parseInt(v)).sort((a, b) => a - b);
  
  for (let i = 0; i < vdotKeys.length - 1; i++) {
    const lowerVDOT = vdotKeys[i];
    const upperVDOT = vdotKeys[i + 1];
    
    const lowerTime = VDOT_TABLES[lowerVDOT]?.[distKey];
    const upperTime = VDOT_TABLES[upperVDOT]?.[distKey];
    
    if (lowerTime !== undefined && upperTime !== undefined) {
      if (timeSeconds <= lowerTime && timeSeconds >= upperTime) {
        const ratio = (lowerTime - timeSeconds) / (lowerTime - upperTime);
        closestVDOT = lowerVDOT + (upperVDOT - lowerVDOT) * ratio;
        break;
      }
    }
  }
  
  return Math.round(closestVDOT * 10) / 10;
}

export interface TrainingPaces {
  easy: { min: number; max: number };
  marathon: number;
  threshold: number;
  interval: number;
  repetition: number;
}

/**
 * 훈련 페이스 계산
 * @param vdot VDOT 점수
 * @param paceAdjustment 페이스 조정 계수 (기본 1.0)
 * @returns 각 훈련 구역별 페이스 (초/km)
 */
export function calculateTrainingPaces(vdot: number, paceAdjustment: number = 1.0): TrainingPaces {
  // Jack Daniels' formula for training paces
  const paces: TrainingPaces = {
    easy: {
      min: Math.round((180 / vdot) * 195 * paceAdjustment), // E pace minimum (slower)
      max: Math.round((180 / vdot) * 175 * paceAdjustment), // E pace maximum (faster)
    },
    marathon: Math.round((180 / vdot) * 165 * paceAdjustment),
    threshold: Math.round((180 / vdot) * 155 * paceAdjustment),
    interval: Math.round((180 / vdot) * 140 * paceAdjustment),
    repetition: Math.round((180 / vdot) * 125 * paceAdjustment),
  };
  
  return paces;
}

/**
 * 페이스 포맷팅 (초/km -> MM:SS/km)
 */
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

/**
 * 수준 평가
 */
export function getPerformanceLevel(vdot: number): string {
  if (vdot >= 75) return '엘리트';
  if (vdot >= 65) return '준엘리트';
  if (vdot >= 55) return '상급자';
  if (vdot >= 45) return '중급자';
  if (vdot >= 35) return '초급자';
  return '입문자';
}

/**
 * 예상 VO2max 계산
 */
export function calculateVO2max(vdot: number): number {
  return Math.round(vdot * 1.05 * 10) / 10;
}
