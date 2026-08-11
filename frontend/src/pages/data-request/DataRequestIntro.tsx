import { CORRECTION_POLICY } from '../../config/dataPolicy';

export function DataRequestIntro() {
  return (
    <header className="mb-6">
      <span className="text-body-sm font-semibold text-brand-500">기록 정정 요청</span>
      <h1 className="mt-1 text-h1 font-medium tracking-tighter-3 text-ink">기록을 고치거나 숨기고 싶다면</h1>
      <p className="mt-2 max-w-frame text-body-sm leading-relaxed text-ink-3">
        선수 이름과 요청 사유만 적어 주세요. 주민등록번호·사진·진단서 같은 민감한 정보는 적지 말아 주세요.
      </p>
      <details className="mt-4 border border-hair bg-surface-2 px-4 py-3 text-caption leading-relaxed text-ink-3">
        <summary className="cursor-pointer text-body-sm font-semibold text-brand-500">처리 방식 보기</summary>
        <div className="mt-3 space-y-2">
          <p>AthleteTime은 공개된 경기 결과를 모아 정리한 자료예요. 공식 기록 서비스가 아니에요.</p>
          <p>소속·대회·종목은 기억나는 내용만 적어 주세요. {CORRECTION_POLICY.slaNotice}</p>
          <p>{CORRECTION_POLICY.hideFirstNotice} 결과표에는 기록이 남지만 이름·소속 검색과 추천 화면에서는 보이지 않게 처리해요.</p>
          <p>{CORRECTION_POLICY.minorPriorityNotice}</p>
        </div>
      </details>
    </header>
  );
}
