import React from 'react';
import type { Conditions } from '../utils/adjustments';
import { CONDITION_OPTIONS } from '../utils/adjustments';
import { CalcSection } from './CalcSection';

interface SpecialConditionsProps {
  conditions: Conditions;
  onConditionChange: (key: keyof Conditions, value: boolean) => void;
}

export const SpecialConditions: React.FC<SpecialConditionsProps> = ({
  conditions,
  onConditionChange,
}) => {
  return (
    <CalcSection step="03" title="특별 고려사항" hint="해당하는 항목만 선택 (선택)">
      <div className="grid gap-2 md:grid-cols-3">
        {CONDITION_OPTIONS.map(option => {
          const checked = conditions[option.id as keyof Conditions];
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition-colors ${
                checked
                  ? 'border-ink bg-surface-2'
                  : 'border-line bg-surface hover:border-line-2'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onConditionChange(option.id as keyof Conditions, e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
              />
              <span className="min-w-0">
                <span className="block text-body-sm font-medium text-ink">{option.label}</span>
                <span className="mt-0.5 block text-caption text-ink-3">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </CalcSection>
  );
};
