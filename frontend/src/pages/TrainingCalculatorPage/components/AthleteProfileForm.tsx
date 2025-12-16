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
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <span className="bg-purple-100 text-purple-600 w-10 h-10 rounded-full flex items-center justify-center mr-3 text-lg">
          1
        </span>
        선수 프로필 설정
      </h2>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* 기본 정보 */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-700">기본 정보</h3>
          
          {/* 성별 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">성별</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onGenderChange('male')}
                className={`p-3 border-2 rounded-lg transition text-center hover:border-purple-500 ${
                  gender === 'male' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
              >
                <i className="fas fa-mars text-blue-500 text-xl" />
                <div className="text-sm mt-1">남성</div>
              </button>
              <button
                type="button"
                onClick={() => onGenderChange('female')}
                className={`p-3 border-2 rounded-lg transition text-center hover:border-purple-500 ${
                  gender === 'female' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
              >
                <i className="fas fa-venus text-pink-500 text-xl" />
                <div className="text-sm mt-1">여성</div>
              </button>
            </div>
          </div>
          
          {/* 연령대 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">연령대</label>
            <select
              value={ageGroup}
              onChange={(e) => onAgeGroupChange(e.target.value as AgeGroup)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              {AGE_GROUP_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 훈련 수준 */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-700">훈련 수준</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">경력</label>
            <select
              value={experience}
              onChange={(e) => onExperienceChange(e.target.value as Experience)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              {EXPERIENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">주간 훈련량</label>
            <select
              value={weeklyVolume}
              onChange={(e) => onWeeklyVolumeChange(e.target.value as WeeklyVolume)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              {WEEKLY_VOLUME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 훈련 패턴 */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-700">훈련 패턴</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">훈련 빈도</label>
            <select
              value={frequency}
              onChange={(e) => onFrequencyChange(e.target.value as TrainingFrequency)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">현재 훈련 단계</label>
            <select
              value={trainingPhase}
              onChange={(e) => onTrainingPhaseChange(e.target.value as TrainingPhase)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              {TRAINING_PHASE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
