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
    <div>
      <div>
        {/* Header */}
        <PageHeader
          title="전문 훈련 페이스 계산기"
          icon="🏋️"
          description="과학적 데이터 기반 개인 맞춤형 훈련 계획"
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
        />

        {/* Step 3: Special Conditions */}
        <SpecialConditions
          conditions={conditions}
          onConditionChange={updateCondition}
        />

        {/* Calculate Button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition hover:scale-[1.01] text-lg"
          >
            <i className="fas fa-calculator mr-2" />
            훈련 계획 생성
          </button>
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

      </div>
    </div>
  );
};

export default TrainingCalculatorPage;
