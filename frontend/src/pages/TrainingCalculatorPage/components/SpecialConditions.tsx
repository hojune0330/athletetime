import React from 'react';
import type { Conditions } from '../utils/adjustments';
import { CONDITION_OPTIONS } from '../utils/adjustments';

interface SpecialConditionsProps {
  conditions: Conditions;
  onConditionChange: (key: keyof Conditions, value: boolean) => void;
}

export const SpecialConditions: React.FC<SpecialConditionsProps> = ({
  conditions,
  onConditionChange,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <span className="bg-purple-100 text-purple-600 w-10 h-10 rounded-full flex items-center justify-center mr-3 text-lg">
          3
        </span>
        특별 고려사항 (선택)
      </h2>
      
      <div className="grid md:grid-cols-3 gap-4">
        {CONDITION_OPTIONS.map(option => (
          <label
            key={option.id}
            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={conditions[option.id as keyof Conditions]}
              onChange={(e) => onConditionChange(option.id as keyof Conditions, e.target.checked)}
              className="mr-3 w-5 h-5 accent-purple-600"
            />
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-gray-600">{option.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
