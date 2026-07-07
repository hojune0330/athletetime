import { useCallback, useEffect, useState } from 'react';

/**
 * "내 기록 지정" — 검색한 기록 묶음을 누르는 즉시 내 기록으로 합쳐 보여준다.
 *
 * v2: 여러 athleteKey를 함께 지정할 수 있다 (동명이인/소속 분리 기록 원탭 합산).
 * - 누르면 바로 합쳐지고, 다시 누르면 바로 빠진다. 확인 절차 없음.
 * - localStorage 유지 (기기 단위). 로그인 계정 연동은 서버 프로필 확장 시 이관 예정.
 * - 지정은 사용자가 직접 누른 것만. 자동 매칭/추정 지정은 하지 않는다 (신뢰 원칙).
 * - 합산은 화면 표시용이며 서버 데이터는 바꾸지 않는다.
 */

const STORAGE_KEY = 'athletetime.my-athlete.v2';
const LEGACY_STORAGE_KEY = 'athletetime.my-athlete.v1';
const MAX_ENTRIES = 6;

export type MyAthleteEntry = {
  athleteKey: string;
  name: string;
  team: string;
  savedAt: string;
};

function sanitize(list: unknown): MyAthleteEntry[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is MyAthleteEntry =>
      Boolean(item && typeof (item as MyAthleteEntry).athleteKey === 'string' && (item as MyAthleteEntry).athleteKey),
    )
    .slice(0, MAX_ENTRIES);
}

function readStored(): MyAthleteEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
    // v1(단일 지정) → v2(다중 지정) 마이그레이션
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed && typeof parsed.athleteKey === 'string' && parsed.athleteKey) {
        const migrated = [parsed as MyAthleteEntry];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migrated;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function writeStored(entries: MyAthleteEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // storage 불가 환경에서도 세션 내에서는 동작
  }
}

export function useMyAthlete() {
  const [entries, setEntries] = useState<MyAthleteEntry[]>([]);

  useEffect(() => {
    setEntries(readStored());
  }, []);

  const isMine = useCallback(
    (athleteKey: string) => entries.some((entry) => entry.athleteKey === athleteKey),
    [entries],
  );

  /** 원탭 추가 — 이미 있으면 그대로 둔다 */
  const add = useCallback((athlete: { athleteKey: string; name: string; team: string }) => {
    setEntries((prev) => {
      if (prev.some((entry) => entry.athleteKey === athlete.athleteKey)) return prev;
      const next = [...prev, { ...athlete, savedAt: new Date().toISOString() }].slice(0, MAX_ENTRIES);
      writeStored(next);
      return next;
    });
  }, []);

  /** 여러 개를 한 번에 추가 (예: 추정 묶음 전부 합치기) */
  const addMany = useCallback((athletes: Array<{ athleteKey: string; name: string; team: string }>) => {
    setEntries((prev) => {
      const seen = new Set(prev.map((entry) => entry.athleteKey));
      const now = new Date().toISOString();
      const additions = athletes
        .filter((athlete) => athlete.athleteKey && !seen.has(athlete.athleteKey))
        .map((athlete) => ({ ...athlete, savedAt: now }));
      if (additions.length === 0) return prev;
      const next = [...prev, ...additions].slice(0, MAX_ENTRIES);
      writeStored(next);
      return next;
    });
  }, []);

  /** 원탭 제거 */
  const remove = useCallback((athleteKey: string) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.athleteKey !== athleteKey);
      writeStored(next);
      return next;
    });
  }, []);

  /** 누르면 바로 합쳐지고, 다시 누르면 바로 빠진다 */
  const toggle = useCallback((athlete: { athleteKey: string; name: string; team: string }) => {
    setEntries((prev) => {
      const exists = prev.some((entry) => entry.athleteKey === athlete.athleteKey);
      const next = exists
        ? prev.filter((entry) => entry.athleteKey !== athlete.athleteKey)
        : [...prev, { ...athlete, savedAt: new Date().toISOString() }].slice(0, MAX_ENTRIES);
      writeStored(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setEntries([]);
  }, []);

  return { entries, isMine, add, addMany, remove, toggle, clear };
}
