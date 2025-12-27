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
import PageHeader from '../../components/common/PageHeader';
import './styles/training-calculator.css';

const TrainingCalculatorPage: React.FC = () => {
  const resultsRef = useRef<HTMLDivElement>(null);
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
    const success = calculate();
    if (success && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <PageHeader
          title="전문 훈련 페이스 계산기"
          icon="🏋️"
          description="과학적 데이터 기반 개인 맞춤형 훈련 계획"
          backTo="/"
          backText="홈으로"
        />

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <i className="fas fa-exclamation-circle mr-2" />
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
        />

        {/* Step 2: Performance Input */}
        <PerformanceInput
          distance={distance}
          time={time}
          onDistanceChange={setDistance}
          onTimeChange={updateTime}
          onCalculate={handleCalculate}
        />

        {/* Step 3: Special Conditions */}
        <SpecialConditions
          conditions={conditions}
          onConditionChange={updateCondition}
        />

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

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">제작자: 장호준 코치</p>
          <p className="text-xs mt-1">© 2024 Athlete Time - 과학적 훈련의 시작</p>
        </div>
      </div>
    </div>
  );
};

export default TrainingCalculatorPage;
