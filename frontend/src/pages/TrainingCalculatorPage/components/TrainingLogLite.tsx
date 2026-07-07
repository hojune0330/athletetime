import React, { useEffect, useMemo, useState } from 'react';

/**
 * 훈련 일지 라이트 — TRAINORACLE 맛보기
 *
 * 계산기에서 훈련 계획을 만든 김에, 오늘 훈련을 한 줄로 남기게 한다.
 * - localStorage 저장 (기기 단위, 가입 없이 바로 씀)
 * - 최근 기록으로 이번 주 요약(횟수/거리/컨디션 흐름)을 보여줘 "쌓이는 재미"를 준다
 * - TRAINORACLE(훈련 분석·코칭 도구)로 발전 예정임을 알리는 기대감 카드 포함
 */

const STORAGE_KEY = 'athletetime.training-log.v1';
const MAX_ENTRIES = 60;

type LogEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: string;
  distanceKm: number | null;
  feel: 1 | 2 | 3 | 4 | 5;
  memo: string;
};

const KINDS = ['조깅', '인터벌', '템포런', 'LSD', '트랙 훈련', '근력/보강', '휴식'] as const;
const FEEL_LABELS: Record<number, string> = { 1: '힘들었어요', 2: '무거웠어요', 3: '보통', 4: '좋았어요', 5: '최고였어요' };

function readEntries(): LogEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: LogEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // storage 불가 환경 무시
  }
}

function todayString(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export const TrainingLogLite: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [kind, setKind] = useState<string>(KINDS[0]);
  const [distance, setDistance] = useState('');
  const [feel, setFeel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [memo, setMemo] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setEntries(readEntries());
  }, []);

  const weekSummary = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const week = entries.filter((entry) => entry.date >= cutoffStr && entry.kind !== '휴식');
    const totalKm = week.reduce((sum, entry) => sum + (entry.distanceKm || 0), 0);
    const avgFeel = week.length > 0 ? week.reduce((sum, entry) => sum + entry.feel, 0) / week.length : 0;
    return { count: week.length, totalKm, avgFeel };
  }, [entries]);

  const handleSave = () => {
    const parsedDistance = distance.trim() ? Number(distance) : null;
    const entry: LogEntry = {
      id: `${Date.now()}`,
      date: todayString(),
      kind,
      distanceKm: parsedDistance !== null && Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : null,
      feel,
      memo: memo.trim().slice(0, 120),
    };
    const next = [entry, ...entries];
    setEntries(next);
    writeEntries(next);
    setMemo('');
    setDistance('');
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleDelete = (id: string) => {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    writeEntries(next);
  };

  return (
    <section className="mt-8 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">훈련 일지 라이트</p>
          <h2 className="mt-1 text-xl font-bold text-neutral-900">오늘 훈련, 한 줄로 남겨두세요</h2>
          <p className="mt-1 text-sm text-neutral-500">
            이 기기에만 저장돼요. 꾸준히 쌓이면 내 훈련 흐름이 보여요.
          </p>
        </div>
        {entries.length > 0 && (
          <div className="mt-3 flex gap-4 sm:mt-0">
            <MiniStat label="최근 7일 훈련" value={`${weekSummary.count}회`} />
            {weekSummary.totalKm > 0 && <MiniStat label="달린 거리" value={`${weekSummary.totalKm.toFixed(1)}km`} />}
            {weekSummary.count > 0 && (
              <MiniStat label="컨디션 평균" value={FEEL_LABELS[Math.round(weekSummary.avgFeel)] || '보통'} />
            )}
          </div>
        )}
      </div>

      {/* 입력 줄 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-[auto_110px_1fr_auto]">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          aria-label="훈련 종류"
          className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
        >
          {KINDS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={distance}
          onChange={(event) => setDistance(event.target.value)}
          placeholder="km"
          aria-label="거리 (km)"
          className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
        />
        <input
          type="text"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="메모 (예: 400m×8 78초, 마지막 2개 힘듦)"
          aria-label="훈련 메모"
          maxLength={120}
          className="h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm"
        />
        <button
          type="button"
          onClick={handleSave}
          className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          {savedFlash ? '저장됨' : '기록'}
        </button>
      </div>

      {/* 컨디션 선택 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">오늘 컨디션:</span>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={feel === value}
            onClick={() => setFeel(value as 1 | 2 | 3 | 4 | 5)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              feel === value
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-emerald-300'
            }`}
          >
            {FEEL_LABELS[value]}
          </button>
        ))}
      </div>

      {/* 최근 일지 */}
      {entries.length > 0 && (
        <div className="mt-5 space-y-1.5">
          {entries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50/70 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="shrink-0 font-mono text-xs text-neutral-400">{entry.date.slice(5)}</span>
                <span className="shrink-0 font-semibold text-neutral-800">{entry.kind}</span>
                {entry.distanceKm !== null && (
                  <span className="shrink-0 font-mono text-xs text-emerald-700">{entry.distanceKm}km</span>
                )}
                {entry.memo && <span className="truncate text-xs text-neutral-500">{entry.memo}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-neutral-400">{FEEL_LABELS[entry.feel]}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  aria-label="이 일지 삭제"
                  className="text-xs text-neutral-300 transition hover:text-red-500"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TRAINORACLE 기대감 카드 */}
      <div className="mt-6 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4">
        <p className="text-sm font-bold text-emerald-800">이 일지가 나중에 코치가 됩니다</p>
        <p className="mt-1 text-sm leading-6 text-emerald-700/90">
          지금 쌓는 훈련 일지와 계산기 데이터는 앞으로 나올 <strong>트레인오라클(TRAINORACLE)</strong>에서
          훈련 부하 흐름, 회복 리듬, 다음 목표 페이스 제안까지 이어질 준비 과정이에요.
          꾸준히 남길수록 내 몸에 맞는 분석이 가능해져요.
        </p>
      </div>
    </section>
  );
};

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="font-mono text-base font-bold text-emerald-700">{value}</p>
    </div>
  );
}

export default TrainingLogLite;
