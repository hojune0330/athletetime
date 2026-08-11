import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TrainingLogStorageStatus } from './TrainingLogStorageStatus';

describe('TrainingLogStorageStatus', () => {
  it('shows an honest unavailable-storage warning and the shared-device clear action', () => {
    const html = renderToStaticMarkup(
      <TrainingLogStorageStatus
        notice="unavailable"
        discardedCount={0}
        canClear
        onClear={() => undefined}
      />,
    );

    expect(html).toContain('저장하거나 삭제하지 못했어요');
    expect(html).toContain('이 기기의 훈련 일지 모두 삭제');
    expect(html).toContain('서버, 계정, 분석 기능과 연결되지 않아요');
    expect(html).toContain('공용 기기에서는 사용을 마친 뒤 아래에서 모두 삭제하세요');
  });
});
