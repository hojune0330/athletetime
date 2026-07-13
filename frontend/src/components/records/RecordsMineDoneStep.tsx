import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { MyRecordsCard } from '../record-insights/MyRecordsCard';
import type { MyAthleteEntry } from '../record-insights/useMyAthlete';

export function DoneStep({
  entries,
  onAddMore,
  onSeasonForMine,
  onRemoveMyAthlete,
}: {
  readonly entries: readonly MyAthleteEntry[];
  readonly onAddMore: () => void;
  readonly onSeasonForMine: () => void;
  readonly onRemoveMyAthlete: (athleteKey: string) => void;
}) {
  const firstEntry = entries[0];

  return (
    <div className="space-y-4" data-records-step="mine-done">
      <div className="border border-brand bg-brand/5 p-5">
        <p className="text-sm font-semibold text-brand">4단계</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">내 기록 홈이 준비됐어요.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-3">
          {firstEntry?.name || '선수'} 기준 {entries.length}개 묶음을 모았어요.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" data-records-sticky-cta="mine-done">
        <Button type="button" variant="outline" onClick={onAddMore}>기록 더 추가하기</Button>
        <Button type="button" variant="outline" onClick={onSeasonForMine}>시즌표에서 내 위치 보기</Button>
        <Button asChild variant="outline">
          <Link to={firstEntry ? `/records?athlete=${encodeURIComponent(firstEntry.athleteKey)}` : '/records'}>
            기록 카드 공유
          </Link>
        </Button>
      </div>

      {entries.length > 0 ? (
        <MyRecordsCard
          entries={[...entries]}
          onClose={onAddMore}
          onRemove={onRemoveMyAthlete}
        />
      ) : (
        <div role="status" className="border border-line bg-surface-2 p-4 text-sm text-ink-3">
          아직 담긴 기록이 없어요. 기록 더 추가하기로 후보를 골라주세요.
        </div>
      )}
    </div>
  );
}
