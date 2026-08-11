type TrainingLogNotice = 'saved' | 'unavailable' | 'recovered' | 'corrupt' | 'cleared' | null;

type TrainingLogStorageStatusProps = Readonly<{
  notice: TrainingLogNotice;
  discardedCount: number;
  canClear: boolean;
  onClear: () => void;
}>;

export function TrainingLogStorageStatus({
  notice,
  discardedCount,
  canClear,
  onClear,
}: TrainingLogStorageStatusProps) {
  return (
    <>
      {notice === 'unavailable' && (
        <p role="alert" className="mt-3 text-body-sm text-err">
          이 브라우저에서는 훈련 일지를 저장하거나 삭제하지 못했어요. 이 화면을 닫으면 새 기록은 남지 않아요.
        </p>
      )}
      {notice === 'corrupt' && (
        <p role="alert" className="mt-3 text-body-sm text-err">
          기존 훈련 일지를 읽을 수 없어요. 아래에서 이 기기의 훈련 일지를 모두 삭제한 뒤 새로 시작할 수 있어요.
        </p>
      )}
      {notice === 'recovered' && (
        <p role="status" className="mt-3 text-body-sm text-ink-3">
          읽을 수 없는 일지 {discardedCount}개를 제외하고 나머지 기록을 불러왔어요.
        </p>
      )}
      {notice === 'cleared' && (
        <p role="status" className="mt-3 text-body-sm text-ink-3">
          이 기기에 저장된 훈련 일지를 모두 삭제했어요.
        </p>
      )}
      <div className="mt-6 border-l-2 border-brand bg-surface-2 p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest-2 text-brand">
          TRAINORACLE · LOCAL ONLY
        </p>
        <p className="mt-1.5 text-body-sm font-semibold text-ink">현재는 이 기기 안에서만</p>
        <p className="mt-1 text-body-sm leading-relaxed text-ink-2">
          훈련 일지는 서버, 계정, 분석 기능과 연결되지 않아요. 저장한 기록은 이 기기에서만 보고 삭제할 수 있어요. 공용 기기에서는 사용을 마친 뒤 아래에서 모두 삭제하세요.
        </p>
        {canClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-3 min-h-11 text-body-sm font-semibold text-ink underline underline-offset-4"
          >
            이 기기의 훈련 일지 모두 삭제
          </button>
        )}
      </div>
    </>
  );
}
