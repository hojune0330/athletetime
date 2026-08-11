/**
 * DataRequestPage — 데이터 정정/삭제/이의제기 요청 페이지 (TRAINORACLE)
 * /data-request
 *
 * "Notice & Graduated Takedown" 3층(요청 접수)의 사용자 진입점.
 * 직접 연락(이메일) 대신 폼 제출 → 접수증(티켓 ID) 발급 → 관리자 검토.
 *
 * 두 모드:
 *   1) 요청 폼 (정정/삭제/이의제기)
 *   2) 접수 번호로 처리 상태 조회
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  submitDataRequest,
  getDataRequestStatus,
  STATUS_LABELS,
  STATUS_DESCRIPTIONS,
  TYPE_LABELS,
  type DataRequestType,
  type DataRequestReceipt,
  type DataRequestStatusInfo,
} from '../api/dataRequests';
import { resolveDataRequestType, resolvePrefilledAthleteName } from './dataRequestFormState';
import { DataRequestIntro } from './data-request/DataRequestIntro';
import { DataRequestReceipt as DataRequestReceiptCard } from './data-request/DataRequestReceipt';

const REQUEST_TYPE_OPTIONS: { value: DataRequestType; label: string; desc: string }[] = [
  { value: 'correction', label: '정정', desc: '기록·소속 등 정보가 사실과 다릅니다' },
  { value: 'deletion', label: '검색 비노출 · 삭제', desc: '내 이름이 검색·인사이트로 노출되지 않기를 원합니다' },
  { value: 'objection', label: '이의 제기', desc: '게시 자체에 이의가 있습니다' },
];

export default function DataRequestPage() {
  const [searchParams] = useSearchParams();
  const requestedType = resolveDataRequestType(searchParams.get('type'));
  const requestedAthleteName = resolvePrefilledAthleteName(searchParams.get('athlete'));
  const [type, setType] = useState<DataRequestType>(requestedType);
  const [athleteName, setAthleteName] = useState(requestedAthleteName);
  const [affiliation, setAffiliation] = useState('');
  const [competition, setCompetition] = useState('');
  const [event, setEvent] = useState('');
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DataRequestReceipt | null>(null);

  // 상태 조회
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<DataRequestStatusInfo | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    setType(requestedType);
    setAthleteName(requestedAthleteName);
  }, [requestedAthleteName, requestedType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!athleteName.trim()) {
      setError('대상 선수명(또는 식별 정보)을 입력해 주세요.');
      return;
    }
    if (!reason.trim()) {
      setError('요청 사유를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await submitDataRequest({
        type,
        athleteName: athleteName.trim(),
        affiliation: affiliation.trim() || undefined,
        competition: competition.trim() || undefined,
        event: event.trim() || undefined,
        reason: reason.trim(),
        contact: contact.trim() || undefined,
      });
      setReceipt(r);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        '요청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    if (!lookupId.trim()) {
      setLookupError('접수 번호를 입력해 주세요.');
      return;
    }
    setLookingUp(true);
    try {
      const info = await getDataRequestStatus(lookupId.trim());
      setLookupResult(info);
    } catch {
      setLookupError('해당 접수 번호를 찾을 수 없습니다.');
    } finally {
      setLookingUp(false);
    }
  }

  // ── 접수 완료(접수증) 화면 ──
  if (receipt) {
    return (
      <DataRequestReceiptCard
        receipt={receipt}
        onLookup={(ticketId) => { setLookupId(ticketId); setReceipt(null); }}
        onNewRequest={() => {
          setReceipt(null); setAthleteName(''); setAffiliation(''); setCompetition('');
          setEvent(''); setReason(''); setContact('');
        }}
      />
    );
  }

  // ── 기본(폼 + 조회) 화면 ──
  return (
    <div className="mx-auto max-w-article px-4 py-10">
      <DataRequestIntro />

      {/* 요청 폼 */}
      <form onSubmit={handleSubmit} className="border border-hair bg-surface">
        <div className="border-b border-hair bg-surface-2 px-5 py-3">
          <h2 className="text-h3 font-medium text-ink">요청서 작성</h2>
        </div>
        <div className="space-y-5 px-5 py-6">
          {/* 유형 선택 */}
          <fieldset>
            <legend className="mb-2 text-caption uppercase tracking-wider-2 text-ink-4">
              요청 유형
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {REQUEST_TYPE_OPTIONS.map((opt) => {
                const active = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)} aria-pressed={active}
                    className={`border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                      active
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-hair bg-surface hover:border-line-2 hover:bg-surface-2'
                    }`}
                  >
                    <span
                      className={`block text-body-sm font-medium ${
                        active ? 'text-brand-600' : 'text-ink-2'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-caption text-ink-3">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field label="대상 선수명" required>
            <Input
              value={athleteName}
              onChange={(e) => setAthleteName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="소속 (선택)">
              <Input
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="소속을 입력하세요"
              />
            </Field>
            <Field label="종목 (선택)">
              <Input
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="종목을 입력하세요"
              />
            </Field>
          </div>

          <Field label="대회명 (선택)">
            <Input
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              placeholder="대회명을 입력하세요"
            />
          </Field>

          <Field label="요청 사유" required>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              aria-describedby="request-sensitive-guidance"
              placeholder="정정/삭제를 요청하시는 사유를 적어 주세요."
              className="flex w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-ink transition-colors placeholder:text-ink-4 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </Field>

          <p id="request-sensitive-guidance" className="-mt-2 text-caption leading-relaxed text-ink-4">
            요청 사유에는 주민등록번호·전화번호·이메일을 적을 수 없어요. 회신이 필요하면 아래 연락처 칸에만 적어 주세요. 사진·진단서도 보내지 마세요.
          </p>

          <Field label="회신용 연락처 (선택)">
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="필요 시 입력 — 미입력 시 접수 번호로만 조회"
            />
          </Field>

          {error && (
            <p className="border border-err/30 bg-err/5 px-3 py-2 text-body-sm text-err">{error}</p>
          )}

          <div className="flex items-center gap-3 border-t border-hair pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? '접수 중…' : '요청 접수'}
            </Button>
            <p className="text-caption text-ink-4">접수 후 접수 번호가 발급됩니다.</p>
          </div>
        </div>
      </form>

      {/* 상태 조회 */}
      <section className="mt-8 border border-hair bg-surface">
        <div className="border-b border-hair bg-surface-2 px-5 py-3">
          <h2 className="text-h3 font-medium text-ink">접수 번호로 처리 상태 조회</h2>
        </div>
        <form onSubmit={handleLookup} className="space-y-4 px-5 py-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="접수 번호를 입력하세요"
              className="font-mono"
            />
            <Button type="submit" variant="outline" disabled={lookingUp} className="shrink-0">
              {lookingUp ? '조회 중…' : '조회'}
            </Button>
          </div>

          {lookupError && <p className="text-body-sm text-err">{lookupError}</p>}

          {lookupResult && (
            <div className="border border-hair bg-surface-2 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-body text-ink">{lookupId}</span>
                <span className="border border-hair bg-surface px-2 py-0.5 font-mono text-mono-xs uppercase tracking-widest-2 text-brand-600">
                  {STATUS_LABELS[lookupResult.status]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-caption text-ink-3">
                <div>
                  <dt className="text-ink-4">유형</dt>
                  <dd className="text-ink-2">{TYPE_LABELS[lookupResult.type]}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">접수일</dt>
                  <dd className="font-mono text-ink-2">
                    {new Date(lookupResult.receivedAt).toLocaleString('ko-KR')}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-hair pt-3 text-caption leading-relaxed text-ink-3">
                {STATUS_DESCRIPTIONS[lookupResult.status]}
              </p>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-caption uppercase tracking-wider-2 text-ink-4">
        {label}
        {required && <span className="ml-1 text-err">*</span>}
      </span>
      {children}
    </label>
  );
}
