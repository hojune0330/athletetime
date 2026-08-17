import { useRef } from 'react';
import type { SeasonRecordTable } from '../../../api/recordAnalytics';
import { Card, CardHeader, CardTitle } from '../../../components/ui/card';
import { SeasonRecordResults } from './SeasonRecordResults';
import {
  changeSeasonSelection,
  getSeasonNavigationOptions,
  resolveSeasonRecovery,
  type SeasonNavigationCatalog,
  type SeasonSelection,
  type SeasonSelectionChange,
} from './seasonNavigation';

export type SeasonRecordsPanelProps = {
  readonly filters: SeasonNavigationCatalog;
  readonly selection: SeasonSelection;
  readonly table: SeasonRecordTable | null;
  readonly state: 'idle' | 'loading' | 'ready' | 'error';
  readonly highlightedRow: SeasonRecordTable['rows'][number] | null;
  readonly onSelectionChange: (selection: SeasonSelection) => void;
  readonly onRetry: () => void;
};

const selectClassName =
  'h-11 w-full border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

export function SeasonRecordsPanel({
  filters,
  selection,
  table,
  state,
  highlightedRow,
  onSelectionChange,
  onRetry,
}: SeasonRecordsPanelProps) {
  const seasonSelectRef = useRef<HTMLSelectElement>(null);
  const options = getSeasonNavigationOptions(filters, selection);
  const recovery = resolveSeasonRecovery(filters, selection);
  const changeSelection = (change: SeasonSelectionChange) => {
    onSelectionChange(changeSeasonSelection(filters, selection, change));
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-brand">시즌 기록표</p>
            <CardTitle className="mt-2 break-keep [text-wrap:balance]">시즌 기록 모음</CardTitle>
            <p id="season-records-description" className="mt-2 break-keep [text-wrap:pretty] text-sm text-ink-3">
              시즌부터 차례로 고르면 실제 기록이 있는 종목과 경기 부문만 보여요.
            </p>
          </div>

          <div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            aria-describedby="season-records-description"
          >
            <label
              htmlFor="season-records-season"
              className="block space-y-1.5 text-xs font-semibold text-ink-3"
            >
              <span>시즌</span>
              <select
                ref={seasonSelectRef}
                id="season-records-season"
                value={String(selection.season)}
                onChange={(event) => {
                  changeSelection({ kind: 'season', season: Number(event.target.value) });
                }}
                className={selectClassName}
                aria-controls="season-record-results"
              >
                {options.seasons.map((season) => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </label>

            <label
              htmlFor="season-records-event"
              className="block space-y-1.5 text-xs font-semibold text-ink-3"
            >
              <span>종목</span>
              <select
                id="season-records-event"
                value={selection.eventKey}
                onChange={(event) => {
                  changeSelection({ kind: 'event', eventKey: event.target.value });
                }}
                className={selectClassName}
                aria-controls="season-record-results"
              >
                {options.events.map((event) => (
                  <option key={event.key} value={event.key}>{event.label}</option>
                ))}
              </select>
            </label>

            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold text-ink-3">성별 구분</legend>
              <div className="flex h-11 border border-line">
                {options.genders.map((gender) => (
                  <button
                    key={gender.key}
                    type="button"
                    aria-pressed={options.genderKey === gender.key}
                    aria-controls="season-record-results"
                    onClick={() => {
                      changeSelection({ kind: 'gender', genderKey: gender.key });
                    }}
                    className={
                      'flex-1 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand '
                      + (options.genderKey === gender.key
                        ? 'bg-ink text-white'
                        : 'bg-surface text-ink-3 hover:bg-surface-2')
                    }
                  >
                    {gender.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label
              htmlFor="season-records-division"
              className="block space-y-1.5 text-xs font-semibold text-ink-3"
            >
              <span>경기 부문</span>
              <select
                id="season-records-division"
                value={options.divisionLevel}
                onChange={(event) => {
                  changeSelection({ kind: 'division', divisionLevel: event.target.value });
                }}
                className={selectClassName}
                aria-controls="season-record-results"
              >
                {options.levels.map((level) => (
                  <option key={level.key} value={level.key}>{level.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </CardHeader>

      <SeasonRecordResults
        table={table}
        state={state}
        highlightedRow={highlightedRow}
        recovery={recovery}
        onRecover={(nextSelection) => {
          onSelectionChange(nextSelection);
          window.requestAnimationFrame(() => seasonSelectRef.current?.focus());
        }}
        onRetry={onRetry}
      />
    </Card>
  );
}
