import { useCallback, useEffect, useState } from 'react';

/**
 * "내 선수 지정" — 검색한 선수를 나로 지정해두면
 * 다음부터 버튼 하나로 내 기록 화면을 바로 연다.
 *
 * - localStorage 유지 (기기 단위). 로그인 계정 연동은 서버 프로필 확장 시 이관 예정.
 * - 지정은 사용자가 직접 누른 것만. 자동 매칭/추정 지정은 하지 않는다 (신뢰 원칙).
 */

const STORAGE_KEY = 'athletetime.my-athlete.v1';

export type MyAthlete = {
  athleteKey: string;
  name: string;
  team: string;
  savedAt: string;
};

function readStored(): MyAthlete | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MyAthlete;
    if (!parsed || typeof parsed.athleteKey !== 'string' || !parsed.athleteKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useMyAthlete() {
  const [myAthlete, setMyAthlete] = useState<MyAthlete | null>(null);

  useEffect(() => {
    setMyAthlete(readStored());
  }, []);

  const save = useCallback((athlete: { athleteKey: string; name: string; team: string }) => {
    const next: MyAthlete = { ...athlete, savedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage 불가 환경에서도 세션 내에서는 동작
    }
    setMyAthlete(next);
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setMyAthlete(null);
  }, []);

  return { myAthlete, save, clear };
}
