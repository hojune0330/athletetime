import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecordDeviceDataClearNotice, RecordDeviceDataControls } from './RecordDeviceDataControls';

describe('record device data controls', () => {
  it('Given device-local record data When the cleanup control renders Then it distinguishes saved collections from temporary selections', () => {
    const markup = renderToStaticMarkup(
      <RecordDeviceDataControls
        candidateCount={2}
        comparisonCount={1}
        draftCount={1}
        workspaceCount={1}
        onClear={() => 'persistent'}
      />,
    );

    expect(markup).toContain('이 기기에 남은 기록 선택과 기록 모음');
    expect(markup).toContain('이 기기에 남은 선수 후보 2명');
    expect(markup).toContain('이 기기에 저장한 기록 모음 1개');
    expect(markup).toContain('비교를 위한 임시 선택 1명');
    expect(markup).toContain('진행 중인 임시 선택 1명');
    expect(markup).toContain('이 항목들은 이 기기에만 남아 있어요.');
    expect(markup).toContain('훈련 일지는 훈련 계산기에서 따로 지워야 해요.');
    expect(markup).toContain('이 기기의 기록 선택 정리');
    expect(markup).not.toContain('정말 모두 지우기');
  });

  it('Given blocked browser storage When cleanup cannot persist Then it says saved collections or temporary selections may remain', () => {
    const markup = renderToStaticMarkup(<RecordDeviceDataClearNotice outcome="volatile" />);

    expect(markup).toContain('저장 기능이 막혀');
    expect(markup).toContain('이 기기에 저장한 기록 모음 또는 브라우저의 임시 선택이 남아 있을 수 있어요');
    expect(markup).not.toContain('모두 지웠어요');
    expect(markup).not.toContain('화면을 닫기 전까지');
  });
});
