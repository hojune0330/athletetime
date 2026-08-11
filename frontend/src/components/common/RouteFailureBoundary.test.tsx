import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RouteFailureBoundary, RouteFailureFallback } from './RouteFailureBoundary';

describe('RouteFailureFallback', () => {
  it('switches to the recovery state when a route throws', () => {
    expect(RouteFailureBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });

  it('gives a failed route a retry and two safe exits', () => {
    const html = renderToStaticMarkup(
      <RouteFailureFallback onRetry={() => undefined} />,
    );

    expect(html).toContain('화면을 다시 열지 못했어요');
    expect(html).toContain('다시 시도');
    expect(html).toContain('기록 찾기');
    expect(html).toContain('홈으로');
    expect(html).toContain('href="/records"');
    expect(html).toContain('href="/"');
    expect(html).toContain('<main');
  });
});
