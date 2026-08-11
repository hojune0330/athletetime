type HomeContinuation = {
  readonly id: string;
};

export type HomeFirstUseAction = {
  readonly id: 'records' | 'competitions' | 'continue';
  readonly label: string;
  readonly description: string;
  readonly to: string;
};

const coreActions = [
  {
    id: 'records',
    label: '기록 찾기',
    description: '이름이나 소속으로 찾기',
    to: '/records',
  },
  {
    id: 'competitions',
    label: '다가오는 대회',
    description: '일정과 결과 보기',
    to: '/competitions',
  },
] as const satisfies readonly HomeFirstUseAction[];

export function buildFirstUseActions(
  continuation: HomeContinuation | null,
): readonly HomeFirstUseAction[] {
  if (continuation === null) {
    return coreActions;
  }

  return [
    ...coreActions,
    {
      id: 'continue',
      label: '이 기기에서 이어 보기',
      description: '직접 담아 둔 기록 모음',
      to: `/records/workspaces/${continuation.id}`,
    },
  ];
}
