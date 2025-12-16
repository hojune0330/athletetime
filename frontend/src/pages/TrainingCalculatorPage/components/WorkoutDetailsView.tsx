import React from 'react';
import type { Workout } from '../utils/trainingPlans';

interface WorkoutDetailsViewProps {
  workouts: Workout[];
}

export const WorkoutDetailsView: React.FC<WorkoutDetailsViewProps> = ({ workouts }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">핵심 훈련 세션</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        {workouts.map((workout, index) => (
          <div key={index} className="border rounded-lg p-4">
            <h4 className="font-bold text-lg mb-3 text-purple-700">{workout.title}</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">워밍업:</span> {workout.warmup}
              </div>
              <div>
                <span className="font-semibold">메인세트:</span> {workout.main}
              </div>
              <div>
                <span className="font-semibold">쿨다운:</span> {workout.cooldown}
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <span className="font-semibold">목표 페이스:</span> {workout.pace}
              </div>
              <div className="text-xs text-gray-600 italic">
                💡 {workout.tips}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
