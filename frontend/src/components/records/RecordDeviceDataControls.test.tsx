import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecordDeviceDataControls } from './RecordDeviceDataControls';

describe('record device data controls', () => {
  it('explains the exact local boundary before a user confirms deletion', () => {
    const markup = renderToStaticMarkup(
      <RecordDeviceDataControls
        candidateCount={2}
        comparisonCount={1}
        workspaceCount={1}
        onClear={() => 'persistent'}
      />,
    );

    expect(markup).toContain('이 기기에 남은 기록 선택');
    expect(markup).toContain('선수 후보 2명');
    expect(markup).toContain('기록 모음 1개');
    expect(markup).toContain('비교 준비 1개');
    expect(markup).toContain('훈련 일지는 훈련 계산기에서 따로 지워야 해요.');
    expect(markup).toContain('이 기기의 기록 선택 정리');
    expect(markup).not.toContain('정말 모두 지우기');
  });
});
