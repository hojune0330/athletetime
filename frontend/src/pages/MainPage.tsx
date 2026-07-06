import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { Button, buttonVariants } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { SectionHeader } from '../components/ui/trainoracle';
import { cn } from '../lib/utils';
import { getCompetitionsCurrent, type Competition } from '../api/competitions';

type HomeShortcut = {
  id: string;
  label: string;
  description: string;
  to: string;
};

const SHORTCUT_STORAGE_KEY = 'athletetime.home.shortcuts';
const DEFAULT_SHORTCUT_IDS = ['today', 'records', 'calendar'];

const quickSearches = [
  { label: '내 이름으로 기록 찾기', to: '/records' },
  { label: '시즌 기록표', to: '/records' },
  { label: '오늘 경기', to: '/competitions?tab=results' },
  { label: '내일 일정', to: '/competitions' },
  { label: '기록카드 만들기', to: '/profile-card' },
];

const utilityCards = [
  {
    title: '오늘',
    description: '대회 기간에는 일정과 결과 흐름을 먼저 봅니다.',
    to: '/competitions?tab=results',
    icon: ClockIcon,
  },
  {
    title: '일정',
    description: '연간 대회 일정과 다가오는 경기를 한 곳에서 확인합니다.',
    to: '/competitions',
    icon: CalendarDaysIcon,
  },
  {
    title: '기록 검색',
    description: '자기 이름을 넣고 소속과 연도를 보며 내 기록을 찾아요.',
    to: '/records',
    icon: ChartBarIcon,
  },
  {
    title: '기록 카드',
    description: '내 기록을 공유하기 좋은 이미지 카드로 만들 수 있어요.',
    to: '/profile-card',
    icon: SparklesIcon,
  },
  {
    title: '커뮤니티',
    description: '대회와 기록 이야기를 자유롭게 나누는 공간이에요.',
    to: '/community',
    icon: ChatBubbleLeftRightIcon,
  },
];

const visitModes = [
  {
    title: '대회 기간',
    summary: '시간표, 결과, 현장 흐름',
    points: ['경기 전에는 순서와 시간', '경기 중에는 공개된 결과', '경기 후에는 기록 변화'],
  },
  {
    title: '대회 전후',
    summary: '연간 일정과 출전 준비',
    points: ['다가오는 대회', '종목별 일정', '선수와 팀 검색'],
  },
  {
    title: '평소',
    summary: '기록 탐색과 이야기',
    points: ['선수 기록 비교', '흥미로운 기록 질문', '커뮤니티 토론'],
  },
];

const todayBoard: Array<[string, string]> = [
  ['대회 시간표', '대회 전후에는 일정부터 확인'],
  ['경기 결과', '공개된 결과 기준으로 조회'],
  ['내 기록 검색', '이름을 넣고 소속·연도·종목으로 확인'],
];

const recordFlowSteps: Array<[string, string]> = [
  ['자기 이름을 입력합니다', '지금 확인하고 싶은 이름으로 바로 시작합니다.'],
  ['후보를 직접 고릅니다', '동명이인이 있으면 소속·연도·종목을 보고 나에게 맞는 기록을 고릅니다.'],
  ['기록의 흐름을 봅니다', 'PB, 이번 시즌 최고, 최근 기록, 시즌 기록표로 바로 이어집니다.'],
];

const shortcutOptions: HomeShortcut[] = [
  { id: 'today', label: '오늘 경기', description: '결과와 대회 흐름', to: '/competitions?tab=results' },
  { id: 'records', label: '선수 기록', description: '이름과 소속 검색', to: '/records' },
  { id: 'calendar', label: '연간 일정', description: '다가오는 대회', to: '/competitions' },
  { id: 'community', label: '커뮤니티', description: '기록 이야기', to: '/community' },
  { id: 'card', label: '기록 카드', description: '내 기록 공유', to: '/profile-card' },
];

const operatingRules = [
  '공개된 경기 기록과 출처가 있는 정보만 보여드려요.',
  '건강, 멘탈, 성격, 부상 같은 민감한 내용은 다루지 않아요.',
  '잘못된 기록은 알려주시면 확인하고 바로잡아요.',
];

function readShortcutIds() {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUT_IDS;
  try {
    const saved = window.localStorage.getItem(SHORTCUT_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SHORTCUT_IDS;
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string');
    }
  } catch {
    return DEFAULT_SHORTCUT_IDS;
  }
  return DEFAULT_SHORTCUT_IDS;
}

/**
 * 진행 중 대회의 D-day 배지를 사람 언어로 보여준다.
 * 서버 표준은 '3일차'이며, 과거 'DAY 3' 응답이 캐시에 남아도 홈에서는 자연스럽게 보정한다.
 * 다가오는 대회 'D-8', 종료된 대회 '종료'는 한국에서 통용되는 표기라 그대로 둔다.
 */
function formatDdayBadge(text: string): string {
  const liveMatch = /^DAY\s+(\d+)$/i.exec(text.trim());
  return liveMatch ? `${liveMatch[1]}일차` : text;
}

