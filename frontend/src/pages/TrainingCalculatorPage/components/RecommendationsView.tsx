import React from 'react';

export const RecommendationsView: React.FC = () => {
  return (
    <div className="mb-8">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h3 className="text-h3 font-semibold tracking-tight text-ink">훈련 전 확인</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest-2 text-ink-4">CHECK</span>
      </div>
      <div className="border border-line bg-surface p-5 text-body-sm leading-relaxed text-ink-2">
        <p>계산 결과는 기준 기록으로 만든 훈련 참고용 예시예요.</p>
        <p className="mt-2">통증이나 건강 상태가 걱정되면 의료·재활 전문가와 상담하세요. 계산 결과는 의료 조언이 아니에요.</p>
      </div>
    </div>
  );
};
