/**
 * DataNotice — 데이터 출처/면책 + 정정·삭제 요청 안내 컴포넌트 (TRAINORACLE)
 *
 * 법적 방어 설계(Notice & Graduated Takedown)의 1·2층(사전 고지·검증 가능성)을
 * 담당하는 재사용 컴포넌트. 두 가지 형태를 제공합니다.
 *
 *  - <DataNoticeBar />   : 검색/기록 화면 상단의 1줄 고지 배너
 *                          (공개 자료 기반 + 정정/삭제 요청 링크)
 *  - <DataNoticeBlock /> : 푸터 등에 들어가는 짧은 신뢰 안내
 *
 * 디자인: 각진 모서리, hairline 보더, 무그라데이션, 딥틸 액센트.
 */

import { Link } from 'react-router-dom';
import { CORRECTION_POLICY, TRUST_NOTICE } from '../../config/dataPolicy';

/** 데이터 요청 페이지 경로 (정정/삭제/이의제기) */
export const DATA_REQUEST_PATH = CORRECTION_POLICY.requestPath;

/**
 * 화면 상단 1줄 고지 배너.
 * 대회 결과/선수 기록/검색 화면 등 개인 식별 정보가 노출되는 화면 상단에 배치.
 */
export function DataNoticeBar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-col gap-1.5 border border-hair bg-surface-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${className}`}
      role="note"
    >
      <p className="text-caption text-ink-3">
        <span className="mr-1.5 font-mono text-mono-xs uppercase tracking-widest-2 text-brand-500">
          NOTICE
        </span>
        {TRUST_NOTICE.collectedPublic}
      </p>
      <Link
        to={DATA_REQUEST_PATH}
        className="shrink-0 text-caption font-medium text-brand-500 underline-offset-2 hover:underline"
      >
        정보 정정·비노출 요청 →
      </Link>
    </div>
  );
}

/**
 * 짧은 신뢰 안내 (푸터용).
 */
export function DataNoticeBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2 text-caption text-ink-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p>
        {TRUST_NOTICE.collectedPublic}
      </p>
      <p>
        <Link
          to={DATA_REQUEST_PATH}
          className="font-medium text-brand-500 underline-offset-2 hover:underline"
        >
          정정·비노출 요청
        </Link>
        이 필요하면 여기서 접수할 수 있어요.
      </p>
    </div>
  );
}

export default DataNoticeBar;
