import { useState } from 'react';
import { useFavorites, useSplitCalculator, type SavedPacePlan } from '../hooks/usePaceCalculator';
import { SplitPlannerInput } from './SplitPlannerInput';
import { SplitPlannerResults } from './SplitPlannerResults';
import { SplitPlannerSavedPlans } from './SplitPlannerSavedPlans';

export function SplitCalculator() {
  const {
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
    hasValidInput,
    averagePaceFormatted,
    speedKmh,
    targetTimeSeconds,
    splits,
    calculate,
    reset,
  } = useSplitCalculator();
  const { favorites, saveFavorite, deleteFavorite } = useFavorites();
  const [validationError, setValidationError] = useState('');

  const clearError = () => setValidationError('');

  const handleCalculate = () => {
    if (calculate()) {
      clearError();
      return;
    }
    setValidationError('목표 거리와 완주 시간을 0보다 크게 입력해 주세요.');
  };

  const handleSave = (name: string) => {
    if (!hasValidInput) {
      setValidationError('목표 거리와 완주 시간을 먼저 입력해 주세요.');
      return;
    }
    saveFavorite(name, distance, targetTimeSeconds, strategy);
  };

  const applySavedPlan = (plan: SavedPacePlan) => {
    setDistance(plan.distance);
    setHours(Math.floor(plan.targetTime / 3600));
    setMinutes(Math.floor((plan.targetTime % 3600) / 60));
    setSeconds(plan.targetTime % 60);
    setStrategy(plan.strategy);
    clearError();
  };

  return (
    <div className="space-y-4">
      {validationError && (
        <div role="alert" className="border border-err/40 border-l-2 border-l-err bg-surface px-4 py-3 text-body-sm text-err">
          {validationError}
        </div>
      )}

      <SplitPlannerInput
        distance={distance}
        hours={hours}
        minutes={minutes}
        seconds={seconds}
        strategy={strategy}
        hasValidInput={hasValidInput}
        averagePace={averagePaceFormatted}
        speedKmh={speedKmh}
        onDistanceChange={(value) => {
          setDistance(value);
          clearError();
        }}
        onHoursChange={(value) => {
          setHours(value);
          clearError();
        }}
        onMinutesChange={(value) => {
          setMinutes(value);
          clearError();
        }}
        onSecondsChange={(value) => {
          setSeconds(value);
          clearError();
        }}
        onStrategyChange={setStrategy}
        onCalculate={handleCalculate}
      />

      <SplitPlannerSavedPlans
        plans={favorites}
        canSave={hasValidInput}
        onSave={handleSave}
        onApply={applySavedPlan}
        onDelete={deleteFavorite}
      />

      {splits ? (
        <SplitPlannerResults
          distance={distance}
          targetTimeSeconds={targetTimeSeconds}
          averagePace={averagePaceFormatted}
          speedKmh={speedKmh}
          strategy={strategy}
          splits={splits}
          onReset={reset}
        />
      ) : (
        <section className="border border-dashed border-line bg-surface p-6 text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">WAITING INPUT</p>
          <h2 className="mt-2 text-body font-semibold text-ink">목표 기록을 넣으면 구간별 계획이 보여요.</h2>
          <p className="mt-1 text-body-sm text-ink-3">거리와 완주 시간, 페이스 전략을 고른 뒤 계산해 보세요.</p>
        </section>
      )}
    </div>
  );
}

export default SplitCalculator;
