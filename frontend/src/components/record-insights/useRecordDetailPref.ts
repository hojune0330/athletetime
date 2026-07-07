import { useCallback, useState } from 'react';

/**
 * 기록 목록 상세 표시 설정 — 날짜·대회 순위·비고를 보일지 숨길지.
 *
 * - 기본은 "자세히" (순위·날짜 표시). 디자인상 복잡하면 사용자가 "간단히"로 접는다.
 * - 기기 단위 localStorage 유지 — 다음 방문에도 같은 보기 유지.
 */

const STORAGE_KEY = 'athletetime.record-detail.v1';

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'compact';
  } catch {
    return true;
  }
}

export function useRecordDetailPref() {
  const [detail, setDetail] = useState<boolean>(readStored);

  const toggle = useCallback(() => {
    setDetail((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'detail' : 'compact');
      } catch {
        // storage 불가 환경에서도 세션 내 동작
      }
      return next;
    });
  }, []);

  return { detail, toggle };
}

/** 공용 토글 버튼 라벨 */
export function detailToggleLabel(detail: boolean): string {
  return detail ? '간단히 보기' : '자세히 보기';
}
