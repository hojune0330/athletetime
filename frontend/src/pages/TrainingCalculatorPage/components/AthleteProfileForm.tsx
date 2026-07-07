import React from 'react';
import type {
  Gender,
  AgeGroup,
  Experience,
  WeeklyVolume,
  TrainingFrequency,
  TrainingPhase
} from '../utils/adjustments';
import {
  AGE_GROUP_OPTIONS,
  EXPERIENCE_OPTIONS,
  WEEKLY_VOLUME_OPTIONS,
  FREQUENCY_OPTIONS,
  TRAINING_PHASE_OPTIONS
} from '../utils/adjustments';
import { CalcSection, FieldLabel, selectClass } from './CalcSection';

interface AthleteProfileFormProps {
  gender: Gender | null;
  ageGroup: AgeGroup;
  experience: Experience;
  weeklyVolume: WeeklyVolume;
  frequency: TrainingFrequency;
  trainingPhase: TrainingPhase;
  onGenderChange: (gender: Gender) => void;
  onAgeGroupChange: (value: AgeGroup) => void;
  onExperienceChange: (value: Experience) => void;
  onWeeklyVolumeChange: (value: WeeklyVolume) => void;
  onFrequencyChange: (value: TrainingFrequency) => void;
  onTrainingPhaseChange: (value: TrainingPhase) => void;
  genderSectionRef?: React.RefObject<HTMLDivElement | null>;
}

export const AthleteProfileForm: React.FC<AthleteProfileFormProps> = ({
  gender,
  ageGroup,
  experience,
  weeklyVolume,
  frequency,
  trainingPhase,
  onGenderChange,
  onAgeGroupChange,
  onExperienceChange,
  onWeeklyVolumeChange,
  onFrequencyChange,
  onTrainingPhaseChange,
  genderSectionRef,
}) => {
  return (
    <CalcSection step="01" title="선수 프로필" hint="맞춤 조정에 쓰여요">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-3">
        {/* 성별 — 세그먼트 토글 */}
        <div ref={genderSectionRef}>
          <FieldLabel>성별</FieldLabel>
          <div className="inline-flex w-full rounded-sm border border-line" role="group" aria-label="성별 선택">
            {([
              { value: 'male' as Gender, label: '남성' },
              { value: 'female' as Gender, label: '여성' },
            ]).map((option, index) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={gender === option.value}
                onClick={() => onGenderChange(option.value)}
                className={`h-11 flex-1 text-body-sm font-medium transition-colors ${
                  index > 0 ? 'border-l border-line' : ''
                } ${
                  gender === option.value
                    ? 'bg-ink text-bg'
                    : 'bg-surface text-ink-2 hover:bg-surface-2'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="calc-age-group">연령대</FieldLabel>
          <select
            id="calc-age-group"
            value={ageGroup}
            onChange={(e) => onAgeGroupChange(e.target.value as AgeGroup)}
            className={selectClass}
          >
            {AGE_GROUP_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="calc-experience">경력</FieldLabel>
          <select
            id="calc-experience"
            value={experience}
            onChange={(e) => onExperienceChange(e.target.value as Experience)}
            className={selectClass}
          >
            {EXPERIENCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="calc-weekly-volume">주간 훈련량</FieldLabel>
          <select
            id="calc-weekly-volume"
            value={weeklyVolume}
            onChange={(e) => onWeeklyVolumeChange(e.target.value as WeeklyVolume)}
            className={selectClass}
          >
            {WEEKLY_VOLUME_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="calc-frequency">훈련 빈도</FieldLabel>
          <select
            id="calc-frequency"
            value={frequency}
            onChange={(e) => onFrequencyChange(e.target.value as TrainingFrequency)}
            className={selectClass}
          >
            {FREQUENCY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="calc-phase">현재 훈련 단계</FieldLabel>
          <select
            id="calc-phase"
            value={trainingPhase}
            onChange={(e) => onTrainingPhaseChange(e.target.value as TrainingPhase)}
            className={selectClass}
          >
            {TRAINING_PHASE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </CalcSection>
  );
};
