export const workspaceCreatedNavigation = { replace: true } as const;

export const workspaceResetToSearchNavigation = {
  state: { focusSearch: true },
  replace: true,
  to: '/records?flow=browse&browse=athlete',
} as const;
