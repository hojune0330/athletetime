import { useCallback, useEffect, useState } from 'react';

/**
 * 비교 트레이 — "비교에 담기"로 선수를 모아두는 상태 (localStorage 유지).
 *
 * 결정(2026-06-12):
 * - 1:다수 비교, 보수적 상한 = 최대 4명. (트레이 담기도 4로 캡)
 * - 세션을 넘어 담아둘 수 있게 localStorage 사용.
 * - 동명이인 가능성은 비교 화면/카드에서 고지(여기선 식별만 저장).
 */

export const COMPARE_MAX = 4;
const STORAGE_KEY = 'athletetime.compareTray.v1';

export type CompareEntry = {
  athleteKey: string;
  name: string;
  team: string;
};

function readStorage(): CompareEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.athleteKey === 'string' && e.athleteKey)
      .slice(0, COMPARE_MAX)
      .map((e) => ({
        athleteKey: String(e.athleteKey),
        name: String(e.name || ''),
        team: String(e.team || ''),
      }));
  } catch {
    return [];
  }
}

function writeStorage(entries: CompareEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full / disabled — ignore, in-memory state still works */
  }
}

const EVENT = 'athletetime:compareTray:changed';

export function useCompareTray() {
  const [entries, setEntries] = useState<CompareEntry[]>(() => readStorage());

  // 같은 탭 내 여러 컴포넌트(카드/트레이) 동기화 + 다른 탭 storage 이벤트 동기화.
  useEffect(() => {
    const sync = () => setEntries(readStorage());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const commit = useCallback((next: CompareEntry[]) => {
    writeStorage(next);
    setEntries(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENT));
    }
  }, []);

  const isInTray = useCallback(
    (athleteKey: string) => entries.some((e) => e.athleteKey === athleteKey),
    [entries],
  );

  const isFull = entries.length >= COMPARE_MAX;

  const add = useCallback(
    (entry: CompareEntry): { ok: boolean; reason?: 'full' | 'exists' } => {
      const current = readStorage();
      if (current.some((e) => e.athleteKey === entry.athleteKey)) {
        return { ok: false, reason: 'exists' };
      }
      if (current.length >= COMPARE_MAX) {
        return { ok: false, reason: 'full' };
      }
      commit([...current, entry]);
      return { ok: true };
    },
    [commit],
  );

  const remove = useCallback(
    (athleteKey: string) => {
      const current = readStorage().filter((e) => e.athleteKey !== athleteKey);
      commit(current);
    },
    [commit],
  );

  const toggle = useCallback(
    (entry: CompareEntry) => {
      if (readStorage().some((e) => e.athleteKey === entry.athleteKey)) {
        remove(entry.athleteKey);
        return { ok: true, removed: true } as const;
      }
      const res = add(entry);
      return { ...res, removed: false } as const;
    },
    [add, remove],
  );

  const clear = useCallback(() => commit([]), [commit]);

  return { entries, count: entries.length, isFull, isInTray, add, remove, toggle, clear };
}
