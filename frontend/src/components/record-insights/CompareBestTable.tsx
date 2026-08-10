export type CompareBestRow = {
  readonly athleteKey: string
  readonly name: string
  readonly color: string
  readonly best: {
    readonly record: string
    readonly windLegal: boolean
  } | null
  readonly recordCount: number
  readonly period: string
}

export function CompareBestTable({ rows }: { readonly rows: readonly CompareBestRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-4">
            <th className="py-2 pr-3 font-medium">선수</th>
            <th className="py-2 pr-3 font-medium">모은 기록 중 최고</th>
            <th className="py-2 pr-3 font-medium">기록 수</th>
            <th className="py-2 font-medium">기간</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.athleteKey} className="border-b border-hair">
              <td className="py-2 pr-3">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.name}
                </span>
              </td>
              <td className="py-2 pr-3 font-semibold text-ink">
                {row.best ? (
                  <>
                    {row.best.record}
                    {!row.best.windLegal ? <span className="ml-1.5 text-[11px] text-amber-700">참고용·풍속 초과</span> : null}
                  </>
                ) : <span className="text-ink-4">—</span>}
              </td>
              <td className="py-2 pr-3 text-ink-3">{row.recordCount}건</td>
              <td className="py-2 text-ink-3">{row.period}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
