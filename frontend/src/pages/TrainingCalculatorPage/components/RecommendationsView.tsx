import React from 'react';
import type { Recommendation } from '../utils/trainingPlans';

interface RecommendationsViewProps {
  recommendations: Recommendation[];
}

/**
 * 훈련 시 참고사항 — 저채도 텍스트 리스트.
 * 아이콘·배경 장식 없이 hairline 분리 + 대시 불릿.
 */
export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ recommendations }) => {
  return (
    <div className="mb-8">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h3 className="text-h3 font-semibold tracking-tight text-ink">훈련 시 참고사항</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">NOTES</span>
      </div>

      <div className="grid border border-line bg-surface md:grid-cols-2">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={`p-5 ${index % 2 === 1 ? 'md:border-l md:border-hair' : ''} ${
              index >= 2 ? 'border-t border-hair' : index === 1 ? 'max-md:border-t max-md:border-hair' : ''
            }`}
          >
            <h4 className="text-body-sm font-semibold text-ink">{rec.title}</h4>
            <ul className="mt-2 space-y-1.5">
              {rec.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-body-sm leading-relaxed text-ink-2">
                  <span className="mt-[9px] h-px w-2.5 shrink-0 bg-ink-4" aria-hidden />
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
