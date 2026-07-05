import { Link } from 'react-router-dom';

type ComingSoonPanelProps = {
  readonly title: string;
  readonly description: string;
};

export function ComingSoonPanel({ title, description }: ComingSoonPanelProps) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="mb-6 inline-flex rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-600">
        오픈 전 점검
      </div>
      <h1 className="mb-3 text-2xl font-black text-neutral-950 md:text-4xl">{title}</h1>
      <p className="max-w-2xl text-base leading-7 text-neutral-600">{description}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          to="/competitions"
          className="rounded-2xl border border-neutral-200 px-5 py-4 font-bold text-neutral-900 transition-colors hover:border-primary-300 hover:bg-primary-50"
        >
          경기 결과 보기
        </Link>
        <Link
          to="/pace-calculator"
          className="rounded-2xl border border-neutral-200 px-5 py-4 font-bold text-neutral-900 transition-colors hover:border-primary-300 hover:bg-primary-50"
        >
          페이스 계산기
        </Link>
        <Link
          to="/training-calculator"
          className="rounded-2xl border border-neutral-200 px-5 py-4 font-bold text-neutral-900 transition-colors hover:border-primary-300 hover:bg-primary-50"
        >
          훈련 계산기
        </Link>
      </div>
    </section>
  );
}
