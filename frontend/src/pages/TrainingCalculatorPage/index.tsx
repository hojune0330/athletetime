import React, { useRef } from 'react';
import {
  AthleteProfileForm,
  PerformanceInput,
  SpecialConditions,
  VdotScoreCard,
  TrainingZones,
  WeeklyPlanView,
  MesocycleView,
  WorkoutDetailsView,
  RecommendationsView,
} from './components';
import { useTrainingCalculator } from './hooks/useTrainingCalculator';
import TrainingLogLite from './components/TrainingLogLite';
import PageHeader from '../../components/common/PageHeader';
import './styles/training-calculator.css';

const TrainingCalculatorPage: React.FC = () => {
  const resultsRef = useRef<HTMLDivElement>(null);
  const genderSectionRef = useRef<HTMLDivElement>(null);
  const distanceSelectRef = useRef<HTMLSelectElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  
  const {
    profile,
    conditions,
    distance,
    time,
    results,
    error,
    updateGender,
    updateProfile,
    updateCondition,
    setDistance,
    updateTime,
    calculate,
  } = useTrainingCalculator();

  const handleCalculate = () => {
    const result = calculate();
    
    if (!result.success) {
      // 에러 타입에 따라 alert 표시 및 포커싱
      if (result.errorType === 'gender') {
        alert('성별을 선택해주세요.');
        genderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (result.errorType === 'distance') {
        alert('종목을 선택해주세요.');
        distanceSelectRef.current?.focus();
        distanceSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (result.errorType === 'time') {
        alert('기록을 입력해주세요.');
        timeInputRef.current?.focus();
        timeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // 성공 시 결과로 스크롤
    if (resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div>
      <div>
        {/* Header */}
        <PageHeader
          title="훈련 페이스 계산기"
          description="기준 기록과 프로필로 구역별 페이스와 훈련 구성을 계산해요"
        />

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-sm border border-err/40 border-l-2 border-l-err bg-surface px-4 py-3 text-body-sm text-err"
          >
            {error}
          </div>
        )}

        {/* Step 1: Athlete Profile */}
        <AthleteProfileForm
          gender={profile.gender}
          ageGroup={profile.ageGroup}
          experience={profile.experience}
          weeklyVolume={profile.weeklyVolume}
          frequency={profile.frequency}
          trainingPhase={profile.trainingPhase}
          onGenderChange={updateGender}
          onAgeGroupChange={(v) => updateProfile('ageGroup', v)}
          onExperienceChange={(v) => updateProfile('experience', v)}
          onWeeklyVolumeChange={(v) => updateProfile('weeklyVolume', v)}
          onFrequencyChange={(v) => updateProfile('frequency', v)}
          onTrainingPhaseChange={(v) => updateProfile('trainingPhase', v)}
          genderSectionRef={genderSectionRef}
        />

        {/* Step 2: Performance Input */}
        <PerformanceInput
          distance={distance}
          time={time}
          onDistanceChange={setDistance}
          onTimeChange={updateTime}
          distanceSelectRef={distanceSelectRef}
          timeInputRef={timeInputRef}
        />

        {/* Step 3: Special Conditions */}
        <SpecialConditions
          conditions={conditions}
          onConditionChange={updateCondition}
        />

        {/* Calculate Button */}
        <div className="mb-10">
          <button
            type="button"
            onClick={handleCalculate}
            className="h-14 w-full rounded-sm bg-ink text-base font-semibold text-bg transition-colors hover:bg-ink-2"
          >
            훈련 계획 생성
          </button>
          <p className="mt-2 text-center text-caption text-ink-4">
            입력값은 저장되지 않아요. 계산 결과는 참고용이에요.
          </p>
        </div>

        {/* Results Section */}
        {results && (
          <div ref={resultsRef}>
            {/* VDOT Score */}
            <VdotScoreCard
              vdot={results.displayVdot}
              performanceLevel={results.performanceLevel}
              vo2max={results.vo2max}
              adjustmentNote={results.adjustmentNote}
            />

            {/* Training Zones */}
            <TrainingZones paces={results.paces} />

            {/* Weekly Plan */}
            <WeeklyPlanView plan={results.weeklyPlan} />

            {/* Mesocycle Plan */}
            <MesocycleView plan={results.mesocycle} />

            {/* Workout Details */}
            <WorkoutDetailsView workouts={results.workouts} />

            {/* Recommendations */}
            <RecommendationsView recommendations={results.recommendations} />
          </div>
        )}

        {/* 훈련 일지 라이트 — TRAINORACLE 맛보기 */}
        <TrainingLogLite />

      </div>
    </div>
  );
};

export default TrainingCalculatorPage;
