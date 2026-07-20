import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import {
  EditorialApiError,
  addEditorialSource,
  createEditorialCalendar,
  createEditorialIssue,
  deleteEditorialSource,
  getEditorialIssue,
  listEditorialCalendar,
  listEditorialIssues,
  listEditorialRevisions,
  reviseEditorialIssue,
  runEditorialAction,
  scheduleEditorialIssue,
  skipEditorialCalendar,
  type EditorialCalendarEntry,
  type EditorialCalendarInput,
  type EditorialDraftInput,
  type EditorialIssue,
  type EditorialRevision,
  type EditorialSourceInput,
} from '../../api/editorialAdmin';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CalendarComposer } from '../../components/admin/editorial/CalendarComposer';
import { EditorialQueue } from '../../components/admin/editorial/EditorialQueue';
import { IssueEditorPanel } from '../../components/admin/editorial/IssueEditorPanel';
import { RevisionHistory } from '../../components/admin/editorial/RevisionHistory';
import { SourceChecklist } from '../../components/admin/editorial/SourceChecklist';
import {
  WORKFLOW_TABS,
  issueMatchesTab,
  type WorkflowTab,
} from '../../components/admin/editorial/editorialLabels';

function errorSentence(error: unknown, location: string): string {
  if (error instanceof EditorialApiError) {
    const detail = error.reasons[0] ?? error.message;
    return `${location}: ${detail}`;
  }
  if (error instanceof Error) return `${location}: ${error.message}`;
  return `${location}: 요청을 처리하지 못했습니다.`;
}

