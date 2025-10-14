import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentIcon,
  InboxStackIcon,
} from '@heroicons/react/24/outline'
import { useCompetitionTimetables } from '../features/events/hooks'
import { formatDate, formatRelativeTime } from '../lib/utils'
import type { CompetitionTimetable, CompetitionTimetableSession } from '../lib/types'

function deriveTimetableState(timetable: CompetitionTimetable, now: Date) {
  const start = new Date(timetable.startDate)
  const end = new Date(timetable.endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return timetable.status ?? 'scheduled'
  }

  if (now < start) {
    return 'scheduled'
  }

  if (now > end) {
    return 'completed'
  }

  return 'ongoing'
}

function getDDayLabel(timetable: CompetitionTimetable, now: Date) {
  const start = new Date(timetable.startDate)
  const end = new Date(timetable.endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null
  }

  if (now < start) {
    const diff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? `D-${diff}` : 'D-DAY'
  }

  if (now <= end) {
    return '경기 진행중'
  }

  return '종료'
}

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return '일정 미정'
  }

  if (!endDate || startDate === endDate) {
    return formatDate(startDate, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${formatDate(startDate, { year: 'numeric', month: 'long', day: 'numeric' })} ~ ${formatDate(endDate, { year: 'numeric', month: 'long', day: 'numeric' })}`
  }

  const includeYear = start.getFullYear() !== end.getFullYear()

  const startLabel = formatDate(startDate, {
    year: includeYear ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
  })
  const endLabel = formatDate(endDate, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `${startLabel} ~ ${endLabel}`
}

function formatTimeLabel(timeValue?: string) {
  if (!timeValue) {
    return '시간 미정'
  }

  const date = new Date(timeValue)

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('ko', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  return timeValue
}

function groupSessionsByDate(sessions: CompetitionTimetableSession[] | undefined) {
  if (!sessions || sessions.length === 0) {
    return []
  }

  const map = new Map<string, CompetitionTimetableSession[]>()

  for (const session of sessions) {
    const key = session.date ?? '일정 미정'
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)?.push(session)
  }

  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    items: items.sort((a, b) => {
      if (!a.startTime || !b.startTime) {
        return 0
      }
      return a.startTime.localeCompare(b.startTime)
    }),
  }))
}

function TimetableCard({ timetable, isFeatured }: { timetable: CompetitionTimetable; isFeatured?: boolean }) {
  const now = new Date()
  const status = deriveTimetableState(timetable, now)
  const dDay = getDDayLabel(timetable, now)
  const groupedSessions = useMemo(() => groupSessionsByDate(timetable.sessions), [timetable.sessions])

  return (
    <article
      className={
        isFeatured
          ? 'card border border-brand-200/80 bg-white px-6 py-6 shadow-lg shadow-brand-100/60'
          : 'card border border-slate-200/70 bg-white px-5 py-6'
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
            <span>대한육상연맹 공지</span>
            {dDay ? (
              <span
                className={
                  status === 'completed'
                    ? 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink-400'
                    : status === 'ongoing'
                      ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
                      : 'rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700'
                }
              >
                {dDay}
              </span>
            ) : null}
            {timetable.updatedAt ? (
              <span className="text-ink-400">최근 업데이트 {formatRelativeTime(timetable.updatedAt)}</span>
            ) : null}
          </div>
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{timetable.title}</h2>
          {timetable.competitionName && timetable.competitionName !== timetable.title ? (
            <p className="text-sm font-medium text-ink-500">{timetable.competitionName}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 text-sm text-ink-600">
            <span className="inline-flex items-center gap-1">
              <CalendarDaysIcon className="h-4 w-4 text-brand-500" />
              {formatDateRange(timetable.startDate, timetable.endDate)}
            </span>
            {timetable.venue ? (
              <span className="inline-flex items-center gap-1">
                <InboxStackIcon className="h-4 w-4 text-brand-500" />
                {timetable.venue}
              </span>
            ) : null}
            {timetable.hostOrganization ? (
              <span className="inline-flex items-center gap-1">
                <DocumentIcon className="h-4 w-4 text-brand-500" />
                {timetable.hostOrganization}
              </span>
            ) : null}
          </div>
          {(() => {
            const description = timetable.summary ?? timetable.highlightText
            if (!description) {
              return null
            }
            return <p className="text-sm leading-relaxed text-ink-600">{description}</p>
          })()}
          {timetable.notice ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {timetable.notice}
            </p>
          ) : null}
        </div>
        {timetable.primaryDocument?.url ? (
          <a
            href={timetable.primaryDocument.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 self-start"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            경기 시간표 열기
          </a>
        ) : null}
      </div>

      {timetable.attachments && timetable.attachments.length > 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <h3 className="text-sm font-semibold text-ink-700">관련 첨부 파일</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            {timetable.attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-inner">
                <span className="truncate">
                  {attachment.title ?? attachment.fileName ?? '첨부 파일'}
                  {attachment.uploadedAt ? (
                    <span className="ml-2 text-xs text-ink-400">업로드 {formatRelativeTime(attachment.uploadedAt)}</span>
                  ) : null}
                </span>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" /> 다운로드
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {groupedSessions.length > 0 ? (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-ink-700">세부 경기 일정</h3>
          {groupedSessions.map(({ date, items }) => (
            <div key={date} className="rounded-xl border border-slate-200 bg-white shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h4 className="text-sm font-semibold text-ink-700">
                  {(() => {
                    const parsed = new Date(date)
                    if (Number.isNaN(parsed.getTime())) {
                      return date
                    }
                    return formatDate(parsed, { year: 'numeric', month: 'long', day: 'numeric' })
                  })()}
                </h4>
                <span className="text-xs text-ink-400">총 {items.length}경기</span>
              </div>
              <div className="divide-y divide-slate-100 text-sm">
                {items.map((session) => (
                  <div key={session.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 text-ink-600">
                      <ClockIcon className="h-4 w-4 text-brand-500" />
                      <span className="font-medium">
                        {formatTimeLabel(session.startTime)}
                        {session.endTime ? ` ~ ${formatTimeLabel(session.endTime)}` : ''}
                      </span>
                    </div>
                    <div className="flex-1 text-ink-800 sm:text-right">
                      <span className="font-semibold">{session.discipline}</span>
                      {session.round ? <span className="ml-2 text-sm text-ink-500">{session.round}</span> : null}
                      {session.gender ? <span className="ml-2 text-sm text-ink-500">{session.gender}</span> : null}
                      {session.note ? <span className="ml-2 text-xs text-ink-400">{session.note}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function EmptyState({ onReload }: { onReload(): void }) {
  return (
    <div className="card flex flex-col items-center gap-4 border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-ink-500">
      <CalendarDaysIcon className="h-10 w-10 text-slate-300" />
      <div className="space-y-1">
        <p className="text-lg font-semibold">공개된 경기 시간표가 없습니다.</p>
        <p className="text-sm text-ink-400">
          대한육상연맹 공식 시간표가 업로드되면 이 자리에서 가장 먼저 확인할 수 있습니다.
        </p>
      </div>
      <button type="button" onClick={onReload} className="btn-ghost inline-flex items-center gap-2">
        <ArrowPathIcon className="h-4 w-4" /> 다시 불러오기
      </button>
    </div>
  )
}

function CompetitionTimetablePage() {
  const { data, isLoading, isFetching, isError, refetch } = useCompetitionTimetables({ includePast: true })
  const schedules = data?.data ?? []
  const now = new Date()

  const [showPast, setShowPast] = useState(false)

  const { current, past } = useMemo(() => {
    const sorted = [...schedules].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    const currentSchedules: CompetitionTimetable[] = []
    const pastSchedules: CompetitionTimetable[] = []

    for (const timetable of sorted) {
      const state = deriveTimetableState(timetable, now)
      if (state === 'completed') {
        pastSchedules.push(timetable)
      } else {
        currentSchedules.push(timetable)
      }
    }

    return { current: currentSchedules, past: pastSchedules }
  }, [schedules, now])

  useEffect(() => {
    if (!isLoading && !isFetching && current.length === 0 && past.length > 0) {
      setShowPast(true)
    }
  }, [current.length, past.length, isLoading, isFetching])

  return (
    <div className="space-y-8">
      <section className="card border border-brand-200/50 bg-white px-6 py-6 shadow-subtle sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-600">
              경기 시간표 센터
            </span>
            <div>
              <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">대한육상연맹 공식 경기 시간표</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                주요 육상대회가 시작되기 직전 공개되는 공식 시간표를 모아 제공합니다. 대회가 진행 중일 때는 최신 시간표가
                최상단에 고정되며, 종료된 대회는 아래의 "지난 대회 시간표" 영역에서 다시 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
              <span>업로드 즉시 자동 반영</span>
              <span aria-hidden="true">·</span>
              <span>대한육상연맹 공식 배포본 기준</span>
              {isFetching ? (
                <span className="inline-flex items-center gap-1 text-brand-600">
                  <ArrowPathIcon className="h-3 w-3 animate-spin" /> 새로고침 중
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primary" onClick={() => refetch()}>
              <ArrowPathIcon className="h-4 w-4" />
              데이터 새로고침
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowPast((prev) => !prev)}
            >
              지난 대회 시간표 보기
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={`timetable-skeleton-${index}`} className="h-48 animate-pulse rounded-2xl bg-white shadow-inner" />
          ))}
        </div>
      ) : isError ? (
        <div className="card space-y-4 border border-red-200 bg-red-50 px-6 py-6 text-red-700">
          <h2 className="text-lg font-semibold">경기 시간표를 불러오는 중 오류가 발생했습니다.</h2>
          <p className="text-sm">네트워크 상태를 확인한 뒤 다시 시도해주세요. 문제가 지속되면 운영팀에 문의해주세요.</p>
          <div>
            <button type="button" className="btn-primary" onClick={() => refetch()}>
              <ArrowPathIcon className="h-4 w-4" /> 다시 시도
            </button>
          </div>
        </div>
      ) : current.length === 0 ? (
        <EmptyState onReload={() => refetch()} />
      ) : (
        <div className="space-y-6">
          {current.map((timetable, index) => (
            <TimetableCard key={timetable.id} timetable={timetable} isFeatured={index === 0} />
          ))}
        </div>
      )}

      <section id="past-timetables" className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-800">지난 대회 시간표</h2>
          {past.length > 0 ? (
            <span className="text-xs text-ink-400">총 {past.length}건</span>
          ) : null}
        </header>

        {showPast ? (
          past.length > 0 ? (
            <div className="space-y-4">
              {past.map((timetable) => (
                <TimetableCard key={timetable.id} timetable={timetable} />
              ))}
            </div>
          ) : (
            <div className="card border border-slate-200 bg-white px-6 py-6 text-sm text-ink-500">
              아직 지난 대회 시간표가 없습니다. 첫 시간표 업로드 이후 자동으로 보관됩니다.
            </div>
          )
        ) : (
          <div className="card flex flex-col items-center gap-3 border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm text-ink-500">지난 대회 시간표는 필요 시 열람할 수 있도록 별도로 보관됩니다.</p>
            <button type="button" className="btn-secondary" onClick={() => setShowPast(true)}>
              지난 대회 시간표 펼치기
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default CompetitionTimetablePage
