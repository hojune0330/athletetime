import type { ReactNode } from 'react';

type RecordsHubProps = {
  readonly myEntriesCount: number;
  readonly myEntryName: string;
  readonly onOpenMyRecords: () => void;
  readonly onStartMine: () => void;
  readonly onOpenTeamPerformance: () => void;
  readonly children?: ReactNode;
};

export function RecordsHub({
  myEntriesCount,
  myEntryName,
  onOpenMyRecords,
  onStartMine,
  onOpenTeamPerformance,
  children,
}: RecordsHubProps) {
  return (
    <div className="space-y-6" data-records-flow="hub">
      <section className="border border-line bg-surface p-6 sm:p-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">공개 기록 모아보기</p>
          <h1 className="mt-3 break-keep text-2xl font-semibold tracking-tight text-ink [text-wrap:balance] sm:text-4xl">
            공개 기록, 이름만 알면 찾아요.
          </h1>
          <p className="mt-3 break-keep text-sm leading-6 text-ink-3 [text-wrap:pretty]">
            찾는 선수 기록을 이름과 소속으로 확인한 뒤, 원하는 후보만 모아 보세요.
          </p>
        </div>

        {myEntriesCount > 0 && (
          <button
            type="button"
            onClick={onOpenMyRecords}
            className="mt-6 flex min-h-11 w-full items-center justify-between gap-3 border border-brand border-l-4 bg-brand/5 px-4 py-3 text-left transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <span className="min-w-0 truncate text-sm text-ink">
              <span className="font-bold text-brand">이 기기에서 만든 기록 모음</span>
              <span className="ml-2 font-semibold">{myEntryName || '이름 미상'}</span>
              <span className="ml-2 text-ink-4">{myEntriesCount}명 담음</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-brand">이어보기</span>
          </button>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <FlowChoiceCard
            title="이름 또는 소속으로 기록 찾기"
            description="이름과 소속을 확인해 공개 기록 후보를 직접 고르세요."
            primary
            onClick={onStartMine}
          />
          <FlowChoiceCard
            title="팀 성과 보기"
            description="팀·학교의 공개 기록을 집계로 살펴봐요."
            onClick={onOpenTeamPerformance}
          />
        </div>
      </section>
      {children}
    </div>
  );
}

function FlowChoiceCard({
  title,
  description,
  primary = false,
  onClick,
}: {
  readonly title: string;
  readonly description: string;
  readonly primary?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-36 border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        primary
          ? 'border-brand bg-brand text-white hover:bg-brand-600'
          : 'border-line bg-surface-2 text-ink hover:border-line-2 hover:bg-surface'
      }`}
    >
      <span className={`block break-keep text-xl font-semibold tracking-tight [text-wrap:balance] ${primary ? 'text-white' : 'text-ink'}`}>
        {title}
      </span>
      <span className={`mt-3 block break-keep text-sm leading-6 [text-wrap:pretty] ${primary ? 'text-white/85' : 'text-ink-3'}`}>
        {description}
      </span>
      <span className={`mt-6 inline-flex text-sm font-semibold ${primary ? 'text-white' : 'text-brand'}`}>
        시작하기
      </span>
    </button>
  );
}
