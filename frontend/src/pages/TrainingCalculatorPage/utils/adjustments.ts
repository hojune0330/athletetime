// 사용자 프로필에 따른 훈련 조정 계산

export type Gender = 'male' | 'female';
export type AgeGroup = 'junior' | 'senior' | 'master40' | 'master50' | 'master60';
export type Experience = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type WeeklyVolume = 'low' | 'moderate' | 'high' | 'very-high';
export type TrainingFrequency = '3-4' | '5-6' | '7' | 'double';
export type TrainingPhase = 'base' | 'build' | 'peak' | 'taper' | 'recovery';

export interface UserProfile {
  gender: Gender | null;
  ageGroup: AgeGroup;
  experience: Experience;
  weeklyVolume: WeeklyVolume;
  frequency: TrainingFrequency;
  trainingPhase: TrainingPhase;
}

export interface Conditions {
  injuryRecovery: boolean;
  highFatigue: boolean;
  altitude: boolean;
  hotWeather: boolean;
  weightLoss: boolean;
  morningOnly: boolean;
}

export interface Adjustments {
  pace: number;
  volume: number;
  intensity: number;
}

/**
 * 사용자 프로필 및 조건에 따른 조정 계수 계산
 */
export function calculateAdjustments(profile: UserProfile, conditions: Conditions): Adjustments {
  const adjustments: Adjustments = {
    pace: 1.0,
    volume: 1.0,
    intensity: 1.0,
  };
  
  // 성별 조정 (여성은 페이스가 약간 느림)
  if (profile.gender === 'female') {
    adjustments.pace *= 1.05;
  }
  
  // 연령대 조정
  switch (profile.ageGroup) {
    case 'junior':
      adjustments.volume *= 0.8;
      adjustments.intensity *= 0.9;
      break;
    case 'master40':
      adjustments.pace *= 1.02;
      adjustments.volume *= 0.95;
      break;
    case 'master50':
      adjustments.pace *= 1.05;
      adjustments.volume *= 0.9;
      break;
    case 'master60':
      adjustments.pace *= 1.08;
      adjustments.volume *= 0.85;
      adjustments.intensity *= 0.9;
      break;
  }
  
  // 경력 수준 조정
  switch (profile.experience) {
    case 'beginner':
      adjustments.volume *= 0.7;
      adjustments.intensity *= 0.8;
      break;
    case 'intermediate':
      adjustments.volume *= 0.85;
      adjustments.intensity *= 0.9;
      break;
    case 'elite':
      adjustments.volume *= 1.2;
      adjustments.intensity *= 1.1;
      break;
  }
  
  // 훈련 단계 조정
  switch (profile.trainingPhase) {
    case 'base':
      adjustments.volume *= 1.1;
      adjustments.intensity *= 0.8;
      break;
    case 'peak':
      adjustments.volume *= 0.9;
      adjustments.intensity *= 1.1;
      break;
    case 'taper':
      adjustments.volume *= 0.5;
      break;
    case 'recovery':
      adjustments.volume *= 0.6;
      adjustments.intensity *= 0.7;
      break;
  }
  
  // 특별 조건 조정
  if (conditions.injuryRecovery) {
    adjustments.volume *= 0.6;
    adjustments.intensity *= 0.7;
    adjustments.pace *= 1.1;
  }
  
  if (conditions.highFatigue) {
    adjustments.volume *= 0.8;
    adjustments.intensity *= 0.85;
  }
  
  if (conditions.altitude) {
    adjustments.pace *= 1.03;
    adjustments.intensity *= 0.9;
  }
  
  if (conditions.hotWeather) {
    adjustments.pace *= 1.05;
  }
  
  return adjustments;
}

// 옵션 데이터
export const AGE_GROUP_OPTIONS = [
  { value: 'junior', label: '주니어 (18세 이하)' },
  { value: 'senior', label: '시니어 (19-39세)' },
  { value: 'master40', label: '마스터즈 40+ (40-49세)' },
  { value: 'master50', label: '마스터즈 50+ (50-59세)' },
  { value: 'master60', label: '마스터즈 60+ (60세 이상)' },
];

export const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: '초급 (1년 미만)' },
  { value: 'intermediate', label: '중급 (1-3년)' },
  { value: 'advanced', label: '고급 (3-5년)' },
  { value: 'elite', label: '엘리트 (5년 이상)' },
];

export const WEEKLY_VOLUME_OPTIONS = [
  { value: 'low', label: '30km 이하' },
  { value: 'moderate', label: '30-60km' },
  { value: 'high', label: '60-100km' },
  { value: 'very-high', label: '100km 이상' },
];

export const FREQUENCY_OPTIONS = [
  { value: '3-4', label: '주 3-4회' },
  { value: '5-6', label: '주 5-6회' },
  { value: '7', label: '주 7회' },
  { value: 'double', label: '2회/일 (엘리트)' },
];

export const TRAINING_PHASE_OPTIONS = [
  { value: 'base', label: '기초 체력기' },
  { value: 'build', label: '전문 체력기' },
  { value: 'peak', label: '피킹 단계' },
  { value: 'taper', label: '테이퍼링' },
  { value: 'recovery', label: '회복기' },
];

export const CONDITION_OPTIONS = [
  { id: 'injuryRecovery', label: '부상 회복중', description: '훈련 강도 40% 감소' },
  { id: 'highFatigue', label: '피로 누적', description: '회복 위주 프로그램' },
  { id: 'altitude', label: '고지대 훈련', description: '강도 조절 필요' },
  { id: 'hotWeather', label: '고온다습 환경', description: '페이스 5-10초 조절' },
  { id: 'weightLoss', label: '체중 감량 목표', description: '유산소 비중 증가' },
  { id: 'morningOnly', label: '아침 훈련만 가능', description: '워밍업 시간 증가' },
];
