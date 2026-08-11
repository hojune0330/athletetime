import React, { useEffect, useMemo, useState } from 'react';
import {
  calculate100mTime,
  calculate400mLap,
  calculatePaceFromTarget,
  calculateSpeed,
  formatPace,
  formatTime,
  STEEPLECHASE_SPECS,
} from '../utils/paceCalculations';
import { TargetPaceInputs } from './TargetPaceInputs';
import { TargetPaceResult } from './TargetPaceResult';
import type { PaceResult, SteepleSplitDetails, TimeValue, WaterJumpPlacement } from './targetPaceTypes';

const isOptionalClockValue = (value: TimeValue, max: number): boolean => (
  value === null || (Number.isInteger(value) && value >= 0 && value <= max)
);

export const TargetPaceCalculator: React.FC = () => {
  const [distance, setDistance] = useState<number>(0);
  const [customDistance, setCustomDistance] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSteeple, setIsSteeple] = useState(false);
  const [waterJump, setWaterJump] = useState<WaterJumpPlacement>('INSIDE');
  const [hours, setHours] = useState<TimeValue>(null);
  const [minutes, setMinutes] = useState<TimeValue>(null);
  const [seconds, setSeconds] = useState<TimeValue>(null);
  const [result, setResult] = useState<PaceResult | null>(null);

  const hasEnteredFinishTime = [hours, minutes, seconds].some((value) => value !== null);
  const hasValidFinishTime = hasEnteredFinishTime
    && isOptionalClockValue(hours, 12)
    && isOptionalClockValue(minutes, 59)
    && isOptionalClockValue(seconds, 59)
    && (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0) > 0;
  const hasValidDistance = Number.isFinite(distance) && distance > 0;
  const canCalculate = hasValidDistance && hasValidFinishTime;
  const validationError = !hasEnteredFinishTime || hasValidFinishTime
    ? ''
    : '완주 시간은 0보다 커야 하고, 분과 초는 0부터 59까지 입력해 주세요.';
  const targetTimeSeconds = useMemo(
    () => (hasValidFinishTime ? (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0) : 0),
    [hasValidFinishTime, hours, minutes, seconds],
  );
  const distanceKm = (distance / 1000).toFixed(3);

  useEffect(() => {
    if (!canCalculate) {
      setResult(null);
    }
  }, [canCalculate]);

  const handleDistanceSelect = (selectedDistance: number) => {
    setDistance(selectedDistance);
    setCustomDistance('');
    setIsCustom(false);
    setIsSteeple(false);
  };

  const handleSteepleSelect = () => {
    setDistance(3000);
    setCustomDistance('');
    setIsCustom(false);
    setIsSteeple(true);
  };

  const handleStartCustomDistance = () => {
    setDistance(0);
    setCustomDistance('');
    setIsCustom(true);
    setIsSteeple(false);
  };

  const handleCustomDistanceChange = (value: string) => {
    setCustomDistance(value);
    const nextDistanceKm = Number.parseFloat(value);
    setDistance(Number.isFinite(nextDistanceKm) && nextDistanceKm > 0 ? nextDistanceKm * 1000 : 0);
    setIsCustom(true);
    setIsSteeple(false);
  };

  const steepleSplits = useMemo<SteepleSplitDetails | null>(() => {
    if (!isSteeple || !result || targetTimeSeconds <= 0) return null;
    const spec = STEEPLECHASE_SPECS[waterJump];
    const pacePerMeter = targetTimeSeconds / 3000;
    const startTime = spec.startDistance * pacePerMeter;
    const lapTime = spec.lapDistance * pacePerMeter;
    const rows: Array<{ label: string; distance: number; cumulative: number }> = [
      { label: '스타트 구간', distance: spec.startDistance, cumulative: startTime },
    ];
    for (let lap = 1; lap <= 7; lap += 1) {
      rows.push({
        label: `${lap}바퀴`,
        distance: spec.startDistance + spec.lapDistance * lap,
        cumulative: startTime + lapTime * lap,
      });
    }
    return { spec, startTime, lapTime, rows };
  }, [isSteeple, result, targetTimeSeconds, waterJump]);

  const calculate = () => {
    if (!canCalculate) {
      setResult(null);
      return;
    }

    const pacePerKm = calculatePaceFromTarget(targetTimeSeconds, distance);
    setResult({
      pacePerKm: formatPace(pacePerKm),
      pace400m: formatTime(calculate400mLap(pacePerKm)),
      pace100m: formatTime(calculate100mTime(pacePerKm)),
      speedKmh: calculateSpeed(distance, targetTimeSeconds).toFixed(2),
      finishTime: formatTime(targetTimeSeconds),
    });
  };

  const reset = () => {
    setDistance(0);
    setCustomDistance('');
    setIsCustom(false);
    setIsSteeple(false);
    setWaterJump('INSIDE');
    setHours(null);
    setMinutes(null);
    setSeconds(null);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <TargetPaceInputs
        canCalculate={canCalculate}
        customDistance={customDistance}
        distance={distance}
        distanceKm={distanceKm}
        hasValidDistance={hasValidDistance}
        hours={hours}
        isCustom={isCustom}
        isSteeple={isSteeple}
        minutes={minutes}
        onCalculate={calculate}
        onCustomDistanceChange={handleCustomDistanceChange}
        onDistanceSelect={handleDistanceSelect}
        onHoursChange={setHours}
        onMinutesChange={setMinutes}
        onSecondsChange={setSeconds}
        onStartCustomDistance={handleStartCustomDistance}
        onSteepleSelect={handleSteepleSelect}
        onWaterJumpChange={setWaterJump}
        seconds={seconds}
        validationError={validationError}
        waterJump={waterJump}
      />

      {result ? (
        <TargetPaceResult
          distanceKm={distanceKm}
          isSteeple={isSteeple}
          onReset={reset}
          result={result}
          steepleSplits={steepleSplits}
          waterJump={waterJump}
        />
      ) : (
        <section className="border border-dashed border-line bg-surface p-6 text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">WAITING INPUT</p>
          <h3 className="mt-2 text-body font-semibold text-ink">목표 기록을 넣으면 바로 계산해요.</h3>
          <p className="mt-1 text-body-sm text-ink-3">거리와 목표 시간을 입력하면 계산할 수 있어요.</p>
        </section>
      )}
    </div>
  );
};

export default TargetPaceCalculator;
