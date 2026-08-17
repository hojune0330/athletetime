import { useEffect, useRef, useState } from 'react';
import {
  getAthleteAnalytics,
  type AthleteAnalyticsProfile,
  type AthleteSearchCard,
} from '../../../api/recordAnalytics';

export type AthleteProfileLoadState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'ambiguous'
  | 'error';

export type AthleteProfileController = {
  readonly profile: AthleteAnalyticsProfile | null;
  readonly candidates: readonly AthleteSearchCard[];
  readonly state: AthleteProfileLoadState;
};

export function useAthleteProfileController(
  athleteKey: string,
): AthleteProfileController {
  const [profile, setProfile] = useState<AthleteAnalyticsProfile | null>(null);
  const [candidates, setCandidates] = useState<readonly AthleteSearchCard[]>([]);
  const [state, setState] = useState<AthleteProfileLoadState>('idle');
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    const trimmedKey = athleteKey.trim();
    if (!trimmedKey) {
      setProfile(null);
      setCandidates([]);
      setState('idle');
      return;
    }

    let active = true;
    setProfile(null);
    setCandidates([]);
    setState('loading');
    void getAthleteAnalytics(trimmedKey)
      .then((result) => {
        if (!active || requestId.current !== currentRequestId) return;
        switch (result.kind) {
          case 'profile':
            setProfile(result.profile);
            setCandidates([]);
            setState('ready');
            return;
          case 'ambiguous':
            setProfile(null);
            setCandidates(result.candidates);
            setState('ambiguous');
            return;
        }
      })
      .catch(() => {
        if (!active || requestId.current !== currentRequestId) return;
        setProfile(null);
        setCandidates([]);
        setState('error');
      });

    return () => {
      active = false;
    };
  }, [athleteKey]);

  return { profile, candidates, state };
}
