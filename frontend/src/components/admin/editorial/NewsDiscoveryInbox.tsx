import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import type { EditorialCalendarEntry } from '../../../api/editorialAdmin';
import { NEWS_DISCOVERY_STATUSES, type ConfirmNewsSourceInput, type NewsDiscovery, type NewsDiscoveryRange, type NewsDiscoveryStatus } from '../../../api/editorialNewsDiscoveries';
import { useNewsDiscoveries } from '../../../hooks/useNewsDiscoveries';

type NewsDiscoveryInboxProps = { readonly calendar: readonly EditorialCalendarEntry[]; };
type OpenForm = { readonly kind: 'source' | 'calendar' | 'dismiss'; readonly id: string } | null;
const STATUS_LABELS: Record<NewsDiscoveryStatus, string> = { discovered: '발견됨', reviewing: '검토 중', source_confirmed: '원문 확인', calendar_linked: '일정 연결됨', dismissed: '제외됨' };

function hostname(url: string): string { try { return new URL(url).hostname; } catch { return '알 수 없는 원문 도메인'; } }
function timestamp(value: string | null): string { return value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value)) : '기록 없음'; }
function isBusy(id: string, busyId: string | null): boolean { return busyId === id || busyId === 'run'; }
function runStatus(run: ReturnType<typeof useNewsDiscoveries>['lastRun']): string {
  if (!run) return '기록 없음';
  if (run.status === 'running') return '수집 중';
  if (run.status === 'completed') return '완료';
  const messages: Record<string, string> = { credentials_missing: '연결 설정 확인 필요', quota_exceeded: '사용량 한도 초과', credentials_rejected: '연결 인증 확인 필요', provider_quota: '제공처 한도 초과', partial_failure: '일부 주제 수집 실패' };
  return messages[run.safeErrorCode ?? 'partial_failure'] ?? '수집 처리 실패';
}

