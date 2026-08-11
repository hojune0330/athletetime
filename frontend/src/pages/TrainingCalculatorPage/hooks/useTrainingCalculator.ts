import { useState, useCallback } from 'react';
import  { calculateAdjustments } from '../utils/adjustments';
import { calculateVDOT, calculateTrainingPaces, getPerformanceLevel, calculateVO2max } from '../utils/vdotCalculations';
import { generateWeeklyPlan, generateMesocycle, generateWorkoutDetails } from '../utils/trainingPlans';
import type {
  TrainingPaces
} from '../utils/vdotCalculations';
import type {
  UserProfile,
  Conditions,
  Gender,
} from '../utils/adjustments';
import type {
  DayPlan,
  WeekPlan,
  Workout,
} from '../utils/trainingPlans';
import {
  EMPTY_TIME,
  getPerformanceSeconds,
  hasDirectPerformanceInput,
  hasSelectedDistance,
  type TimeInput,
} from './trainingCalculatorInput';

export type { TimeInput } from './trainingCalculatorInput';

export interface TrainingResults {
  vdot: number;
  displayVdot: number;
  performanceLevel: string;
  vo2max: number;
  paces: TrainingPaces;
  weeklyPlan: DayPlan[];
  mesocycle: WeekPlan[];
  workouts: Workout[];
  adjustmentNote: string;
}

type InputErrorType = 'gender' | 'distance' | 'time';

type CalculationOutcome =
  | { readonly kind: 'success' }
  | { readonly kind: 'error'; readonly errorType: InputErrorType };

const DEFAULT_PROFILE: UserProfile = {
  gender: null,
  ageGroup: 'senior',
  experience: 'intermediate',
  weeklyVolume: 'moderate',
  frequency: '5-6',
  trainingPhase: 'build',
};

const DEFAULT_CONDITIONS: Conditions = {
  altitude: false,
  hotWeather: false,
};

export function useTrainingCalculator() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [conditions, setConditions] = useState<Conditions>(DEFAULT_CONDITIONS);
  const [distance, setDistance] = useState<string>('');
  const [time, setTime] = useState<TimeInput>(EMPTY_TIME);
  const [results, setResults] = useState<TrainingResults | null>(null);
  const [error, setError] = useState<string>('');

  const updateGender = useCallback((gender: Gender) => {
    setProfile(prev => ({ ...prev, gender }));
    setResults(null);
    setError('');
  }, []);

  const updateProfile = useCallback(<K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
    setResults(null);
    setError('');
  }, []);

  const updateCondition = useCallback((key: keyof Conditions, value: boolean) => {
    setConditions(prev => ({ ...prev, [key]: value }));
    setResults(null);
    setError('');
  }, []);

  const updateDistance = useCallback((value: string) => {
    setDistance(value);
    setResults(null);
    setError('');
  }, []);

  const updateTime = useCallback(<K extends keyof TimeInput>(key: K, value: TimeInput[K]) => {
    setTime(prev => ({ ...prev, [key]: value }));
    setResults(null);
    setError('');
  }, []);

  const canCalculate = profile.gender !== null && hasSelectedDistance(distance) && hasDirectPerformanceInput(time);

  const calculate = useCallback((): CalculationOutcome => {
    setError('');
    
    // 유효성 검사
    if (!profile.gender) {
      setError('성별을 선택해주세요.');
      return { kind: 'error', errorType: 'gender' };
    }
    
    if (!hasSelectedDistance(distance)) {
      setError('종목을 선택해주세요.');
      return { kind: 'error', errorType: 'distance' };
    }

    if (!hasDirectPerformanceInput(time)) {
      setError('기록을 다시 확인해주세요. 시는 0~23, 분과 초는 0~59 범위예요.');
      return { kind: 'error', errorType: 'time' };
    }

    const totalSeconds = getPerformanceSeconds(time);

    // 조정 계수 계산
    const adjustments = calculateAdjustments(profile, conditions);
    
    // VDOT 계산
    const distanceMeters = Number(distance);
    const vdot = calculateVDOT(distanceMeters, totalSeconds);
    
    // 성별 보정 적용된 표시용 VDOT
    const displayVdot = profile.gender === 'female' ? vdot * 0.88 : vdot;
    
    // 훈련 페이스 계산
    const paces = calculateTrainingPaces(vdot, adjustments.pace);
    
    // 훈련 계획 생성
    const weeklyPlan = generateWeeklyPlan(profile.frequency, profile.trainingPhase);
    const mesocycle = generateMesocycle(profile.trainingPhase);
    const workouts = generateWorkoutDetails(profile.experience, paces);
    
    setResults({
      vdot,
      displayVdot: Math.round(displayVdot * 10) / 10,
      performanceLevel: getPerformanceLevel(displayVdot),
      vo2max: calculateVO2max(displayVdot),
      paces,
      weeklyPlan,
      mesocycle,
      workouts,
      adjustmentNote: profile.gender === 'female' ? '여성 보정 적용됨' : '',
    });

    return { kind: 'success' };
  }, [profile, conditions, distance, time]);

  const reset = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    setConditions(DEFAULT_CONDITIONS);
    setDistance('');
    setTime(EMPTY_TIME);
    setResults(null);
    setError('');
  }, []);

  return {
    // State
    profile,
    conditions,
    distance,
    time,
    canCalculate,
    results,
    error,
    // Actions
    updateGender,
    updateProfile,
    updateCondition,
    updateDistance,
    updateTime,
    calculate,
    reset,
  };
}
