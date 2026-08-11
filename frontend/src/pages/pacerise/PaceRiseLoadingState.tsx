import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';

const SLOW_LOAD_DELAY_MS = 5_000;

export function PaceRiseLoadingState() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsSlow(true), SLOW_LOAD_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="flex flex-col gap-3 py-6" role="status" aria-live="polite">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-3/4" />
      <p className="mt-2 text-body-sm text-ink-3">실업 대회 정보를 불러오는 중이에요.</p>
      {isSlow && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface p-3 text-body-sm text-ink-3">
          <p className="w-full">조금 더 걸릴 수 있어요. 다른 화면을 먼저 둘러봐도 괜찮아요.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
          <Link to="/competitions?tab=results" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-brand/40 text-brand hover:border-brand/60 hover:text-brand-ink')}>
            대회·기록 보기
          </Link>
        </div>
      )}
    </div>
  );
}
