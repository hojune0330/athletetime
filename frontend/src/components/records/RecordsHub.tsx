import type { ReactNode } from 'react';

type RecordsHubProps = {
  readonly myEntriesCount: number;
  readonly myEntryName: string;
  readonly onOpenMyRecords: () => void;
  readonly onStartMine: () => void;
  readonly onStartBrowse: () => void;
  readonly children?: ReactNode;
};

export function RecordsHub({
  myEntriesCount,
  myEntryName,
  onOpenMyRecords,
  onStartMine,
  onStartBrowse,
  children,
}: RecordsHubProps) {
  return (
    <div className="space-y-6" data-records-flow="hub">
      <section className="border border-line bg-surface p-6 sm:p-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">공개 기록 모아보기</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
            공개 기록, 이름만 알면 찾아요.
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-3">
            찾는 선수 기록을 이름과 소속으로 확인한 뒤, 원하는 후보만 모아 보세요.
          </p>
        </div>

        {myEntriesCount > 0 && (
          <button
            type="button"
            onClick={onOpenMyRecords}
            className="mt-6 flex w-full items-center justify-between gap-3 border border-brand border-l-4 bg-brand/5 px-4 py-3 text-left transition hover:bg-brand/10"
          >
            <span className="min-w-0 truncate text-sm text-ink">
              <span className="font-bold text-brand">이 기기에서 모아 본 선수 후보</span>
              <span className="ml-2 font-semibold">{myEntryName || '이름 미상'}</span>
              <span className="ml-2 text-ink-4">{myEntriesCount}명 선택</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-brand">이어보기</span>
          </button>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <FlowChoiceCard
            title="기록 찾아 모으기"
            description="이름과 소속을 확인한 뒤 원하는 선수 후보만 이 기기에 모아요."
            primary
            onClick={onStartMine}
          />
          <FlowChoiceCard
            title="기록 둘러보기"
            description="선수·팀·시즌 기록표를 한 단계씩 찾아봐요."
            onClick={onStartBrowse}
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
      className={`min-h-36 border p-5 text-left transition ${
        primary
          ? 'border-brand bg-brand text-white hover:bg-brand-600'
          : 'border-line bg-surface-2 text-ink hover:border-line-2 hover:bg-surface'
      }`}
    >
      <span className={`block text-xl font-semibold tracking-tight ${primary ? 'text-white' : 'text-ink'}`}>
        {title}
      </span>
      <span className={`mt-3 block text-sm leading-6 ${primary ? 'text-white/85' : 'text-ink-3'}`}>
        {description}
      </span>
      <span className={`mt-6 inline-flex text-sm font-semibold ${primary ? 'text-white' : 'text-brand'}`}>
        시작하기
      </span>
    </button>
  );
}
