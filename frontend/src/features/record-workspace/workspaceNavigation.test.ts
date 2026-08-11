import { describe, expect, it } from 'vitest';
import { workspaceCreatedNavigation } from './workspaceNavigation';

describe('workspace creation navigation', () => {
  it('replaces the consumed review route so browser Back never opens an empty draft', () => {
    expect(workspaceCreatedNavigation).toEqual({ replace: true });
  });
});
