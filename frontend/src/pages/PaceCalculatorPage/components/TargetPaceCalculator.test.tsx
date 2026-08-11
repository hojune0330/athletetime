import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TargetPaceCalculator } from './TargetPaceCalculator';

describe('target pace calculator first-use state', () => {
  it('Given a first visit When the calculator renders Then it waits for a runner to enter their own target', () => {
    // Given no distance or finish time has been entered.
    const html = renderToStaticMarkup(<TargetPaceCalculator />);

    // When the calculator first appears.
    // Then it must not present a sample result as the runner's own record.
    expect(html).toContain('거리와 목표 시간을 입력하면 계산할 수 있어요.');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('value="20"');
    expect(html).not.toContain('>Reset<');
  });
});
