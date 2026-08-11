import { describe, expect, it } from 'vitest';
import { buildFirstUseActions } from './homeFirstUse';

describe('home first-use actions', () => {
  it('keeps a new visitor to record search and upcoming competitions', () => {
    expect(buildFirstUseActions(null).map((action) => action.id)).toEqual([
      'records',
      'competitions',
    ]);
  });

  it('adds only a device-local continuation when a saved collection exists', () => {
    expect(buildFirstUseActions({ id: 'workspace-1' }).map((action) => action.id)).toEqual([
      'records',
      'competitions',
      'continue',
    ]);
    expect(buildFirstUseActions({ id: 'workspace-1' }).at(-1)?.to).toBe('/records/workspaces/workspace-1');
  });
});
