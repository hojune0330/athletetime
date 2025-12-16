import React from 'react';
import type { DayPlan } from '../utils/trainingPlans';

interface WeeklyPlanViewProps {
  plan: DayPlan[];
}

const intensityStyles: Record<string, string> = {
  low: 'border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 to-transparent',
  medium: 'border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent',
  high: 'border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-transparent',
  rest: 'border-l-4 border-gray-400 bg-gradient-to-r from-gray-50 to-transparent',
};

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({ plan }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">주간 마이크로사이클 (7일)</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {plan.map((day, index) => (
          <div
            key={index}
            className={`${intensityStyles[day.intensity]} p-3 rounded-lg`}
          >
            <div className="font-bold text-center mb-1">{day.day}</div>
            <div className="text-sm font-semibold whitespace-pre-line">{day.type}</div>
            <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">{day.duration}</div>
            <div className="text-xs text-gray-500 mt-1">{day.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
