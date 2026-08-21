import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { ContentStudioDraft } from './contentStudioWorkflow';

type ContentStudioCardProps = {
  readonly draft: ContentStudioDraft;
  readonly exportMode?: boolean;
};

export const ContentStudioCard = forwardRef<HTMLDivElement, ContentStudioCardProps>(
  ({ draft, exportMode = false }, ref) => (
    <div
      ref={ref}
      aria-label={exportMode ? undefined : '선수 기록 카드 미리보기'}
      className={cn(
        'relative flex flex-col overflow-hidden bg-ink text-surface',
        exportMode ? 'h-[1350px] w-[1080px] p-24' : 'aspect-[4/5] w-full p-5 sm:p-8',
      )}
    >
      <header className={cn('flex items-center justify-between border-b border-surface/20', exportMode ? 'pb-4' : 'pb-3 sm:pb-4')}>
        <p className={cn('font-semibold tracking-widest-2', exportMode ? 'text-2xl' : 'text-caption')}>
          ATHLETETIME
        </p>
        <p className={cn('text-surface/80', exportMode ? 'text-2xl' : 'text-mono-sm')}>PUBLIC RECORD</p>
      </header>

      <div className={cn('flex flex-1 flex-col', exportMode ? 'pt-24' : 'pt-7 sm:pt-14')}>
        <p className={cn('text-surface/80', exportMode ? 'text-3xl' : 'text-body-sm')}>
          {draft.eventLabel}
        </p>
        <h2
          className={cn(
            'mt-3 max-w-[92%] break-keep font-semibold leading-tight [text-wrap:balance]',
            exportMode ? 'text-7xl' : 'text-2xl sm:text-4xl',
          )}
        >
          {draft.headline}
        </h2>

        <div className={cn('mt-auto', exportMode ? 'pb-18' : 'pb-5 sm:pb-8')}>
          <p className={cn('whitespace-nowrap font-semibold tracking-tight', exportMode ? 'text-9xl leading-tight' : 'text-5xl sm:text-7xl')}>
            {draft.record}
          </p>
          <p className={cn('break-keep text-surface/75', exportMode ? 'mt-8 text-3xl' : 'mt-2 text-body-sm')}>
            {draft.athleteName} · {draft.team}
          </p>
          <p className={cn('mt-1 break-keep text-surface/60', exportMode ? 'text-2xl' : 'text-caption')}>
            {draft.competitionName} · {draft.recordDate}
          </p>
        </div>

        <p
          className={cn(
            'border-t border-surface/20 pt-4 break-keep text-surface/85 [text-wrap:pretty] sm:pt-5',
            exportMode ? 'text-3xl leading-normal' : 'text-body-sm leading-relaxed',
          )}
        >
          {draft.body}
        </p>
      </div>

      <footer className={cn('flex items-end justify-between gap-5 text-surface/55', exportMode ? 'mt-6 text-xl' : 'mt-3 text-mono-xs sm:mt-6 sm:text-mono-sm')}>
        <p className="break-keep">출처 {draft.sourceProvider}</p>
        <p className="break-keep text-right">{draft.credit}</p>
      </footer>
    </div>
  ),
);

ContentStudioCard.displayName = 'ContentStudioCard';
