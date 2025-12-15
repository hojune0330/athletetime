import React from 'react';
import { WeekPlan } from '../utils/trainingPlans';

interface MesocycleViewProps {
  plan: WeekPlan[];
}

export const MesocycleView: React.FC<MesocycleViewProps> = ({ plan }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">메조사이클 (4주 블록)</h3>
      
      <div className="grid md:grid-cols-4 gap-4">
        {plan.map((week, index) => (
          <div
            key={index}
            className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer hover:-translate-y-0.5"
          >
            <h4 className="font-bold text-lg mb-2">{week.week}</h4>
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">초점:</span> {week.focus}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">볼륨:</span> {week.volume}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-semibold">핵심훈련:</span> {week.keyWorkout}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
