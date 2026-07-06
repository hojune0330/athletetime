import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { getInsightProfile } from '../api/insights';
import { recordCorrectionUrl, type AthleteProfile, type AthleteRecord } from '../data/athleteRecords';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

export default function AthleteDetailPage() {
  const { id = '' } = useParams();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    setState('loading');

    getInsightProfile(id)
      .then((liveProfile) => {
        if (!active) return;
        setProfile(liveProfile);
        setState('ready');
      })
      .catch((error) => {
        if (!active) return;
        setState(error?.response?.status === 404 ? 'not-found' : 'error');
      });

    return () => {
      active = false;
    };
  }, [id]);

  const sortedRecords = useMemo(
    () => [...(profile?.records || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [profile],
  );
  const bestRecord = useMemo(() => pickBestRecord(sortedRecords), [sortedRecords]);

  if (state === 'loading') {
    return (
      <div className="rounded-[2rem] border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-500" />
        <p className="mt-4 text-sm font-bold text-neutral-500">선수 기록을 불러오는 중입니다.</p>
      </div>
    );
  }

  if (!profile || state === 'not-found') {
    return (
      <div className="rounded-[2rem] border border-dashed border-neutral-300 bg-white p-8 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-neutral-300" />
        <h1 className="mt-5 text-2xl font-black text-neutral-950">선수 기록을 찾지 못했습니다</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          검색 비노출 처리 중이거나 아직 인사이트에 묶이지 않은 기록일 수 있습니다.
        </p>
        <Link to="/records" className="mt-6 inline-flex rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700">
          검색으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-950 p-6 text-white">
          <p className="text-sm font-semibold text-white/55">선수 기록</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">{profile.name}</h1>
              <p className="mt-2 text-sm font-semibold text-white/65">
                {profile.team || '소속 미상'} · 주종목 {profile.primaryEvent}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
                공개 대회 결과를 한곳에 모았어요. 공식 프로필은 아니에요.
              </p>
            </div>
            {bestRecord && (
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <p className="text-sm font-semibold text-white/55">개인 최고 기록</p>
                <p className="mt-1 text-2xl font-black">{bestRecord.mark}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <StatCard label="기록 수" value={`${profile.records.length}건`} />
          <StatCard label="최근 경기" value={sortedRecords[0]?.date || '-'} />
          <StatCard label="데이터 성격" value="공개 결과 기반" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-950">이 기록은 어디서 왔나요?</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              출처와 수집 시점을 함께 적어뒀어요. 원본은 링크에서 확인하세요.
            </p>
          </div>
          <Link
            to={`${recordCorrectionUrl}?athlete=${encodeURIComponent(profile.name)}`}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-900 bg-white px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-neutral-950 hover:text-white"
          >
            내 기록 빼거나 고치기
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-950">기록 타임라인</h2>
            <p className="mt-1 text-xs text-neutral-500">공개 기록의 흐름이에요. 평가나 예측은 하지 않아요.</p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-500">수집일 표시</span>
        </div>

        <div className="space-y-3">
          {sortedRecords.map((record) => (
            <RecordRow key={record.id} record={record} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-xs font-bold text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-black text-neutral-950">{value}</p>
    </div>
  );
}

function RecordRow({ record }: { record: AthleteRecord }) {
  const sourceDate = formatTrustDate(record.source.capturedAt);
  return (
    <div className="grid gap-3 rounded-2xl border border-neutral-100 p-4 sm:grid-cols-[100px_1fr_auto] sm:items-center">
      <div>
        <p className="text-xs font-bold text-neutral-400">{record.date.slice(0, 4)}</p>
        <p className="text-sm font-black text-neutral-900">{record.date.slice(5) || record.date}</p>
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-neutral-950">{record.competitionName}</p>
          <SourceBadge record={record} />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {record.event} · {record.venue || '장소 미상'} · {record.phase} · {record.rank}위
          {record.wind ? ` · 풍속 ${record.wind}` : ''}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          출처 {record.source.provider}
          {sourceDate ? ` · 수집 ${sourceDate}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <TrophyIcon className="h-4 w-4 text-neutral-400" />
        <span className="text-xl font-black text-neutral-950">{record.mark}</span>
      </div>
    </div>
  );
}

function formatTrustDate(value?: string) {
  if (!value) return '';
  const date = value.slice(0, 10);
  return date === '1970-01-01' ? '' : date;
}

function SourceBadge({ record }: { record: AthleteRecord }) {
  const label = record.source.sourceType === 'public_result' ? '공개 결과' : '참고 데이터';
  const content = (
    <span className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
      <CheckCircleIcon className="h-3 w-3" />
      {label}
      {record.source.sourceUrl && <ArrowTopRightOnSquareIcon className="h-3 w-3" />}
    </span>
  );

  if (!record.source.sourceUrl) return content;

  return (
    <a href={record.source.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-75">
      {content}
    </a>
  );
}

function pickBestRecord(records: AthleteRecord[]) {
  if (records.length === 0) return null;
  return [...records].sort((a, b) => {
    if (a.direction === 'higher' || b.direction === 'higher') return b.value - a.value;
    return a.value - b.value;
  })[0];
}
