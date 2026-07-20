import type { EditorialIssue, EditorialSectionKey } from '../../../api/editorialAdmin';

export const WORKFLOW_TABS = [
  { key: 'candidate', label: '후보' },
  { key: 'draft', label: '초안' },
  { key: 'review', label: '검토 대기' },
  { key: 'scheduled', label: '예약' },
  { key: 'published', label: '발행' },
  { key: 'corrected', label: '정정' },
] as const;

export type WorkflowTab = (typeof WORKFLOW_TABS)[number]['key'];

export const SECTION_LABELS: Readonly<Record<EditorialSectionKey, string>> = {
  'competition-preview': '이번 대회',
  'record-story': '기록 이야기',
  international: '국제',
  'road-marathon': '로드·마라톤',
  indoor: '실내',
  archive: '아카이브',
};

export function issueMatchesTab(issue: EditorialIssue, tab: WorkflowTab): boolean {
  switch (tab) {
    case 'draft':
      return issue.status === 'draft';
    case 'review':
      return issue.status === 'review_ready' || issue.status === 'approved';
    case 'scheduled':
      return issue.status === 'scheduled';
    case 'published':
      return issue.status === 'published';
    case 'corrected':
      return issue.status === 'corrected' || issue.status === 'unpublished';
    case 'candidate':
      return false;
    default:
      return false;
  }
}

export function formatKst(value: string | null): string {
  if (!value) return '일정 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '시각 확인 필요';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
