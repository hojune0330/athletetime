import { describe, expect, it } from 'vitest';
import { workspaceCreatedNavigation, workspaceResetToSearchNavigation } from './workspaceNavigation';

describe('workspace creation navigation', () => {
  it('replaces the consumed review route so browser Back never opens an empty draft', () => {
    expect(workspaceCreatedNavigation).toEqual({ replace: true });
  });

  it('returns a cleared selection to a fresh athlete search instead of retaining hidden candidates', () => {
    // Given a user who decides the current same-name selection is not right.
    // When the review page sends them back to search.
    // Then the URL and navigation state start a fresh athlete-only search.
    expect(workspaceResetToSearchNavigation).toEqual({
      state: { focusSearch: true },
      replace: true,
      to: '/records?flow=browse&browse=athlete',
    });
  });
});