export function NewsDiscoveryInbox({ calendar }: NewsDiscoveryInboxProps) {
  const [range, setRange] = useState<NewsDiscoveryRange>('today');
  const [selectedStatus, setSelectedStatus] = useState<NewsDiscoveryStatus | 'all'>('all');
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [source, setSource] = useState<ConfirmNewsSourceInput>({ sourceUrl: '', title: '', publisher: '', sourceKind: 'official' });
  const { discoveries, nextCursor, lastRun, loading, loadingMore, busyId, error, refresh, loadMore, run, startReview, dismiss, confirmSource, linkCalendar } = useNewsDiscoveries(range, selectedStatus);
  const planned = calendar.filter((entry) => entry.state === 'planned');

  function open(kind: OpenForm['kind'], discovery: NewsDiscovery): void {
    setOpenForm({ kind, id: discovery.id }); setDismissReason('');
    if (kind === 'source') setSource({ sourceUrl: discovery.confirmedSourceUrl ?? discovery.originalUrl, title: discovery.confirmedSourceTitle ?? discovery.title, publisher: discovery.confirmedSourcePublisher ?? '', sourceKind: 'official' });
  }
  async function submitDismiss(event: FormEvent<HTMLFormElement>, id: string): Promise<void> { event.preventDefault(); if (!dismissReason.trim()) return; await dismiss(id, dismissReason.trim()); setOpenForm(null); }
  async function submitSource(event: FormEvent<HTMLFormElement>, id: string): Promise<void> { event.preventDefault(); await confirmSource(id, source); setOpenForm(null); }
  async function submitCalendar(event: FormEvent<HTMLFormElement>, id: string): Promise<void> {
    event.preventDefault(); const form = new FormData(event.currentTarget); const selected = planned.find((entry) => entry.id === form.get('calendarId'));
    if (!selected) return; await linkCalendar(id, selected.id, selected.version); setOpenForm(null);
  }

  return (
    <section aria-labelledby="news-discovery-heading" className="border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="t-mono-sm">EDITORIAL INBOX</p><h2 id="news-discovery-heading" className="mt-1 text-xl font-black text-ink">소식 발견함</h2><p className="mt-1 text-xs text-ink-3">발견 링크는 발행 근거가 아닙니다. 원문을 확인한 뒤에만 일정에 연결합니다.</p></div>
        <Button type="button" size="sm" disabled={busyId === 'run'} onClick={() => { void run(); }}><ArrowPathIcon className={busyId === 'run' ? 'animate-spin' : ''} />오늘 소식 가져오기</Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-line py-3 text-xs text-ink-3">
        <span>최근 실행: {timestamp(lastRun?.completedAt ?? lastRun?.startedAt ?? null)}</span><span>상태 {runStatus(lastRun)}</span>
        {lastRun && <span>새 {lastRun.insertedCount} · 중복 {lastRun.duplicateCount} · 제외 {lastRun.irrelevantCount}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="발견함 필터">
        {([{ key: 'today', label: '오늘' }, { key: 'month', label: '이번 달' }] as const).map((item) => <Button key={item.key} type="button" size="sm" variant={range === item.key ? 'default' : 'outline'} onClick={() => setRange(item.key)}>{item.label}</Button>)}
        <select aria-label="소식 상태" className="h-9 border border-line bg-surface px-2 text-xs" value={selectedStatus} onChange={(event) => { const next = NEWS_DISCOVERY_STATUSES.find((status) => status === event.target.value); setSelectedStatus(next ?? 'all'); }}><option value="all">모든 상태</option>{NEWS_DISCOVERY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
        <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => { void refresh(); }}>새로고침</Button>
      </div>
      {error && <p role="alert" className="mt-3 border-l-2 border-err bg-red-50 px-3 py-2 text-sm text-err">소식함: {error}</p>}
      {loading && <p className="mt-4 text-sm text-ink-3">소식 목록을 불러오는 중입니다.</p>}
      {!loading && !error && discoveries.length === 0 && <p className="mt-4 border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">이 조건에서 확인할 소식이 없습니다.</p>}
      <div className="mt-4 grid gap-3">
        {discoveries.map((discovery) => <article key={discovery.id} className="border border-line bg-surface-2 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 flex-1 text-sm font-bold text-ink">{discovery.title}</h3><span className="shrink-0 border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-ink-2">{STATUS_LABELS[discovery.status]}</span></div>
          <p className="mt-2 text-xs text-ink-3">원문 도메인: <a className="underline underline-offset-2" href={discovery.originalUrl} target="_blank" rel="noopener noreferrer">{hostname(discovery.originalUrl)}</a> · {timestamp(discovery.publishedAt)}</p>
          <div className="mt-2 flex flex-wrap gap-1">{discovery.relevanceTags.map((tag) => <span key={tag} className="border border-line px-1.5 py-0.5 text-[10px] text-ink-3">{tag}</span>)}</div>
          <p className="mt-2 text-xs text-ink-3">관련 가능성이 있는 후보입니다. 제목과 원문을 직접 확인하세요.</p>
          {discovery.confirmedSourceUrl && <p className="mt-2 text-xs text-ok">확인한 원문: {hostname(discovery.confirmedSourceUrl)}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {discovery.status === 'discovered' && <Button type="button" size="sm" variant="outline" disabled={isBusy(discovery.id, busyId)} onClick={() => { void startReview(discovery.id); }}>검토 시작</Button>}
            {discovery.status === 'reviewing' && <Button type="button" size="sm" variant="outline" disabled={isBusy(discovery.id, busyId)} onClick={() => open('source', discovery)}>원문 출처 확인</Button>}
            <Button type="button" size="sm" variant="outline" disabled={isBusy(discovery.id, busyId) || discovery.status !== 'source_confirmed'} onClick={() => open('calendar', discovery)}>일정 연결</Button>
            {(discovery.status === 'discovered' || discovery.status === 'reviewing') && <Button type="button" size="sm" variant="ghost" disabled={isBusy(discovery.id, busyId)} onClick={() => open('dismiss', discovery)}>제외</Button>}
          </div>
          {openForm?.id === discovery.id && openForm.kind === 'dismiss' && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { void submitDismiss(event, discovery.id); }}><Input aria-label="제외 사유" value={dismissReason} onChange={(event) => setDismissReason(event.target.value)} required placeholder="제외 사유를 입력하세요" /><Button type="submit" size="sm" disabled={isBusy(discovery.id, busyId)}>제외 확정</Button></form>}
          {openForm?.id === discovery.id && openForm.kind === 'source' && <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(event) => { void submitSource(event, discovery.id); }}><Input aria-label="원문 URL" type="url" value={source.sourceUrl} onChange={(event) => setSource({ ...source, sourceUrl: event.target.value })} required /><Input aria-label="원문 제목" value={source.title} onChange={(event) => setSource({ ...source, title: event.target.value })} required /><Input aria-label="발행처" value={source.publisher} onChange={(event) => setSource({ ...source, publisher: event.target.value })} required /><select aria-label="출처 종류" className="h-10 border border-line bg-surface px-3 text-sm" value={source.sourceKind} onChange={(event) => { const kind = ['official', 'primary', 'secondary'].find((item) => item === event.target.value); if (kind) setSource({ ...source, sourceKind: kind }); }}><option value="official">공식</option><option value="primary">1차</option><option value="secondary">2차</option></select><Button type="submit" size="sm" disabled={isBusy(discovery.id, busyId)}>원문 확인 저장</Button></form>}
          {openForm?.id === discovery.id && openForm.kind === 'calendar' && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { void submitCalendar(event, discovery.id); }}><select name="calendarId" aria-label="예정 일정" className="h-10 min-w-52 border border-line bg-surface px-3 text-sm" required defaultValue=""> <option value="" disabled>연결할 예정 일정을 선택하세요</option>{planned.map((entry) => <option key={entry.id} value={entry.id}>{entry.seasonYear} · {entry.sectionKey} · #{entry.slot}</option>)}</select><Button type="submit" size="sm" disabled={isBusy(discovery.id, busyId) || planned.length === 0}>일정 연결 저장</Button>{planned.length === 0 && <span className="self-center text-xs text-ink-3">연결할 예정 일정이 없습니다.</span>}</form>}
        </article>)}
      </div>
      {nextCursor && <div className="mt-4 text-center"><Button type="button" size="sm" variant="outline" disabled={loadingMore} onClick={() => { void loadMore(); }}>{loadingMore ? '더 불러오는 중' : '더 보기'}</Button></div>}
    </section>
  );
}
