import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { getCompetitionsCurrent, type Competition } from '../api/competitions';
import { HomeFirstUseActions } from '../components/home/HomeFirstUseActions';
import {
  HomeShortcutSettings,
  type HomeShortcut,
} from '../components/home/HomeShortcutSettings';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useRecordWorkspaceStore } from '../features/record-workspace/useRecordWorkspaceStore';
import type { RecordWorkspace } from '../features/record-workspace/storage';
import { cn } from '../lib/utils';
import { buildFirstUseActions } from './homeFirstUse';

const SHORTCUT_STORAGE_KEY = 'athletetime.home.shortcuts';
const DEFAULT_SHORTCUT_IDS = ['today', 'records', 'calendar'] as const;

const shortcutOptions = [
  { id: 'today', label: '오늘 경기', description: '결과와 현장 소식', to: '/competitions?tab=results' },
  { id: 'records', label: '선수 기록', description: '이름과 소속 검색', to: '/records' },
  { id: 'calendar', label: '연간 일정', description: '다가오는 대회', to: '/competitions' },
  { id: 'data-source', label: '자료 수집 방식', description: '기록을 모은 방법', to: '/about-data' },
  { id: 'card', label: '기록 카드', description: '공유용 카드 만들기', to: '/profile-card' },
] as const satisfies readonly HomeShortcut[];

function readShortcutIds(): readonly string[] {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUT_IDS;

  try {
    const saved = window.localStorage.getItem(SHORTCUT_STORAGE_KEY);
    const parsed: unknown = saved === null ? DEFAULT_SHORTCUT_IDS : JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : DEFAULT_SHORTCUT_IDS;
  } catch (error) {
    if (error instanceof DOMException || error instanceof SyntaxError) return DEFAULT_SHORTCUT_IDS;
    throw error;
  }
}

function formatDdayBadge(text: string): string {
  const liveMatch = /^DAY\s+(\d+)$/i.exec(text.trim());
  return liveMatch ? `${liveMatch[1]}일째` : text;
}

function getLatestWorkspace(workspaces: readonly RecordWorkspace[]): RecordWorkspace | null {
  return workspaces.reduce<RecordWorkspace | null>(
    (latest, workspace) => latest === null || workspace.updatedAt > latest.updatedAt ? workspace : latest,
    null,
  );
}

export default function MainPage() {
  const navigate = useNavigate();
  const { workspaces } = useRecordWorkspaceStore();
  const [query, setQuery] = useState('');
  const [shortcutIds, setShortcutIds] = useState<readonly string[]>(readShortcutIds);
  const [liveComps, setLiveComps] = useState<readonly Competition[]>([]);
  const [nextComp, setNextComp] = useState<Competition | null>(null);

  useEffect(() => {
    let active = true;
    void getCompetitionsCurrent()
      .then((data) => {
        if (!active) return;
        setLiveComps(data.live ?? []);
        setNextComp(data.next ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) return;
        throw error;
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(shortcutIds));
    } catch (error) {
      if (error instanceof DOMException) return;
      throw error;
    }
  }, [shortcutIds]);

  const featuredComps = (liveComps.length > 0 ? liveComps : nextComp === null ? [] : [nextComp]).slice(0, 3);
  const firstUseActions = buildFirstUseActions(getLatestWorkspace(workspaces));

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed.length > 0 ? `/records?q=${encodeURIComponent(trimmed)}` : '/records');
  };

  const toggleShortcut = (shortcutId: string) => {
    setShortcutIds((current) => current.includes(shortcutId)
      ? current.filter((id) => id !== shortcutId)
      : [...current, shortcutId]);
  };

  return (
    <main className="min-h-screen bg-bg text-ink">
      <section className="mx-auto max-w-frame px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-14 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-body-sm font-medium text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              공개 경기 기록을 이름으로 찾는 곳
            </p>
            <h1 className="mt-5 text-h1 font-medium text-ink">
              내 기록, 이름만 알면 찾아요.
              <span className="block text-brand">동명이인이면 소속을 보고 직접 고를 수 있어요.</span>
            </h1>
            <form onSubmit={handleSearch} className="mt-8">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative flex-1">
                  <span className="sr-only">기록 검색</span>
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-4" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="이름 또는 소속(학교·팀)을 입력하세요"
                    className="h-12 rounded-md pl-11 pr-4 text-body-lg"
                  />
                </label>
                <Button type="submit" size="lg" className="h-12 px-7">검색</Button>
              </div>
            </form>
            <p className="mt-5 text-body-sm leading-relaxed text-ink-4">
              AthleteTime이 모은 공개 기록이에요. 공식 기록 서비스는 아니에요.{' '}
              <Link to="/about-data" className="font-medium text-brand underline-offset-2 hover:underline">어떻게 모았는지 보기</Link>
              {' · '}
              <Link to="/data-request" className="font-medium text-brand underline-offset-2 hover:underline">기록 정정·숨김 요청</Link>
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-hair px-5 py-4">
              <h2 className="text-h3 font-semibold tracking-tight text-ink">
                {featuredComps.length > 0 ? liveComps.length > 0 ? '지금 열리는 대회' : '다가오는 대회' : '대회 일정'}
              </h2>
              <Link to="/competitions" className="text-body-sm font-medium text-ink-2 underline underline-offset-[3px] hover:text-ink">전체 일정</Link>
            </div>
            {featuredComps.length > 0 ? (
              <div className="divide-y divide-hair">
                {featuredComps.map((competition) => (
                  <Link
                    key={`${competition.id}-${competition.kaafSeq ?? competition.start_date}`}
                    to={competition.status === 'finished' ? '/competitions?tab=results' : '/competitions'}
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2"
                  >
                    {competition.dday && (
                      <span className={cn('shrink-0 rounded-md px-2.5 py-1 text-body-sm font-semibold', competition.dday.isLive ? 'bg-ok/15 text-ok' : 'bg-brand/10 text-brand')}>
                        {formatDdayBadge(competition.dday.text)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{competition.shortName || competition.name}</span>
                      <span className="mt-0.5 block truncate text-body-sm text-ink-3">{competition.periodLabel || ''}{competition.location ? ` · ${competition.location}` : ''}</span>
                    </span>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-4" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-body-sm text-ink-3">확인된 다음 대회가 아직 없어요. 전체 일정을 확인해 주세요.</div>
            )}
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-frame space-y-5 px-4 pb-16 sm:px-6 lg:px-8">
        <HomeFirstUseActions actions={firstUseActions} />
        <HomeShortcutSettings
          selectedIds={shortcutIds}
          shortcuts={shortcutOptions}
          onToggle={toggleShortcut}
        />
      </section>
    </main>
  );
}