export default function AdminIssueEditorPage() {
  const [activeTab, setActiveTab] = useState<WorkflowTab>('candidate');
  const [calendar, setCalendar] = useState<readonly EditorialCalendarEntry[]>([]);
  const [issues, setIssues] = useState<readonly EditorialIssue[]>([]);
  const [revisions, setRevisions] = useState<readonly EditorialRevision[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<EditorialCalendarEntry | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<EditorialIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function loadAll(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const [nextCalendar, nextIssues] = await Promise.all([
        listEditorialCalendar(),
        listEditorialIssues(),
      ]);
      setCalendar(nextCalendar);
      setIssues(nextIssues);
      if (selectedIssue) {
        const refreshed = nextIssues.find((issue) => issue.id === selectedIssue.id) ?? null;
        setSelectedIssue(refreshed);
      }
      if (selectedCalendar) {
        const refreshed = nextCalendar.find((entry) => entry.id === selectedCalendar.id) ?? null;
        setSelectedCalendar(refreshed);
      }
    } catch (loadError: unknown) {
      setError(errorSentence(loadError, '편집실 불러오기'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function selectIssue(issue: EditorialIssue): Promise<void> {
    setBusy(true);
    setError('');
    try {
      const [detail, nextRevisions] = await Promise.all([
        getEditorialIssue(issue.id),
        listEditorialRevisions(issue.id),
      ]);
      setSelectedIssue(detail);
      setSelectedCalendar(null);
      setRevisions(nextRevisions);
    } catch (selectError: unknown) {
      setError(errorSentence(selectError, '원고 열기'));
    } finally {
      setBusy(false);
    }
  }

  function selectCalendarEntry(entry: EditorialCalendarEntry): void {
    setSelectedCalendar(entry);
    setSelectedIssue(null);
    setRevisions([]);
    setError('');
  }

  async function refreshSelected(issueId: string, message: string): Promise<void> {
    const [detail, nextCalendar, nextIssues, nextRevisions] = await Promise.all([
      getEditorialIssue(issueId),
      listEditorialCalendar(),
      listEditorialIssues(),
      listEditorialRevisions(issueId),
    ]);
    setSelectedIssue(detail);
    setSelectedCalendar(null);
    setCalendar(nextCalendar);
    setIssues(nextIssues);
    setRevisions(nextRevisions);
    setNotice(message);
  }

  async function perform(location: string, action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (actionError: unknown) {
      setError(errorSentence(actionError, location));
    } finally {
      setBusy(false);
    }
  }

  async function handleCalendarCreate(input: EditorialCalendarInput): Promise<void> {
    await perform('편성 추가', async () => {
      const created = await createEditorialCalendar(input);
      const nextCalendar = await listEditorialCalendar();
      setCalendar(nextCalendar);
      selectCalendarEntry(created);
      setNotice('편성 후보를 추가했습니다.');
    });
  }

  async function handleCreate(draft: EditorialDraftInput): Promise<void> {
    if (!selectedCalendar) return;
    await perform('초안 만들기', async () => {
      const created = await createEditorialIssue(selectedCalendar, draft);
      setActiveTab('draft');
      await refreshSelected(created.id, '초안을 만들었습니다. 출처를 확인해 주세요.');
    });
  }

  async function handleSave(draft: EditorialDraftInput, reviewNote: string): Promise<void> {
    if (!selectedIssue) return;
    await perform('원고 저장', async () => {
      const updated = await reviseEditorialIssue(selectedIssue, draft, reviewNote);
      await refreshSelected(updated.id, `원고 V${updated.version}을 저장했습니다.`);
    });
  }

  async function handleSourceAdd(source: EditorialSourceInput): Promise<void> {
    if (!selectedIssue) return;
    await perform('출처 추가', async () => {
      await addEditorialSource(selectedIssue, source);
      await refreshSelected(selectedIssue.id, '출처를 추가했습니다.');
    });
  }

  async function handleSourceDelete(sourceId: string): Promise<void> {
    if (!selectedIssue) return;
    await perform('출처 삭제', async () => {
      await deleteEditorialSource(selectedIssue, sourceId);
      await refreshSelected(selectedIssue.id, '출처를 삭제했습니다.');
    });
  }

  async function handleCheck(): Promise<void> {
    if (!selectedIssue) return;
    await perform('검토 요청', async () => {
      const updated = await runEditorialAction(selectedIssue, 'check');
      setActiveTab('review');
      await refreshSelected(updated.id, '정책 검사를 통과해 검토 대기로 옮겼습니다.');
    });
  }

  async function handleApprove(): Promise<void> {
    if (!selectedIssue) return;
    await perform('담당자 승인', async () => {
      const updated = await runEditorialAction(selectedIssue, 'approve');
      await refreshSelected(updated.id, '담당자 승인을 기록했습니다.');
    });
  }

  async function handleSchedule(localKstDateTime: string): Promise<void> {
    if (!selectedIssue) return;
    await perform('발행 예약', async () => {
      const updated = await scheduleEditorialIssue(selectedIssue, localKstDateTime);
      setActiveTab('scheduled');
      await refreshSelected(updated.id, '한국 시간 기준으로 발행을 예약했습니다.');
    });
  }

  async function handleSkip(reason: string): Promise<void> {
    if (!selectedCalendar) return;
    await perform('발행 제외 기록', async () => {
      const updated = await skipEditorialCalendar(selectedCalendar, reason);
      const nextCalendar = await listEditorialCalendar();
      setCalendar(nextCalendar);
      selectCalendarEntry(updated);
      setNotice('발행하지 않는 결정과 이유를 남겼습니다.');
    });
  }

  const candidateItems = activeTab === 'candidate'
    ? calendar.filter((entry) => entry.state === 'planned' || entry.state === 'skipped')
    : [];
  const issueItems = issues.filter((issue) => issueMatchesTab(issue, activeTab));

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-mono-sm">ATHLETETIME EDITORIAL DESK</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">매거진 편집실</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-3">자료를 고르고, 출처를 확인하고, 담당자가 승인한 글만 예약합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarComposer busy={busy} onCreate={handleCalendarCreate} />
            <Button type="button" variant="outline" size="sm" disabled={loading || busy} onClick={loadAll}>
              <ArrowPathIcon className={loading ? 'animate-spin' : ''} />
              새로고침
            </Button>
          </div>
        </div>
      </header>

      <div aria-live="polite" className="min-h-6">
        {error && <p role="alert" className="border-l-2 border-err bg-red-50 px-3 py-2 text-sm text-err">{error}</p>}
        {!error && notice && <p className="border-l-2 border-ok bg-green-50 px-3 py-2 text-sm text-ok">{notice}</p>}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        const next = WORKFLOW_TABS.find((tab) => tab.key === value);
        if (next) {
          setActiveTab(next.key);
          setSelectedCalendar(null);
          setSelectedIssue(null);
          setRevisions([]);
        }
      }}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b border-line bg-transparent p-0">
          {WORKFLOW_TABS.map((tab) => {
            const count = tab.key === 'candidate'
              ? calendar.filter((entry) => entry.state === 'planned' || entry.state === 'skipped').length
              : issues.filter((issue) => issueMatchesTab(issue, tab.key)).length;
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="rounded-none border-b-2 border-transparent px-4 py-3 font-semibold data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {tab.label}
                <span className="font-mono text-[10px] tabular-nums text-ink-4">{count}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-ink-3">
            <CalendarDaysIcon className="size-4" />
            작업 목록
          </div>
          <EditorialQueue
            candidates={candidateItems}
            issues={issueItems}
            selectedCalendarId={selectedCalendar?.id ?? null}
            selectedIssueId={selectedIssue?.id ?? null}
            onSelectCalendar={selectCalendarEntry}
            onSelectIssue={(issue) => { selectIssue(issue); }}
          />
        </aside>

        <main>
          {loading ? (
            <div className="flex min-h-80 items-center justify-center border border-line bg-surface text-sm text-ink-3">편집 자료를 불러오는 중...</div>
          ) : (
            <IssueEditorPanel
              key={selectedIssue?.id ?? selectedCalendar?.id ?? 'empty'}
              calendar={selectedCalendar}
              issue={selectedIssue}
              busy={busy}
              onCreate={handleCreate}
              onSave={handleSave}
              onCheck={handleCheck}
              onApprove={handleApprove}
              onSchedule={handleSchedule}
              onSkip={handleSkip}
            />
          )}
        </main>

        <aside className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-3">
            <DocumentCheckIcon className="size-4" />
            근거와 이력
          </div>
          {selectedIssue ? (
            <>
              <SourceChecklist issue={selectedIssue} busy={busy} onAdd={handleSourceAdd} onDelete={handleSourceDelete} />
              <RevisionHistory revisions={revisions} />
            </>
          ) : (
            <div className="border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-ink-3">초안을 만든 뒤 출처와 수정 이력이 여기에 표시됩니다.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
