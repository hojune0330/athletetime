import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type {
  Competition,
  ProvenanceMeta,
  ResultAthleteRecord,
  SearchResultRow,
} from '../../../api/competitions';

export const CATEGORY_ORDER = [
  { key: 'track_field', label: '트랙&필드', bgClass: 'bg-lime-600' },
  { key: 'road', label: '도로경기', bgClass: 'bg-teal-600' },
  { key: 'single_event', label: '단일종목', bgClass: 'bg-rose-600' },
  { key: 'corporate', label: '실업연맹', bgClass: 'bg-violet-600' },
  { key: 'university', label: '대학연맹', bgClass: 'bg-blue-600' },
  { key: 'junior', label: '중고연맹', bgClass: 'bg-amber-600' },
] as const;

export const STATUS_OPTIONS = [
  { key: '', label: '전체' },
  { key: 'live', label: '🔴 진행 중' },
  { key: 'upcoming', label: '예정' },
  { key: 'finished', label: '종료' },
] as const;

const EVENT_TYPE_INFO: Record<
  string,
  { readonly bg: string; readonly text: string; readonly label: string }
> = {
  track: { bg: 'bg-neutral-100', text: 'text-neutral-700', label: '트랙' },
  field: { bg: 'bg-neutral-100', text: 'text-neutral-700', label: '필드' },
  marathon: { bg: 'bg-neutral-100', text: 'text-neutral-700', label: '마라톤/도로' },
};

export const EVENT_TYPE_FILTERS = [
  { key: '', label: '전체 종목' },
  { key: 'track', label: '트랙' },
  { key: 'field', label: '필드' },
  { key: 'marathon', label: '도로' },
] as const;

export const GENDER_FILTERS = [
  { key: '', label: '전체' },
  { key: '남자', label: '♂ 남자' },
  { key: '여자', label: '♀ 여자' },
  { key: '혼성', label: '⚤ 혼성' },
] as const;

export const currentYear = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index).reverse();

type AthleteLinkRow =
  | Pick<ResultAthleteRecord, 'athleteId' | 'name' | 'provenance'>
  | Pick<SearchResultRow, 'athleteId' | 'name' | 'provenance'>;

export const PROFILE_CARD_NAME_PATTERN = /^[가-힣A-Za-z\s·]{2,20}$/;

function getAthletePath(row: AthleteLinkRow) {
  return row.athleteId ? `/athlete/${encodeURIComponent(row.athleteId)}` : '';
}

function getProfileCardName(name?: string) {
  const trimmedName = name?.trim() || '';
  return PROFILE_CARD_NAME_PATTERN.test(trimmedName) ? trimmedName : '';
}

export function getProfileCardPath(name?: string) {
  const cardName = getProfileCardName(name);
  return cardName ? `/profile-card?name=${encodeURIComponent(cardName)}` : '';
}

export function getProfileCardLabel(name?: string) {
  const cardName = getProfileCardName(name);
  return cardName ? `${cardName} 프로필 카드 만들기` : '프로필 카드 만들기';
}

export function AthleteNameLink({
  row,
  className,
}: {
  readonly row: AthleteLinkRow;
  readonly className?: string;
}) {
  const path = getAthletePath(row);
  if (!path) {
    return <span className={className}>{row.name}</span>;
  }
  return (
    <Link to={path} className={className}>
      {row.name}
    </Link>
  );
}

function getProvenanceLabel(provenance?: ProvenanceMeta) {
  if (!provenance) return 'Public record';
  if (provenance.sourceType === 'public_result') return '공개 결과';
  if (provenance.provider) return `${provenance.provider} result`;
  return 'Public record';
}

function getCapturedDate(provenance?: ProvenanceMeta) {
  return provenance?.capturedAt ? provenance.capturedAt.slice(0, 10) : '';
}

export function ProvenanceBadge({ provenance }: { readonly provenance?: ProvenanceMeta }) {
  const capturedDate = getCapturedDate(provenance);
  return (
    <span className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">
      <span>{getProvenanceLabel(provenance)}</span>
      {capturedDate && <span className="font-medium text-neutral-400">{capturedDate}</span>}
      <span className="font-medium text-neutral-400">공식 아님</span>
    </span>
  );
}

export function formatDateRange(start: string, end: string): string {
  if (!start || start === '미정') return '미정';
  const startParts = start.split('-');
  const endParts = end.split('-');
  if (start === end) return `${parseInt(startParts[1])}월 ${parseInt(startParts[2])}일`;
  if (startParts[1] === endParts[1]) {
    return `${parseInt(startParts[1])}월 ${parseInt(startParts[2])}일~${parseInt(endParts[2])}일`;
  }
  return `${parseInt(startParts[1])}월 ${parseInt(startParts[2])}일~${parseInt(endParts[1])}월 ${parseInt(endParts[2])}일`;
}

export function getEventTypeInfo(eventType: string) {
  return EVENT_TYPE_INFO[eventType] || {
    bg: 'bg-neutral-50',
    text: 'text-neutral-600',
    label: eventType,
  };
}

export function extractGender(eventName: string): string {
  if (eventName.startsWith('남자')) return '남자';
  if (eventName.startsWith('여자')) return '여자';
  if (eventName.startsWith('혼성') || eventName.includes('혼성')) return '혼성';
  return '';
}

export function getRankLabel(rank: number): string {
  return `${rank}위`;
}

export function RankBadge({ rank }: { readonly rank: number }) {
  if (rank <= 0) return <span className="text-sm text-neutral-400">-</span>;
  if (rank <= 3) {
    const colors = [
      'bg-success-500 text-white',
      'bg-neutral-400 text-white',
      'bg-neutral-500 text-white',
    ];
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${colors[rank - 1]}`}
      >
        {rank}
      </span>
    );
  }
  return <span className="text-sm text-neutral-500">{rank}</span>;
}

export function DdayBadge({
  dday,
  status,
}: {
  readonly dday?: Competition['dday'];
  readonly status?: string;
}) {
  if (!dday) return null;
  if (dday.isLive || status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>LIVE
      </span>
    );
  }
  if (status === 'finished') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 bg-neutral-200 text-neutral-500 text-xs font-medium rounded-full">
        종료
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
      {dday.text}
    </span>
  );
}

export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  readonly emoji: string;
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 sm:py-16">
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-lg font-bold text-neutral-700 mb-2">{title}</h3>
      <p className="text-neutral-500 text-sm max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      <span className="text-sm text-neutral-400">데이터를 불러오는 중...</span>
    </div>
  );
}
