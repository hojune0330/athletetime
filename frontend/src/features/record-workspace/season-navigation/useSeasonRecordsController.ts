import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getSeasonRecordTable,
  type AnalyticsFilters,
  type SeasonRecordTable,
} from '../../../api/recordAnalytics';
import {
  readSeasonSelectionRequest,
  resolveSeasonSelection,
  seasonSelectionParamsNeedRepair,
  updateSeasonSelectionParams,
  type SeasonSelection,
} from './seasonNavigation';
import { isSameSeasonSelection } from './seasonSelection';

export type SeasonRecordsLoadState = 'idle' | 'loading' | 'ready' | 'error';

export type SeasonRecordsControllerOptions = {
  readonly filters: AnalyticsFilters | null;
  readonly athleteKey: string;
};

export type SeasonRecordsController = {
  readonly selection: SeasonSelection | null;
  readonly table: SeasonRecordTable | null;
  readonly state: SeasonRecordsLoadState;
  readonly replaceSelection: (selection: SeasonSelection) => void;
  readonly setTransientSelection: (selection: SeasonSelection) => void;
};

export function useSeasonRecordsController({
  filters,
  athleteKey,
}: SeasonRecordsControllerOptions): SeasonRecordsController {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selection, setSelection] = useState<SeasonSelection | null>(null);
  const [table, setTable] = useState<SeasonRecordTable | null>(null);
  const [state, setState] = useState<SeasonRecordsLoadState>('idle');

  useEffect(() => {
    if (!filters) return;
    const request = readSeasonSelectionRequest(searchParams);
    const resolved = resolveSeasonSelection(filters, request);
    if (!resolved) {
      setSelection(null);
      return;
    }

    if (
      request.hasSelectionParams
      && seasonSelectionParamsNeedRepair(searchParams, resolved)
    ) {
      setSelection(null);
      setSearchParams(updateSeasonSelectionParams(searchParams, resolved), {
        replace: true,
      });
      return;
    }

    setSelection((current) => {
      if (!request.hasSelectionParams && current) return current;
      if (current && isSameSeasonSelection(current, resolved)) return current;
      return resolved;
    });
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selection) {
      setTable(null);
      setState('idle');
      return;
    }

    let active = true;
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
        if (!active) return;
        setTable(nextTable);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [selection, athleteKey]);

  return {
    selection,
    table,
    state,
    replaceSelection(nextSelection) {
      setSearchParams(
        updateSeasonSelectionParams(searchParams, nextSelection),
        { replace: true },
      );
    },
    setTransientSelection(nextSelection) {
      setSelection(nextSelection);
    },
  };
}
