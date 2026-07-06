/**
 * AdminDataRequestsPage — 데이터 정정/삭제/이의제기 요청 처리 (TRAINORACLE)
 * /admin/data-requests
 *
 * "Notice & Graduated Takedown" 4·5층(단계별 처리)의 관리자 화면.
 * 직접 회신이 아닌 로그/게시판형으로 누적된 요청을 검토하고 상태를 전환합니다.
 *   received → under_review(마스킹) | search_hidden(검색 비노출) → removed(제외) | restored(원복)
 *
 * 정책 원칙: 공식 결과는 원칙적으로 보존하고, 삭제는 예외적으로만 처리한다.
 * 기본 대응은 삭제가 아니라 검색 비노출(search_hidden, de-index)이다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import {
  adminListDataRequests,
  adminUpdateDataRequest,
  STATUS_LABELS,
  TYPE_LABELS,
  type AdminDataRequest,
  type DataRequestStatus,
  type Suppression,
} from '../../api/dataRequests';

const STATUS_FILTERS: { value: DataRequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'received', label: '접수됨' },
  { value: 'search_hidden', label: '검색 비노출' },
  { value: 'under_review', label: '검토 중' },
  { value: 'corrected', label: '정정됨' },
  { value: 'removed', label: '삭제됨' },
  { value: 'restored', label: '유지' },
];

const STATUS_COLOR: Record<DataRequestStatus, string> = {
  received: 'text-brand-600',
  under_review: 'text-warn',
  search_hidden: 'text-brand-500',
  corrected: 'text-ok',
  removed: 'text-err',
  restored: 'text-ok',
};

export default function AdminDataRequestsPage() {
  const [filter, setFilter] = useState<DataRequestStatus | 'all'>('all');
  const [requests, setRequests] = useState<AdminDataRequest[]>([]);
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { requests: r, suppressions: s } = await adminListDataRequests(
        filter === 'all' ? undefined : filter,
      );
      setRequests(r);
      setSuppressions(s);
    } catch {
      setError('요청 목록을 불러오지 못했습니다. (관리자 인증 필요)');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(ticketId: string, status: DataRequestStatus) {
    setBusy(ticketId);
    try {
      await adminUpdateDataRequest(ticketId, status);
      await load();
    } catch {
      setError('상태 변경에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <span className="font-mono text-mono-xs uppercase tracking-widest-2 text-brand-500">
          DATA REQUESTS
        </span>
        <h1 className="mt-1 text-h2 font-medium tracking-tighter-2 text-ink">
          정정 · 삭제 요청 처리
        </h1>
        <p className="mt-1 text-body-sm text-ink-3">
          공식 결과는 원칙적으로 보존하고, 기본 대응은 <strong className="text-ink-2">검색 비노출</strong>입니다.
          삭제는 예외적인 경우에만 적용하세요.
        </p>
        <ul className="mt-2 space-y-0.5 text-caption text-ink-4">
          <li>· 검색 비노출: 결과표에는 남지만 이름·소속 검색과 추천 화면에서 제외</li>
          <li>· 검토 중(마스킹): 결과표·검색 모두 “비공개 요청 처리 중”으로 표시</li>
          <li>· 삭제: 예외적으로 모든 노출에서 제외</li>
        </ul>
      </header>

      {/* 활성 suppression 요약 */}
      <div className="border border-hair bg-surface-2 px-4 py-3">
        <span className="font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">
          ACTIVE SUPPRESSIONS
        </span>
        <p className="mt-1 text-body-sm text-ink-2">
          현재 {suppressions.length}건 적용 중 · 검색 비노출{' '}
          {suppressions.filter((s) => s.mode === 'hide').length} · 마스킹{' '}
          {suppressions.filter((s) => s.mode === 'mask').length} · 삭제{' '}
          {suppressions.filter((s) => s.mode === 'remove').length}
        </p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`border px-3 py-1.5 text-caption transition-colors ${
              filter === f.value
                ? 'border-brand-500 bg-brand-50 text-brand-600'
                : 'border-hair bg-surface text-ink-3 hover:border-line-2'
            }`}
          >
            {f.label}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={load} className="ml-auto">
          새로고침
        </Button>
      </div>

      {error && (
        <p className="border border-err/30 bg-err/5 px-3 py-2 text-body-sm text-err">{error}</p>
      )}

      {/* 목록 */}
      {loading ? (
        <p className="text-body-sm text-ink-3">불러오는 중…</p>
      ) : requests.length === 0 ? (
        <p className="border border-hair bg-surface px-4 py-8 text-center text-body-sm text-ink-4">
          해당 상태의 요청이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <article key={r.ticketId} className="border border-hair bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hair bg-surface-2 px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-body-sm text-ink">{r.ticketId}</span>
                  <span className="border border-hair bg-surface px-2 py-0.5 text-caption text-ink-2">
                    {TYPE_LABELS[r.type]}
                  </span>
                </div>
                <span
                  className={`font-mono text-mono-xs uppercase tracking-widest-2 ${STATUS_COLOR[r.status]}`}
                >
                  {STATUS_LABELS[r.status]}
                </span>
              </div>

              <div className="space-y-3 px-4 py-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-caption sm:grid-cols-4">
                  <Cell label="선수명" value={r.athleteName} />
                  <Cell label="소속" value={r.affiliation || '—'} />
                  <Cell label="대회" value={r.competition || '—'} />
                  <Cell label="종목" value={r.event || '—'} />
                </dl>
                <div>
                  <p className="text-caption uppercase tracking-wider-2 text-ink-4">사유</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-body-sm text-ink-2">{r.reason}</p>
                </div>
                {r.contact && (
                  <div>
                    <p className="text-caption uppercase tracking-wider-2 text-ink-4">연락처</p>
                    <p className="mt-0.5 text-body-sm text-ink-2">{r.contact}</p>
                  </div>
                )}
                <p className="font-mono text-mono-xs text-ink-4">
                  접수 {new Date(r.receivedAt).toLocaleString('ko-KR')} · 갱신{' '}
                  {new Date(r.updatedAt).toLocaleString('ko-KR')}
                </p>

                {/* 처리 버튼 — 기본 권장은 “검색 비노출”, 삭제는 예외적 조치 */}
                <div className="flex flex-wrap gap-2 border-t border-hair pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.ticketId || r.status === 'search_hidden'}
                    onClick={() => changeStatus(r.ticketId, 'search_hidden')}
                    title="결과표에는 남기고 이름·소속 검색·추천 화면에서만 제외"
                  >
                    검색 비노출
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.ticketId || r.status === 'under_review'}
                    onClick={() => changeStatus(r.ticketId, 'under_review')}
                  >
                    검토중(마스킹)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === r.ticketId || r.status === 'corrected'}
                    onClick={() => changeStatus(r.ticketId, 'corrected')}
                  >
                    정정 완료
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === r.ticketId || r.status === 'removed'}
                    onClick={() => changeStatus(r.ticketId, 'removed')}
                    title="예외적 조치: 모든 노출에서 제외"
                  >
                    삭제(예외)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === r.ticketId || r.status === 'restored'}
                    onClick={() => changeStatus(r.ticketId, 'restored')}
                  >
                    유지(원복)
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-4">{label}</dt>
      <dd className="text-ink-2">{value}</dd>
    </div>
  );
}
