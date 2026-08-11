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
  const [time, setTime] = useState<TimeInput>({ hours: 0, minutes: 0, seconds: 0 });
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

  const updateTime = useCallback(<K extends keyof TimeInput>(key: K, value: number) => {
    setTime(prev => ({ ...prev, [key]: value }));
    setResults(null);
    setError('');
  }, []);

  const calculate = useCallback((): CalculationOutcome => {
    setError('');
    
    // 유효성 검사
    if (!profile.gender) {
      setError('성별을 선택해주세요.');
      return { kind: 'error', errorType: 'gender' };
    }
    
    if (!distance || !Number.isFinite(Number(distance)) || Number(distance) <= 0) {
      setError('종목을 선택해주세요.');
      return { kind: 'error', errorType: 'distance' };
    }
    
    const isValidTime = Number.isInteger(time.hours)
      && time.hours >= 0
      && time.hours <= 23
      && Number.isInteger(time.minutes)
      && time.minutes >= 0
      && time.minutes < 60
      && Number.isFinite(time.seconds)
      && time.seconds >= 0
      && time.seconds < 60;
    const totalSeconds = time.hours * 3600 + time.minutes * 60 + time.seconds;
    if (!isValidTime || totalSeconds <= 0) {
      setError('기록을 다시 확인해주세요. 시는 0~23, 분과 초는 0~59 범위예요.');
      return { kind: 'error', errorType: 'time' };
    }

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
    updateDistance,
    updateTime,
    calculate,
    reset,
  };
}
