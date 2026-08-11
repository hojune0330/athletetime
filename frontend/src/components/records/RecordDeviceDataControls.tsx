import { useState } from 'react';
import { Button } from '../ui/button';

type RecordDeviceDataControlsProps = Readonly<{
  candidateCount: number;
  comparisonCount: number;
  draftCount?: number;
  workspaceCount: number;
  onClear: () => 'persistent' | 'volatile';
}>;

export function RecordDeviceDataControls({
  candidateCount,
  comparisonCount,
  draftCount = 0,
  workspaceCount,
  onClear,
}: RecordDeviceDataControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<'cleared' | 'volatile' | null>(null);
  const details = [
    candidateCount > 0 ? `선수 후보 ${candidateCount}명` : null,
    workspaceCount > 0 ? `기록 모음 ${workspaceCount}개` : null,
    comparisonCount > 0 ? `비교 준비 ${comparisonCount}개` : null,
    draftCount > 0 ? `진행 중 선택 ${draftCount}명` : null,
  ].filter((detail): detail is string => detail !== null);

  if (details.length === 0 && notice === null) return null;

  const handleClear = () => {
    const persistence = onClear();
    setConfirming(false);
    setNotice(persistence === 'persistent' ? 'cleared' : 'volatile');
  };

  return (
    <section className="border border-line bg-surface-2 p-4" aria-labelledby="record-device-data-heading">
      <h2 id="record-device-data-heading" className="text-body font-semibold text-ink">이 기기에 남은 기록 선택</h2>
      {notice === 'cleared' ? (
        <p role="status" className="mt-2 text-body-sm text-ink-3">
          이 기기의 기록 모음, 후보 선택, 비교 준비를 모두 지웠어요.
        </p>
      ) : (
        <>
          <p className="mt-1 text-body-sm leading-5 text-ink-3">
            {details.join(' · ')}이 이 기기에만 남아 있어요. 공용 기기라면 확인을 마친 뒤 정리하세요.
          </p>
          <p className="mt-2 text-caption leading-5 text-ink-4">
            훈련 일지는 훈련 계산기에서 따로 지워야 해요. 로그인 상태와 홈 바로가기는 바뀌지 않아요.
          </p>
          {confirming ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="button" variant="destructive" onClick={handleClear}>정말 모두 지우기</Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>취소</Button>
            </div>
          ) : (
            <Button className="mt-4" type="button" variant="outline" onClick={() => setConfirming(true)}>
              이 기기의 기록 선택 정리
            </Button>
          )}
        </>
      )}
      {notice === 'volatile' && (
        <p role="alert" className="mt-3 text-body-sm text-err">
          이 브라우저의 저장 기능이 막혀 일부 선택이 화면을 닫기 전까지 남아 있을 수 있어요.
        </p>
      )}
    </section>
  );
}
