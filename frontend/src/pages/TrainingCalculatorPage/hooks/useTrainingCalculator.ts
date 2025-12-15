import { useState, useCallback } from 'react';
import {
  calculateVDOT,
  calculateTrainingPaces,
  getPerformanceLevel,
  calculateVO2max,
  TrainingPaces,
} from '../utils/vdotCalculations';
import {
  UserProfile,
  Conditions,
  Adjustments,
  calculateAdjustments,
  Gender,
  AgeGroup,
  Experience,
  WeeklyVolume,
  TrainingFrequency,
  TrainingPhase,
} from '../utils/adjustments';
import {
  generateWeeklyPlan,
  generateMesocycle,
  generateWorkoutDetails,
  generateRecommendations,
  DayPlan,
  WeekPlan,
  Workout,
  Recommendation,
} from '../utils/trainingPlans';

export interface TimeInput {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface TrainingResults {
  vdot: number;
  displayVdot: number;
  performanceLevel: string;
  vo2max: number;
  paces: TrainingPaces;
  weeklyPlan: DayPlan[];
  mesocycle: WeekPlan[];
  workouts: Workout[];
  recommendations: Recommendation[];
  adjustmentNote: string;
}

const DEFAULT_PROFILE: UserProfile = {
  gender: null,
  ageGroup: 'senior',
  experience: 'intermediate',
  weeklyVolume: 'moderate',
  frequency: '5-6',
  trainingPhase: 'build',
};

const DEFAULT_CONDITIONS: Conditions = {
  injuryRecovery: false,
  highFatigue: false,
  altitude: false,
  hotWeather: false,
  weightLoss: false,
  morningOnly: false,
};

export function useTrainingCalculator() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [conditions, setConditions] = useState<Conditions>(DEFAULT_CONDITIONS);
  const [distance, setDistance] = useState<string>('');
  const [time, setTime] = useState<TimeInput>({ hours: 0, minutes: 0, seconds: 0 });
  const [results, setResults] = useState<TrainingResults | null>(null);
  const [error, setError] = useState<string>('');

  const updateGender = useCallback((gender: Gender) => {
    setProfile(prev => ({ ...prev, gender }));
  }, []);

  const updateProfile = useCallback(<K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateCondition = useCallback((key: keyof Conditions, value: boolean) => {
    setConditions(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateTime = useCallback(<K extends keyof TimeInput>(key: K, value: number) => {
    setTime(prev => ({ ...prev, [key]: value }));
  }, []);

  const calculate = useCallback(() => {
    setError('');
    
    // 유효성 검사
    if (!distance) {
      setError('종목을 선택해주세요.');
      return false;
    }
    
    const totalSeconds = time.hours * 3600 + time.minutes * 60 + time.seconds;
    if (totalSeconds === 0) {
      setError('기록을 입력해주세요.');
      return false;
    }
    
    if (!profile.gender) {
      setError('성별을 선택해주세요.');
      return false;
    }

    // 조정 계수 계산
    const adjustments = calculateAdjustments(profile, conditions);
    
    // VDOT 계산
    const distanceMeters = parseFloat(distance);
    const vdot = calculateVDOT(distanceMeters, totalSeconds);
    
    // 성별 보정 적용된 표시용 VDOT
    const displayVdot = profile.gender === 'female' ? vdot * 0.88 : vdot;
    
    // 훈련 페이스 계산
    const paces = calculateTrainingPaces(vdot, adjustments.pace);
    
    // 훈련 계획 생성
    const weeklyPlan = generateWeeklyPlan(profile.frequency, profile.trainingPhase);
    const mesocycle = generateMesocycle(profile.trainingPhase);
    const workouts = generateWorkoutDetails(profile.experience, paces);
    const recommendations = generateRecommendations(profile, conditions);
    
    setResults({
      vdot,
      displayVdot: Math.round(displayVdot * 10) / 10,
      performanceLevel: getPerformanceLevel(displayVdot),
      vo2max: calculateVO2max(displayVdot),
      paces,
      weeklyPlan,
      mesocycle,
      workouts,
      recommendations,
      adjustmentNote: profile.gender === 'female' ? '여성 보정 적용됨' : '',
    });

    return true;
  }, [profile, conditions, distance, time]);

  const reset = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    setConditions(DEFAULT_CONDITIONS);
    setDistance('');
    setTime({ hours: 0, minutes: 0, seconds: 0 });
    setResults(null);
    setError('');
  }, []);

  return {
    // State
    profile,
    conditions,
    distance,
    time,
    results,
    error,
    // Actions
    updateGender,
    updateProfile,
    updateCondition,
    setDistance,
    updateTime,
    calculate,
    reset,
  };
}
