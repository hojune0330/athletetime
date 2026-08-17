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
  readonly requestedAthleteKey: string;
  readonly state: AthleteProfileLoadState;
};

export function useAthleteProfileController(
  athleteKey: string,
): AthleteProfileController {
  const [controller, setController] = useState<AthleteProfileController>({
    candidates: [],
    profile: null,
    requestedAthleteKey: '',
    state: 'idle',
  });
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    const trimmedKey = athleteKey.trim();
    if (!trimmedKey) {
      setController({
        candidates: [],
        profile: null,
        requestedAthleteKey: '',
        state: 'idle',
      });
      return;
    }

    let active = true;
    setController({
      candidates: [],
      profile: null,
      requestedAthleteKey: trimmedKey,
      state: 'loading',
    });
    void getAthleteAnalytics(trimmedKey)
      .then((result) => {
        if (!active || requestId.current !== currentRequestId) return;
        switch (result.kind) {
          case 'profile':
            setController({
              candidates: [],
              profile: result.profile,
              requestedAthleteKey: trimmedKey,
              state: 'ready',
            });
            return;
          case 'ambiguous':
            setController({
              candidates: result.candidates,
              profile: null,
              requestedAthleteKey: trimmedKey,
              state: 'ambiguous',
            });
            return;
        }
      })
      .catch(() => {
        if (!active || requestId.current !== currentRequestId) return;
        setController({
          candidates: [],
          profile: null,
          requestedAthleteKey: trimmedKey,
          state: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, [athleteKey]);

  return controller;
}
