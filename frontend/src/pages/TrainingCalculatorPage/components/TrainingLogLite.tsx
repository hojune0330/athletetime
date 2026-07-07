import React, { useEffect, useMemo, useState } from 'react';

/**
 * 훈련 일지 라이트 — TRAINORACLE 맛보기
 *
 * 계산기에서 훈련 계획을 만든 김에, 오늘 훈련을 한 줄로 남기게 한다.
 * - localStorage 저장 (기기 단위, 가입 없이 바로 씀)
 * - 최근 기록으로 이번 주 요약(횟수/거리/컨디션 흐름)을 보여줘 "쌓이는 재미"를 준다
 * - TRAINORACLE(훈련 분석·코칭 도구)로 발전 예정임을 알리는 기대감 카드 포함
 *
 * 디자인: TRAINORACLE Scientific Minimalism — 각진 모서리, hairline,
 * 모노 숫자, 색은 정보 전달용으로만.
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

const inputClass =
  'h-11 rounded-sm border border-line bg-surface px-3 text-body-sm text-ink transition-colors focus:border-ink focus:outline-none';

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
    <section className="mt-10 rounded-sm border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-ink-4">
            TRAINING LOG · LITE
          </p>
          <h2 className="mt-1 text-h3 font-semibold tracking-tight text-ink">오늘 훈련, 한 줄로 남겨두세요</h2>
          <p className="mt-1 text-body-sm text-ink-3">
            이 기기에만 저장돼요. 꾸준히 쌓이면 내 훈련 흐름이 보여요.
          </p>
        </div>
        {entries.length > 0 && (
          <div className="mt-3 flex divide-x divide-hair border-y border-ink sm:mt-0">
            <MiniStat label="최근 7일 훈련" value={`${weekSummary.count}`} unit="회" />
            {weekSummary.totalKm > 0 && (
              <MiniStat label="달린 거리" value={weekSummary.totalKm.toFixed(1)} unit="km" />
            )}
            {weekSummary.count > 0 && (
              <MiniStat label="컨디션" value={FEEL_LABELS[Math.round(weekSummary.avgFeel)] || '보통'} />
            )}
          </div>
        )}
      </div>

      {/* 입력 줄 */}
      <div className="mt-5 grid gap-2 sm:grid-cols-[auto_110px_1fr_auto]">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          aria-label="훈련 종류"
          className={inputClass}
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
          className={`${inputClass} font-mono [font-variant-numeric:tabular-nums]`}
        />
        <input
          type="text"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="메모 (예: 400m×8 78초, 마지막 2개 힘듦)"
          aria-label="훈련 메모"
          maxLength={120}
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleSave}
          className="h-11 rounded-sm bg-ink px-6 text-body-sm font-semibold text-bg transition-colors hover:bg-ink-2"
        >
          {savedFlash ? '저장됨' : '기록'}
        </button>
      </div>

      {/* 컨디션 선택 */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[10px] font-medium uppercase tracking-widest-2 text-ink-4">RPE</span>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={feel === value}
            onClick={() => setFeel(value as 1 | 2 | 3 | 4 | 5)}
            className={`rounded-sm border px-3 py-1.5 text-caption font-medium transition-colors ${
              feel === value
                ? 'border-ink bg-ink text-bg'
                : 'border-line bg-surface text-ink-2 hover:border-line-2'
            }`}
          >
            {FEEL_LABELS[value]}
          </button>
        ))}
      </div>

      {/* 최근 일지 */}
      {entries.length > 0 && (
        <div className="mt-5 border-t border-ink">
          {entries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 border-b border-hair px-1 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5 text-body-sm">
                <span className="shrink-0 font-mono text-[11px] text-ink-4 [font-variant-numeric:tabular-nums]">
                  {entry.date.slice(5)}
                </span>
                <span className="shrink-0 font-semibold text-ink">{entry.kind}</span>
                {entry.distanceKm !== null && (
                  <span className="shrink-0 font-mono text-[11px] text-ink-2 [font-variant-numeric:tabular-nums]">
                    {entry.distanceKm}km
                  </span>
                )}
                {entry.memo && <span className="truncate text-caption text-ink-3">{entry.memo}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-caption text-ink-4">{FEEL_LABELS[entry.feel]}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  aria-label="이 일지 삭제"
                  className="text-caption text-ink-4 underline underline-offset-2 transition-colors hover:text-err"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TRAINORACLE 기대감 카드 */}
      <div className="mt-6 border-l-2 border-brand bg-surface-2 p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-brand">
          TRAINORACLE · COMING
        </p>
        <p className="mt-1.5 text-body-sm font-semibold text-ink">이 일지가 나중에 코치가 됩니다</p>
        <p className="mt-1 text-body-sm leading-relaxed text-ink-2">
          지금 쌓는 훈련 일지와 계산기 데이터는 앞으로 나올 <strong className="text-ink">트레인오라클(TRAINORACLE)</strong>에서
          훈련 부하 흐름, 회복 리듬, 다음 목표 페이스 제안까지 이어질 준비 과정이에요.
          꾸준히 남길수록 내 몸에 맞는 분석이 가능해져요.
        </p>
      </div>
    </section>
  );
};

function MiniStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="px-3.5 py-2 first:pl-0 sm:px-4">
      <p className="font-mono text-[9px] font-medium uppercase tracking-widest-2 text-ink-4">{label}</p>
      <p className="mt-0.5 font-mono text-[15px] font-medium text-ink [font-variant-numeric:tabular-nums]">
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-normal text-ink-3">{unit}</span>}
      </p>
    </div>
  );
}

export default TrainingLogLite;
