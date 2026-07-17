import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  EditorialCalendarEntry,
  EditorialDraftInput,
  EditorialIssue,
} from '../../../api/editorialAdmin';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { PublicPreview } from './PublicPreview';
import { SECTION_LABELS, formatKst } from './editorialLabels';

type IssueEditorPanelProps = {
  readonly calendar: EditorialCalendarEntry | null;
  readonly issue: EditorialIssue | null;
  readonly busy: boolean;
  readonly onCreate: (draft: EditorialDraftInput) => Promise<void>;
  readonly onSave: (draft: EditorialDraftInput, reviewNote: string) => Promise<void>;
  readonly onCheck: () => Promise<void>;
  readonly onApprove: () => Promise<void>;
  readonly onSchedule: (localKstDateTime: string) => Promise<void>;
  readonly onSkip: (reason: string) => Promise<void>;
};

function initialDraft(issue: EditorialIssue | null): EditorialDraftInput {
  return issue ? {
    title: issue.title,
    content: issue.content,
    summary: issue.summary,
    whyNow: issue.whyNow,
    discussionQuestion: issue.discussionQuestion,
    relatedUrl: issue.relatedUrl,
    subjectAgeGroup: issue.subjectAgeGroup,
  } : {
    title: '',
    content: '',
    summary: '',
    whyNow: '',
    discussionQuestion: '',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'unknown',
  };
}

export function IssueEditorPanel({
  calendar,
  issue,
  busy,
  onCreate,
  onSave,
  onCheck,
  onApprove,
  onSchedule,
  onSkip,
}: IssueEditorPanelProps) {
  const [draft, setDraft] = useState<EditorialDraftInput>(() => initialDraft(issue));
  const [reviewNote, setReviewNote] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const editable = !issue || issue.status === 'draft';
  const sourceReady = Boolean(issue && issue.sources.length > 0);

  function updateDraft(field: keyof EditorialDraftInput, value: string): void {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (issue) await onSave(draft, reviewNote);
    else await onCreate(draft);
  }

  if (!calendar && !issue) {
    return (
      <div className="border border-dashed border-line bg-surface px-6 py-20 text-center">
        <p className="t-mono-xs">EDITORIAL DESK</p>
        <p className="mt-3 text-sm text-ink-3">왼쪽에서 편성 후보나 원고를 선택해 주세요.</p>
      </div>
    );
  }

  if (calendar?.state === 'skipped' && !issue) {
    return (
      <div className="border border-line bg-surface p-6">
        <p className="t-mono-xs">DO NOT PUBLISH</p>
        <h2 className="mt-2 text-xl font-black text-ink">발행하지 않기로 한 편성입니다.</h2>
        <p className="mt-3 text-sm text-ink-3">{calendar.skipReason ?? '사유가 기록되지 않았습니다.'}</p>
      </div>
    );
  }

  const sectionKey = issue?.sectionKey ?? calendar?.sectionKey;
  return (
    <div className="space-y-4">
      <section className="border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="t-mono-xs">{sectionKey ? SECTION_LABELS[sectionKey] : '편집 원고'}</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-ink">원고 편집</h2>
          </div>
          <div className="text-right font-mono text-xs tabular-nums text-ink-3">
            <p>{issue ? `V${issue.version} · ${issue.status}` : `CAL V${calendar?.version ?? 1}`}</p>
            <p className="mt-1">{issue?.scheduledFor ? formatKst(issue.scheduledFor) : 'KST'}</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-xs font-bold text-ink-2">
            제목
            <Input className="mt-1" value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} disabled={!editable} maxLength={200} required />
          </label>
          <label className="block text-xs font-bold text-ink-2">
            한 줄 요약
            <textarea className="mt-1 min-h-20 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-surface-2" value={draft.summary} onChange={(event) => updateDraft('summary', event.target.value)} disabled={!editable} maxLength={1000} required />
          </label>
          <label className="block text-xs font-bold text-ink-2">
            본문
            <textarea className="mt-1 min-h-56 w-full rounded-sm border border-line bg-surface px-3 py-3 text-sm leading-7 focus:border-brand focus:outline-none disabled:bg-surface-2" value={draft.content} onChange={(event) => updateDraft('content', event.target.value)} disabled={!editable} maxLength={20000} required />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-bold text-ink-2">
              왜 지금인가
              <textarea className="mt-1 min-h-24 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-surface-2" value={draft.whyNow} onChange={(event) => updateDraft('whyNow', event.target.value)} disabled={!editable} required />
            </label>
            <label className="block text-xs font-bold text-ink-2">
              대화 질문
              <textarea className="mt-1 min-h-24 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-surface-2" value={draft.discussionQuestion} onChange={(event) => updateDraft('discussionQuestion', event.target.value)} disabled={!editable} required />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <label className="block text-xs font-bold text-ink-2">
              관련 링크
              <Input className="mt-1" value={draft.relatedUrl} onChange={(event) => updateDraft('relatedUrl', event.target.value)} disabled={!editable} required />
            </label>
            <label className="block text-xs font-bold text-ink-2">
              다루는 선수 연령
              <select className="mt-1 h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm disabled:bg-surface-2" value={draft.subjectAgeGroup} onChange={(event) => updateDraft('subjectAgeGroup', event.target.value)} disabled={!editable}>
                <option value="unknown">특정하지 않음</option>
                <option value="adult">성인</option>
                <option value="minor">미성년</option>
              </select>
            </label>
          </div>

          {issue?.status === 'draft' && (
            <label className="block border-t border-hair pt-4 text-xs font-bold text-ink-2">
              이번 수정 메모
              <Input className="mt-1" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="무엇을 고쳤는지 남겨 주세요" required />
            </label>
          )}

          {editable && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button type="submit" disabled={busy || (Boolean(issue) && !reviewNote.trim())}>
                {issue ? '수정 저장' : '초안 만들기'}
              </Button>
              {issue?.status === 'draft' && (
                <Button type="button" variant="outline" disabled={busy || !sourceReady} title={sourceReady ? undefined : '출처를 먼저 추가해 주세요'} onClick={onCheck}>
                  검토 요청
                </Button>
              )}
            </div>
          )}
        </form>

        {!issue && calendar && (
          <div className="mt-5 border-t border-line pt-4">
            <label className="block text-xs font-bold text-ink-2">
              발행하지 않는 이유
              <Input className="mt-1" value={skipReason} onChange={(event) => setSkipReason(event.target.value)} placeholder="편성을 건너뛰는 이유를 기록해 주세요" />
            </label>
            <Button type="button" className="mt-2" variant="ghost" size="sm" disabled={busy || !skipReason.trim()} onClick={() => onSkip(skipReason)}>
              발행하지 않음으로 기록
            </Button>
          </div>
        )}

        {issue?.status === 'review_ready' && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-sm text-ink-2">정책 검사를 통과했습니다. 출처와 공개 미리보기를 마지막으로 확인해 주세요.</p>
            <Button type="button" className="mt-3" disabled={busy || !sourceReady} onClick={onApprove}>담당자 승인</Button>
          </div>
        )}

        {issue?.status === 'approved' && (
          <div className="mt-5 border-t border-line pt-4">
            <label className="block text-xs font-bold text-ink-2">
              발행 예약 · 한국 시간(KST)
              <Input className="mt-1 max-w-xs font-mono tabular-nums" type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
            </label>
            <Button type="button" className="mt-3" disabled={busy || !scheduleAt} onClick={() => onSchedule(scheduleAt)}>예약 확정</Button>
          </div>
        )}
      </section>
      <PublicPreview draft={draft} />
    </div>
  );
}
