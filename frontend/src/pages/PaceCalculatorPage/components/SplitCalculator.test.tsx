import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SplitCalculator } from './SplitCalculator';

describe('split calculator surface', () => {
  it('Given the first visit When the planner renders Then it uses the current calculator language', () => {
    // Given a runner has not generated a split plan yet.
    const html = renderToStaticMarkup(<SplitCalculator />);

    // When the public planner surface is rendered.
    // Then the inputs are clear, accessible, and free from legacy decoration.
    expect(html).toContain('STEP 01');
    expect(html).toContain('목표 거리');
    expect(html).toContain('완주 시간');
    expect(html).toContain('aria-label="목표 거리 (km)"');
    expect(html).toContain('aria-label="시간"');
    expect(html).not.toContain('fas ');
    expect(html).not.toContain('bg-gradient-to');
    expect(html).not.toContain('📊');
  });
});
