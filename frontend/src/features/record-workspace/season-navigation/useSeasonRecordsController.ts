import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getSeasonRecordTable,
  type SeasonRecordTable,
} from '../../../api/recordAnalytics';
import {
  readSeasonSelectionRequest,
  resolveSeasonSelection,
  seasonSelectionParamsNeedRepair,
  updateSeasonSelectionParams,
  type SeasonNavigationCatalog,
  type SeasonSelection,
} from './seasonNavigation';

export type SeasonRecordsLoadState = 'idle' | 'loading' | 'ready' | 'error';

export type SeasonRecordsControllerOptions = {
  readonly filters: SeasonNavigationCatalog | null;
  readonly athleteKey: string;
  readonly enabled: boolean;
};

export type SeasonRecordsController = {
  readonly selection: SeasonSelection | null;
  readonly table: SeasonRecordTable | null;
  readonly state: SeasonRecordsLoadState;
  readonly replaceSelection: (selection: SeasonSelection) => void;
};

export function useSeasonRecordsController({
  filters,
  athleteKey,
  enabled,
}: SeasonRecordsControllerOptions): SeasonRecordsController {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.toString();
  const [table, setTable] = useState<SeasonRecordTable | null>(null);
  const [state, setState] = useState<SeasonRecordsLoadState>('idle');
  const requestId = useRef(0);

  const resolution = useMemo(() => {
    if (!enabled || !filters) return null;
    const params = new URLSearchParams(search);
    const requested = readSeasonSelectionRequest(params);
    const resolved = resolveSeasonSelection(filters, requested);
    if (!resolved) return null;
    return {
      requested,
      resolved,
      needsCanonicalUrl: !requested.hasSelectionParams
        || seasonSelectionParamsNeedRepair(params, resolved),
    };
  }, [enabled, filters, search]);

  useEffect(() => {
    if (!resolution?.needsCanonicalUrl) return;
    setSearchParams(
      updateSeasonSelectionParams(
        new URLSearchParams(search),
        resolution.resolved,
      ),
      { replace: true },
    );
  }, [resolution, search, setSearchParams]);

  const selection = resolution && !resolution.needsCanonicalUrl
    ? resolution.resolved
    : null;

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    if (!enabled || !selection) {
      setTable(null);
      setState('idle');
      return;
    }

    let active = true;
    setTable(null);
    setState('loading');
    const request = {
      season: selection.season,
      eventKey: selection.eventKey,
      divisionKey: selection.divisionKey,
      ...(athleteKey ? { athleteKey } : {}),
      limit: 100,
    };
    void getSeasonRecordTable(request)
      .then((nextTable) => {
        if (!active || requestId.current !== currentRequestId) return;
        setTable(nextTable);
        setState('ready');
      })
      .catch(() => {
        if (!active || requestId.current !== currentRequestId) return;
        setTable(null);
        setState('error');
      });
    return () => {
      active = false;
    };
  }, [athleteKey, enabled, selection]);

  return {
    selection,
    table: enabled && selection ? table : null,
    state: enabled && selection ? state : 'idle',
    replaceSelection(nextSelection) {
      setSearchParams(
        updateSeasonSelectionParams(
          new URLSearchParams(search),
          nextSelection,
        ),
        { replace: true },
      );
    },
  };
}
