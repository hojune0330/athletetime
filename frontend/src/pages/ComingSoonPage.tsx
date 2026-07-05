import { ComingSoonPanel } from '../components/common/ComingSoonPanel';
import { getLaunchRoute } from '../config/launchSurface';
import type { LaunchFeature } from '../config/launchSurface';

type ComingSoonPageProps = {
  readonly feature: LaunchFeature;
};

export function ComingSoonPage({ feature }: ComingSoonPageProps) {
  const route = getLaunchRoute(feature);

  if (route.kind === 'enabled') {
    return (
      <ComingSoonPanel
        title="페이지를 준비하고 있어요"
        description="현재 공개된 기능부터 안정적으로 사용할 수 있게 정리 중입니다."
      />
    );
  }

  return <ComingSoonPanel title={route.title} description={route.description} />;
}
