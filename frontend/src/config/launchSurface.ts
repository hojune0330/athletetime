export const launchFlags = {
  home: true,
  paceCalculator: true,
  trainingCalculator: true,
  competitions: true,
  matchResults: true,
  recordsBasic: false,
  recordInsights: false,
  profileCard: false,
  aboutData: false,
  dataRequest: false,
  community: false,
  chat: false,
  marketplace: false,
  auth: true,
} as const;

export type LaunchFeature = keyof typeof launchFlags;

export type LaunchNavigationItem = {
  readonly feature: LaunchFeature;
  readonly path: string;
  readonly label: string;
  readonly mobileLabel: string;
  readonly emoji: string;
};

export type LaunchRoute =
  | {
      readonly kind: 'enabled';
      readonly feature: LaunchFeature;
    }
  | {
      readonly kind: 'comingSoon';
      readonly feature: LaunchFeature;
      readonly title: string;
      readonly description: string;
    };

const comingSoonRoutes: Partial<Record<LaunchFeature, LaunchRoute>> = {
  community: {
    kind: 'comingSoon',
    feature: 'community',
    title: '커뮤니티는 오픈 전 점검 중이에요',
    description: '게시글과 활동 기록을 안전하게 지킬 수 있을 때 열겠습니다.',
  },
  chat: {
    kind: 'comingSoon',
    feature: 'chat',
    title: '실시간 채팅은 잠시 닫아둘게요',
    description: '접속자 보호와 운영 기준을 확인한 뒤 공개하겠습니다.',
  },
  marketplace: {
    kind: 'comingSoon',
    feature: 'marketplace',
    title: '중고거래는 준비 중이에요',
    description: '거래 안전 장치와 신고 흐름을 갖춘 뒤 열겠습니다.',
  },
  recordsBasic: {
    kind: 'comingSoon',
    feature: 'recordsBasic',
    title: '기록 검색은 정리 중이에요',
    description: '출처와 정정 요청 흐름까지 연결한 뒤 공개하겠습니다.',
  },
  recordInsights: {
    kind: 'comingSoon',
    feature: 'recordInsights',
    title: '흥미로운 기록 조회는 준비 중이에요',
    description: '오해 없는 표현과 데이터 기준을 확인한 뒤 열겠습니다.',
  },
  profileCard: {
    kind: 'comingSoon',
    feature: 'profileCard',
    title: '기록카드는 오픈 전 점검 중이에요',
    description: '공유 화면이 실제 기록과 안전하게 연결될 때 공개하겠습니다.',
  },
};

const primaryNavigationItems: readonly LaunchNavigationItem[] = [
  {
    feature: 'paceCalculator',
    path: '/pace-calculator',
    label: '페이스 계산기',
    mobileLabel: '페이스 계산기',
    emoji: '⏱',
  },
  {
    feature: 'trainingCalculator',
    path: '/training-calculator',
    label: '훈련 계산기',
    mobileLabel: '훈련 계산기',
    emoji: '📊',
  },
  {
    feature: 'competitions',
    path: '/competitions',
    label: '경기 결과',
    mobileLabel: '경기 결과',
    emoji: '🏆',
  },
] as const;

export const launchNavigationItems = primaryNavigationItems.filter((item) =>
  isLaunchFeatureEnabled(item.feature),
);

export function isLaunchFeatureEnabled(feature: LaunchFeature): boolean {
  return launchFlags[feature] === true;
}

export function getLaunchRoute(feature: LaunchFeature): LaunchRoute {
  if (isLaunchFeatureEnabled(feature)) {
    return { kind: 'enabled', feature };
  }

  return (
    comingSoonRoutes[feature] ?? {
      kind: 'comingSoon',
      feature,
      title: '오픈 전 점검 중이에요',
      description: '먼저 안정적으로 제공할 수 있는 기능부터 열어두겠습니다.',
    }
  );
}
