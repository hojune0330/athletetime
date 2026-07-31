import type { PublicRecord } from '@/api/recordAnalytics'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { resolveProviderLabel } from '@/config/dataPolicy'
import { resolveRecordDisplay } from '@/lib/recordStatus'

type RecordDetailSheetProps = {
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly record: PublicRecord | null
}

type DetailItemProps = {
  readonly label: string
  readonly value: string
}

function detailValue(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized || '확인 안 됨'
}

function sourceLink(value: string) {
  return /^https?:\/\//i.test(value) ? value : null
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="border-b border-hair py-3 last:border-b-0">
      <dt className="text-caption font-medium text-ink-3">{label}</dt>
      <dd className="mt-1 break-words text-body-sm font-semibold leading-5 text-ink">{value}</dd>
    </div>
  )
}

export function RecordDetailSheet({
  onOpenChange,
  open,
  record,
}: RecordDetailSheetProps) {
  const display = record ? resolveRecordDisplay(record.record, record.note) : null
  const url = record ? sourceLink(record.source.sourceUrl) : null

  return (
    <Sheet open={open && record !== null} onOpenChange={onOpenChange}>
      {record && display && (
        <SheetContent side="bottom" closeLabel="기록 상세 닫기">
          <SheetHeader>
            <p className="font-mono text-[11px] font-semibold tracking-wide text-brand">RECORD DETAIL</p>
            <SheetTitle>{record.eventLabel} · {display.text}</SheetTitle>
            <SheetDescription>
              {record.competitionName} · {detailValue(record.date)}
            </SheetDescription>
          </SheetHeader>

          {!display.hasMark && (
            <p className="mt-4 border-l-2 border-warn bg-[#F7EDE0] px-3 py-2 text-body-sm font-medium leading-5 text-ink-2">
              숫자 기록이 아니라 경기 상태로 확인된 결과예요.
            </p>
          )}

          <dl className="mt-3">
            <DetailItem label="기록" value={display.text} />
            <DetailItem label="순위" value={record.rank === null ? '확인 안 됨' : `${record.rank}위`} />
            <DetailItem label="경기 단계" value={detailValue(record.phase)} />
            <DetailItem label="부문" value={detailValue(record.divisionDetail ?? record.divisionLabel)} />
            <DetailItem
              label="풍속"
              value={record.wind
                ? `${record.wind}${record.windLegal ? ' · 허용 범위로 표기됨' : ''}`
                : '확인 안 됨'}
            />
            <DetailItem label="장소" value={detailValue(record.venue)} />
            <DetailItem label="소속 표기" value={detailValue(record.team)} />
            <DetailItem label="출처" value={resolveProviderLabel(record.source.provider)} />
            <DetailItem label="수집 시점" value={detailValue(record.source.capturedAt)} />
          </dl>

          {url && (
            <a
              className="mt-4 inline-flex min-h-11 items-center border border-line px-4 text-body-sm font-semibold text-brand hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              원출처 열기
            </a>
          )}
        </SheetContent>
      )}
    </Sheet>
  )
}
