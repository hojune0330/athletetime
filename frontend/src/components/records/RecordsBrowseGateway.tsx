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
          <p className="text-sm font-semibold text-brand">기록 둘러보기</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">무엇을 볼까요?</h1>
        </div>
        <button
          type="button"
          onClick={onBackToHub}
          className="border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-ink-3 transition hover:border-line-2 hover:text-ink"
        >
          뒤로
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <BrowseCard
          title="선수 찾기"
          description="다른 선수의 공개 기록을 이름으로 찾아봐요."
          onClick={() => onPick('athlete')}
        />
        <BrowseCard
          title="팀(소속)으로 찾기"
          description="소속별 선수 후보를 확인해요."
          onClick={() => onPick('team')}
        />
        <BrowseCard
          title="시즌 기록표"
          description="종목·부문별 기록 모음을 봐요."
          onClick={() => onPick('season')}
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