export default function MainPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [shortcutIds, setShortcutIds] = useState<string[]>(readShortcutIds);

  // 지금 열리는/다가오는 대회 — 서버가 dday·status를 계산해 내려준다.
  // 실패하거나 데이터가 없으면 아래 정적 안내(todayBoard)로 자연스럽게 대체된다.
  const [liveComps, setLiveComps] = useState<Competition[]>([]);
  const [nextComp, setNextComp] = useState<Competition | null>(null);

  useEffect(() => {
    let active = true;
    getCompetitionsCurrent()
      .then((data) => {
        if (!active) return;
        setLiveComps(data.live || []);
        setNextComp(data.next || null);
      })
      .catch(() => {
        // 네트워크/서버 문제 시 조용히 정적 안내(todayBoard)로 폴백한다.
      });
    return () => {
      active = false;
    };
  }, []);

  // 카드에 보여줄 대회 목록(진행 중 우선, 없으면 다음 대회). 최대 3개.
  const featuredComps = (liveComps.length > 0
    ? liveComps
    : nextComp
      ? [nextComp]
      : []
  ).slice(0, 3);

  useEffect(() => {
    try {
      window.localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(shortcutIds));
    } catch {
      // Shortcut preferences are intentionally local-only and optional.
    }
  }, [shortcutIds]);

  const pinnedShortcuts = shortcutOptions.filter((shortcut) => shortcutIds.includes(shortcut.id));

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/records?q=${encodeURIComponent(trimmed)}`);
      return;
    }
    navigate('/records');
  };

  const toggleShortcut = (shortcutId: string) => {
    setShortcutIds((current) =>
      current.includes(shortcutId)
        ? current.filter((id) => id !== shortcutId)
        : [...current, shortcutId],
    );
  };

  return (
    <main className="min-h-screen bg-bg text-ink">
      <section className="mx-auto max-w-frame px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-body-sm font-medium text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              공개 육상 기록을 이름으로 찾는 곳
            </div>

            <h1 className="mt-5 text-h1 font-medium text-ink">
              내 이름으로 기록 찾기
              <span className="block text-brand">소속·연도까지 확인합니다.</span>
            </h1>

            <p className="mt-5 max-w-xl text-body-lg leading-relaxed text-ink-3">
              자기 이름을 넣으면 공개된 대회 기록을 찾아 보여드려요.
              최고 기록(PB), 이번 시즌 기록, 최근 기록까지 한 번에 볼 수 있어요.
            </p>

            <form onSubmit={handleSearch} className="mt-8">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative flex-1">
                  <span className="sr-only">통합 검색</span>
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-4" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="내 이름이나 소속(학교·팀)을 입력하세요"
                    className="h-12 rounded-md pl-11 pr-4 text-body-lg"
                  />
                </label>
                <Button type="submit" size="lg" className="h-12 px-7">
                  검색
                </Button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickSearches.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="inline-flex items-center rounded-sm border border-line bg-surface px-3 py-1.5 text-body-sm font-medium text-ink-2 transition-colors hover:border-line-2 hover:bg-surface-2 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* 첫 방문 신뢰 앵커 — 무엇을 보게 되는지를 검색 전에 한 줄로 고지한다. */}
            <p className="mt-5 text-body-sm leading-relaxed text-ink-4">
              공개된 경기결과를 모아 정리한 자료로, 공식 기록 서비스는 아니에요.{' '}
              <Link to="/about-data" className="font-medium text-brand underline-offset-2 hover:underline">
                어떻게 모았는지 보기
              </Link>
              {' · '}
              <Link to="/data-request" className="font-medium text-brand underline-offset-2 hover:underline">
                기록 정정·숨김 요청
              </Link>
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-hair px-5 py-4">
              <div>
                <h2 className="text-h3 font-semibold tracking-tight text-ink">
                  {featuredComps.length > 0
                    ? liveComps.length > 0
                      ? '지금 열리는 대회'
                      : '다가오는 대회'
                    : '오늘 볼 것'}
                </h2>
              </div>
              {featuredComps.length > 0 && (
                <Link
                  to="/competitions"
                  className="text-body-sm font-medium text-ink-2 underline underline-offset-[3px] hover:text-ink"
                >
                  전체 일정
                </Link>
              )}
            </div>

            {featuredComps.length > 0 ? (
              <div className="divide-y divide-hair">
                {featuredComps.map((comp) => (
                  <Link
                    key={`${comp.id}-${comp.kaafSeq ?? comp.start_date}`}
                    to={comp.status === 'finished' ? `/competitions?tab=results` : '/competitions'}
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2"
                  >
                    {comp.dday && (
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-body-sm font-semibold',
                          comp.dday.isLive ? 'bg-ok/15 text-ok' : 'bg-brand/10 text-brand',
                        )}
                      >
                        {formatDdayBadge(comp.dday.text)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{comp.shortName || comp.name}</p>
                      <p className="mt-0.5 truncate text-body-sm text-ink-3">
                        {comp.periodLabel || ''}
                        {comp.location ? ` · ${comp.location}` : ''}
                      </p>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-4" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-hair">
                {todayBoard.map(([title, description]) => (
                  <div key={title} className="flex items-start gap-3 px-5 py-4">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{title}</p>
                      <p className="mt-0.5 text-body-sm text-ink-3">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-hair p-4">
              <Link to="/records" className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')}>
                내 기록 찾기
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-frame px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid border-l border-t border-line md:grid-cols-2 lg:grid-cols-5">
          {utilityCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.to}
                className="group block border-b border-r border-line bg-surface p-6 transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center justify-end">
                  <Icon className="h-5 w-5 text-ink-3 transition-colors group-hover:text-brand" />
                </div>
                <h2 className="mt-6 text-h3 font-semibold tracking-tight text-ink">{card.title}</h2>
                <p className="mt-2 text-body-sm leading-relaxed text-ink-3">{card.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-body-sm font-medium text-ink-3 transition-colors group-hover:text-brand">
                  열기 <ArrowRightIcon className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-frame gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <Card>
          <CardContent className="p-6">
            <SectionHeader title="내 바로가기" />
            <h2 className="text-h3 font-semibold tracking-tight text-ink">자주 쓰는 화면만 남기기</h2>

            {user ? (
              <>
                <p className="mt-3 text-body-sm leading-relaxed text-ink-3">
                  {user.nickname}님이 자주 보는 화면을 지금 쓰는 브라우저에 저장해요.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {pinnedShortcuts.length > 0 ? (
                    pinnedShortcuts.map((shortcut) => (
                      <Link
                        key={shortcut.id}
                        to={shortcut.to}
                        className="border border-line bg-surface p-4 transition-colors hover:border-line-2 hover:bg-surface-2"
                      >
                        <p className="font-medium text-ink">{shortcut.label}</p>
                        <p className="mt-1 text-body-sm text-ink-3">{shortcut.description}</p>
                      </Link>
                    ))
                  ) : (
                    <div className="border border-dashed border-line p-4 text-body-sm text-ink-3 sm:col-span-2">
                      고정된 바로가기가 없습니다. 아래에서 하나를 선택해 보세요.
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {shortcutOptions.map((shortcut) => {
                    const selected = shortcutIds.includes(shortcut.id);
                    return (
                      <Button
                        key={shortcut.id}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleShortcut(shortcut.id)}
                      >
                        {selected ? <XMarkIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
                        {shortcut.label}
                      </Button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mt-5 border border-line bg-surface-2 p-5">
                <p className="text-body font-medium text-ink">
                  로그인 후 관심 선수와 대회를 첫 화면에 고정할 수 있습니다.
                </p>
                <p className="mt-2 text-body-sm leading-relaxed text-ink-3">
                  바로가기는 지금 쓰는 브라우저에 저장돼요.
                </p>
                <Link to="/?showLogin=true" className={cn(buttonVariants(), 'mt-4')}>
                  로그인하고 고정하기
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <SectionHeader title="기록 발견" />
            <h2 className="text-h3 font-semibold tracking-tight text-ink">내 기록을 확인하는 순서</h2>
            <p className="mt-3 text-body-sm leading-relaxed text-ink-3">
              내가 궁금한 이름을 직접 넣고, 소속과 연도를 보며 맞는 후보를 고르는 흐름입니다.
            </p>
            <div className="mt-5 divide-y divide-hair border-y border-hair">
              {recordFlowSteps.map(([title, description], index) => (
                <Link
                  key={title}
                  to="/records"
                  className="flex items-center justify-between gap-3 px-1 py-3.5 transition-colors hover:text-brand"
                >
                  <span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-body-sm font-semibold text-brand">{index + 1}</span>
                    <span className="ml-3 text-body-sm font-medium text-ink-2">{title}</span>
                    <span className="mt-1 block pl-9 text-body-sm text-ink-4">{description}</span>
                  </span>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-4" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-frame px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid border-l border-t border-line lg:grid-cols-3">
          {visitModes.map((mode) => (
            <div key={mode.title} className="border-b border-r border-line bg-surface p-6">
              <p className="text-body-sm font-semibold text-brand">{mode.title}</p>
              <h2 className="mt-2 text-h3 font-semibold tracking-tight text-ink">{mode.summary}</h2>
              <ul className="mt-5 space-y-3">
                {mode.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-body-sm text-ink-2">
                    <span className="h-1 w-1 rounded-full bg-brand" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card className="border-ink">
            <CardContent className="p-6">
              <SectionHeader title="커뮤니티" />
              <h2 className="text-h3 font-semibold tracking-tight text-ink">기록 이야기를 나눠보세요.</h2>
              <p className="mt-2 text-body-sm text-ink-3">
                대회 후기, 훈련 이야기, 궁금한 점을 자유롭게 올릴 수 있어요.
              </p>
              <Link to="/community" className={cn(buttonVariants(), 'mt-5')}>
                커뮤니티 보기
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-line bg-surface-2 text-ink">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
                <div>
                  <SectionHeader title="운영 원칙" />
                  <h2 className="text-h3 font-semibold tracking-tight text-ink">이렇게 운영해요.</h2>
                  <ul className="mt-4 space-y-3">
                    {operatingRules.map((rule) => (
                      <li key={rule} className="flex gap-3 text-body-sm leading-relaxed text-ink-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
