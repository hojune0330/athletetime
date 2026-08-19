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
  readonly dataRequestHref?: string
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly record: PublicRecord | null
}

type DetailItemProps = {
  readonly description?: string
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

function resolveDivisionSourceDescription(
  record: Pick<PublicRecord, 'divisionDetail' | 'divisionLabel' | 'sourceDivisionLabel'>,
) {
  const sourceDivisionLabel = record.sourceDivisionLabel?.trim()
  const divisionLabel = record.divisionLabel.trim()
  if (!sourceDivisionLabel || !divisionLabel) return undefined

  const compact = (value: string) => value.replace(/\s+/gu, '')
  const canonicalLabels = [divisionLabel, record.divisionDetail?.trim() || '']
  if (canonicalLabels.some((label) => label && compact(sourceDivisionLabel) === compact(label))) {
    return undefined
  }
  if (divisionLabel.includes('세부부문 없음')) {
    return '원문 표기: "' + sourceDivisionLabel + '" — 대회 결과에 세부 부문이 없어요'
  }
  return '원문 표기: "' + sourceDivisionLabel + '"'
}

function divisionValue(record: PublicRecord) {
  const label = detailValue(record.divisionLabel)
  const detail = record.divisionDetail?.trim()
  if (!detail || detail.replace(/\s+/gu, '') === label.replace(/\s+/gu, '')) return label
  return label + ' · ' + detail
}

function DetailItem({ description, label, value }: DetailItemProps) {
  return (
    <div className="border-b border-hair py-3 last:border-b-0">
      <dt className="text-caption font-medium text-ink-3">{label}</dt>
      <dd className="mt-1 break-words text-body-sm font-semibold leading-5 text-ink">
        <span className="block">{value}</span>
        {description && (
          <span
            className="mt-1 block text-caption font-normal leading-5 text-ink-3"
            role="note"
            aria-label={description}
            title={description}
          >
            {description}
          </span>
        )}
      </dd>
    </div>
  )
}

export function RecordDetailSheet({
  dataRequestHref,
  onOpenChange,
  open,
  record,
}: RecordDetailSheetProps) {
  const display = record ? resolveRecordDisplay(record.record, record.note) : null
  const url = record ? sourceLink(record.source.sourceUrl) : null
  const divisionDescription = record
    ? resolveDivisionSourceDescription(record)
    : undefined

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
            <p className="mt-4 border-l-2 border-warn bg-warn/10 px-3 py-2 text-body-sm font-medium leading-5 text-ink-2">
              숫자 기록이 아니라 경기 상태로 확인된 결과예요.
            </p>
          )}

          <dl className="mt-3">
            <DetailItem label="기록" value={display.text} />
            <DetailItem label="순위" value={record.rank === null ? '확인 안 됨' : String(record.rank) + '위'} />
            <DetailItem label="경기 단계" value={detailValue(record.phase)} />
            <DetailItem
              description={divisionDescription}
              label="부문"
              value={divisionValue(record)}
            />
            <DetailItem
              label="풍속"
              value={record.wind
                ? record.wind + (record.windLegal ? ' · 허용 범위로 표기됨' : '')
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

          {dataRequestHref && (
            <a
              className="mt-3 inline-flex min-h-11 items-center border border-line px-4 text-body-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              href={dataRequestHref}
            >
              기록이 틀렸어요
            </a>
          )}
        </SheetContent>
      )}
    </Sheet>
  )
}
