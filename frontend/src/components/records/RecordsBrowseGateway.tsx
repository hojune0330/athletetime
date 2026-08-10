export type BrowseChoice = 'athlete' | 'team' | 'season';

type RecordsBrowseGatewayProps = {
  readonly onBackToHub: () => void;
  readonly onPick: (choice: BrowseChoice) => void;
};

export function RecordsBrowseGateway({ onBackToHub, onPick }: RecordsBrowseGatewayProps) {
  return (
    <section className="border border-line bg-surface p-6 sm:p-8" data-records-flow="browse">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">공개 기록 집계</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">팀 성과를 살펴보세요</h1>
        </div>
        <button
          type="button"
          onClick={onBackToHub}
          className="border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-ink-3 transition hover:border-line-2 hover:text-ink"
        >
          뒤로
        </button>
      </div>

      <div className="mt-6 max-w-xl">
        <BrowseCard
          title="팀 성과 보기"
          description="팀·학교의 공개 기록을 시즌별 집계로 살펴봐요."
          onClick={() => onPick('team')}
        />
      </div>
    </section>
  );
}

function BrowseCard({
  title,
  description,
  onClick,
}: {
  readonly title: string;
  readonly description: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-32 border border-line bg-surface-2 p-4 text-left transition hover:border-brand hover:bg-brand/5"
    >
      <span className="block text-lg font-semibold text-ink">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-ink-3">{description}</span>
      <span className="mt-5 inline-flex text-sm font-semibold text-brand">선택</span>
    </button>
  );
}
