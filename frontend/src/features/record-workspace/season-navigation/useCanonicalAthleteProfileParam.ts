import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AthleteAnalyticsProfile } from '../../../api/recordAnalytics';
import type { AthleteProfileController } from './useAthleteProfileController';

export function useCanonicalAthleteProfileParam(
  selectedAthleteParam: string,
  controller: AthleteProfileController,
): AthleteAnalyticsProfile | null {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = selectedAthleteParam.trim();
  const profile = controller.profile
    && (
      controller.requestedAthleteKey === selectedKey
      || controller.profile.athlete.athleteKey === selectedKey
    )
    ? controller.profile
    : null;

  useEffect(() => {
    const canonicalKey = profile?.athlete.athleteKey.trim();
    if (
      !canonicalKey
      || canonicalKey === selectedKey
      || controller.requestedAthleteKey !== selectedKey
      || (searchParams.get('athlete') || '').trim() !== selectedKey
    ) return;

    const next = new URLSearchParams(searchParams);
    next.set('athlete', canonicalKey);
    setSearchParams(next, { replace: true });
  }, [controller.requestedAthleteKey, profile, searchParams, selectedKey, setSearchParams]);

  return profile;
}
