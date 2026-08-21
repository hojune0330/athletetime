import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ContentStudioDraft } from './contentStudioWorkflow';

type ContentStudioEditorProps = {
  readonly draft: ContentStudioDraft;
  readonly qaIssues: readonly string[];
  readonly aiResult: string;
  readonly status: string;
  readonly exporting: boolean;
  readonly onDraftChange: (changes: Partial<ContentStudioDraft>) => void;
  readonly onAiResultChange: (value: string) => void;
  readonly onCopyWorkPacket: () => void;
  readonly onImportAiResult: () => void;
  readonly onExport: () => void;
  readonly onResetDraft: () => void;
};

const textareaClassName = 'min-h-28 w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-4 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/30';

export function ContentStudioEditor({
  draft,
  qaIssues,
  aiResult,
  status,
  exporting,
  onDraftChange,
  onAiResultChange,
  onCopyWorkPacket,
  onImportAiResult,
  onExport,
  onResetDraft,
}: ContentStudioEditorProps) {
  const ready = qaIssues.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>문구 편집</CardTitle>
            <p className="mt-1 break-keep text-body-sm text-ink-3 [text-wrap:pretty]">기록 사실은 잠겨 있고, 편집 내용은 이 기기에만 자동 저장됩니다.</p>
          </div>
          <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={onResetDraft}>
            <TrashIcon /> 초안 지우기
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-body-sm font-semibold text-ink" htmlFor="content-headline">
            제목 <span className="font-normal text-ink-3">{draft.headline.length}/48</span>
          </label>
          <Input
            id="content-headline"
            maxLength={48}
            value={draft.headline}
            onChange={(event) => onDraftChange({ headline: event.target.value })}
            className="h-11"
          />

          <label className="block text-body-sm font-semibold text-ink" htmlFor="content-body">
            본문 <span className="font-normal text-ink-3">{draft.body.length}/220</span>
          </label>
          <textarea
            id="content-body"
            maxLength={220}
            value={draft.body}
            onChange={(event) => onDraftChange({ body: event.target.value })}
            className={textareaClassName}
          />

          <label className="block text-body-sm font-semibold text-ink" htmlFor="content-credit">제작 크레딧</label>
          <Input
            id="content-credit"
            maxLength={80}
            value={draft.credit}
            onChange={(event) => onDraftChange({ credit: event.target.value })}
            className="h-11"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>출처와 권리 점검</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-body-sm">
            <dt className="text-ink-3">선수</dt><dd className="break-keep font-medium text-ink">{draft.athleteName} · {draft.team}</dd>
            <dt className="text-ink-3">기록</dt><dd className="break-keep font-medium text-ink">{draft.eventLabel} · {draft.record}</dd>
            <dt className="text-ink-3">대회</dt><dd className="break-keep text-ink">{draft.competitionName} · {draft.recordDate}</dd>
            <dt className="text-ink-3">출처</dt>
            <dd>
              {draft.sourceUrl ? (
                <a className="inline-flex min-h-11 items-center gap-1 break-all text-brand underline-offset-4 hover:underline" href={draft.sourceUrl} target="_blank" rel="noreferrer">
                  {draft.sourceProvider}<ArrowTopRightOnSquareIcon className="size-4 shrink-0" />
                </a>
              ) : <span className="inline-flex min-h-11 items-center text-warn">출처 URL 확인 필요</span>}
            </dd>
          </dl>

          <label className="flex min-h-11 cursor-pointer items-start gap-3 border border-line bg-surface-2 p-3 text-body-sm text-ink">
            <input
              type="checkbox"
              checked={draft.rightsConfirmed}
              onChange={(event) => onDraftChange({ rightsConfirmed: event.target.checked })}
              className="mt-0.5 size-5 accent-brand"
            />
            <span className="break-keep">공개 출처를 확인했고, 이 카드의 제작과 내부 검수를 진행할 <span className="whitespace-nowrap">권한이 있습니다.</span></span>
          </label>

          <div className={ready ? 'border border-ok/30 bg-ok/5 p-3' : 'border border-warn/40 bg-warn/5 p-3'} role="status">
            <p className="flex items-center gap-2 text-body-sm font-semibold text-ink">
              {ready ? <CheckCircleIcon className="size-5 text-ok" /> : <ExclamationTriangleIcon className="size-5 text-warn" />}
              {ready ? '제작 준비 완료' : `확인할 항목 ${qaIssues.length}개`}
            </p>
            {!ready && <ul className="mt-2 list-disc space-y-1 pl-5 text-caption text-ink-3">{qaIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 문구 협업</CardTitle>
          <p className="text-body-sm text-ink-3">검증된 공개 사실만 작업지시서로 복사하고, AI가 돌려준 JSON에서 제목과 본문만 반영합니다.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" className="w-full" disabled={!ready} onClick={onCopyWorkPacket}>
            <ClipboardDocumentIcon /> AI 작업지시서 복사
          </Button>
          <label className="block text-body-sm font-semibold text-ink" htmlFor="content-ai-result">AI 결과 JSON</label>
          <textarea
            id="content-ai-result"
            value={aiResult}
            onChange={(event) => onAiResultChange(event.target.value)}
            placeholder={'{"headline":"...","body":"..."}'}
            className={textareaClassName}
          />
          <Button type="button" variant="secondary" className="w-full" disabled={!aiResult.trim()} onClick={onImportAiResult}>
            <SparklesIcon /> 문구만 안전하게 반영
          </Button>
          <Button type="button" className="w-full" disabled={!ready || exporting} onClick={onExport}>
            <ArrowDownTrayIcon /> {exporting ? 'PNG 만드는 중...' : '1080 × 1350 PNG 저장'}
          </Button>
          {status && <p className="break-keep text-body-sm text-ink-3" role="status" aria-live="polite">{status}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
