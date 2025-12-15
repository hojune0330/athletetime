import React from 'react';
import { Recommendation } from '../utils/trainingPlans';

interface RecommendationsViewProps {
  recommendations: Recommendation[];
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ recommendations }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">전문가 권장사항</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        {recommendations.map((rec, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-bold mb-2 text-purple-700">
              <i className="fas fa-check-circle mr-2" />
              {rec.title}
            </h4>
            <ul className="text-sm space-y-1">
              {rec.items.map((item, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
