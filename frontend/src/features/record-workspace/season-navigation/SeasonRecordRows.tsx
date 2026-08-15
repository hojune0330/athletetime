import type { SeasonRecordTable } from '../../../api/recordAnalytics';

type SeasonRecordRowsProps = {
  readonly table: SeasonRecordTable;
};

export function SeasonRecordRows({ table }: SeasonRecordRowsProps) {
  return (
    <>
      <div className="hidden overflow-x-auto border border-line sm:block">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead className="bg-surface-2 text-left text-xs text-ink-4">
            <tr>
              <th className="w-12 p-2">순서</th>
              <th className="p-2">선수</th>
              <th className="w-28 p-2">기록</th>
              <th className="w-28 p-2">경기 부문</th>
              <th className="p-2">대회</th>
              <th className="w-28 p-2">일자</th>
              <th className="w-16 p-2">풍속</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr
                key={row.rank + '-' + row.athleteKey}
                className={row.highlighted ? 'bg-brand/5' : 'border-t border-line'}
              >
                <td className="w-12 p-2 font-mono tabular-nums text-ink-3">
                  {row.rank}
                </td>
                <td className="w-44 p-2">
                  <p className="truncate font-semibold text-ink">{row.name}</p>
                  <p className="truncate text-xs text-ink-4">{row.team || '소속 미상'}</p>
                </td>
                <td className="w-28 whitespace-nowrap p-2 font-mono text-base font-semibold tabular-nums text-ink">
                  {row.record}
                </td>
                <td className="w-28 p-2">
                  <DivisionBadge label={row.divisionLabel} detail={row.divisionDetail} />
                </td>
                <td className="p-2 text-ink-3">{row.competitionName}</td>
                <td className="w-28 whitespace-nowrap p-2 font-mono text-xs tabular-nums text-ink-3">
                  {row.date}
                </td>
                <td className="w-16 whitespace-nowrap p-2 font-mono text-xs tabular-nums text-ink-3">
                  {row.wind || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {table.rows.map((row) => (
          <div
            key={'mobile-' + row.rank + '-' + row.athleteKey}
            className={
              'border p-3 '
              + (row.highlighted ? 'border-brand bg-brand/5' : 'border-line bg-surface')
            }
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold text-ink">
                <span className="mr-2 font-mono text-xs tabular-nums text-ink-4">
                  {row.rank}
                </span>
                {row.name}
              </p>
              <p className="shrink-0 font-mono text-base font-semibold tabular-nums text-ink">
                {row.record}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <DivisionBadge label={row.divisionLabel} detail={row.divisionDetail} />
              <p className="shrink-0 font-mono text-xs tabular-nums text-ink-4">
                {row.date}{row.wind ? ' · ' + row.wind : ''}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-4">
              {row.team || '소속 미상'} · {row.competitionName}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function DivisionBadge({
  label,
  detail,
}: {
  readonly label: string;
  readonly detail?: string | null;
}) {
  return (
    <span
      title={detail || label}
      className="inline-flex max-w-full items-center border border-line bg-surface-2 px-2 py-1 text-xs font-semibold text-ink-3"
    >
      {label}
    </span>
  );
}
