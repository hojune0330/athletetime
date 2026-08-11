import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import type { HomeFirstUseAction } from '../../pages/homeFirstUse';

type HomeFirstUseActionsProps = {
  readonly actions: readonly HomeFirstUseAction[];
};

export function HomeFirstUseActions({ actions }: HomeFirstUseActionsProps) {
  return (
    <section aria-labelledby="home-first-use-heading" data-home-first-use-actions>
      <h2 id="home-first-use-heading" className="text-body-sm font-semibold text-ink-2">
        바로 시작
      </h2>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            className="group flex min-h-24 items-center justify-between border border-line bg-surface px-5 py-4 transition-colors hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span>
              <span className="block font-medium text-ink">{action.label}</span>
              <span className="mt-1 block text-body-sm text-ink-3">{action.description}</span>
            </span>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
          </Link>
        ))}
      </div>
    </section>
  );
}
