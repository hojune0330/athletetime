import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AthleteAnalyticsProfile, PublicRecord } from '../../api/recordAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  SHARE_POLICY,
  MINOR_POLICY,
  formatSourceCompact,
  resolveProviderLabel,
  isLikelyMinorDivision,
} from '../../config/dataPolicy';

/**
 * 공유 카드 (P1-7-4) — #3 "공유 = 발행자 책임"을 카드 자체가 떠안도록 설계.
 *
 * 설계 원칙 (2026-06-12)
 * - 본인 기록 중심: "내 기록일 때 공유"를 권장(SHARE_POLICY.ownerConfirmNotice).
 * - 발행=책임: 카드 위에 항상 출처·성격(공식 아님)·워터마크가 박힌다(제거 불가).
 *   → 카드를 누가 어디로 퍼뜨려도 "무엇인지"가 따라간다.
 * - 미성년 증폭 절제: 미성년 부문 추정이면 화려한 강조 대신 보호자 동의 안내를 띄운다.
 *   (보여주기는 동일, "퍼뜨리기"만 절제 — MINOR_POLICY.guardShareAmplification)
 * - 금지어 회피: 순위/평가/우열/공식(긍정) 미사용. 신기록 자동 강조 없음.
 *
 * 저장 방식: html2canvas(이미 의존성에 존재)로 카드 DOM을 PNG로 떠서 다운로드.
 *   외부 전송 없음 — 전부 브라우저 안에서 처리(개인정보·서버 부담 0).
 */

type Props = {
  profile: AthleteAnalyticsProfile;
  onClose?: () => void;
};

function pickRecord(profile: AthleteAnalyticsProfile): PublicRecord | null {
  return profile.summary.indexedBest || profile.summary.latest || profile.records[0] || null;
}

export function ShareCard({ profile, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const athlete = profile.athlete;
  const record = pickRecord(profile);
  const isMinor = record ? isLikelyMinorDivision(record.divisionLabel) : false;
  const providerLabel = resolveProviderLabel(record?.source?.provider);
  const sourceCompact = formatSourceCompact({
    provider: record?.source?.provider,
    competitionName: record?.competitionName,
    date: record?.date,
  });

  const shareText = record
    ? `${athlete.name} · ${record.eventLabel} ${record.record} (${record.competitionName}, ${record.date})\n— ${sourceCompact} · ${SHARE_POLICY.cardBadge}`
    : `${athlete.name} — ${sourceCompact} · ${SHARE_POLICY.cardBadge}`;

  async function handleSaveImage() {
    if (!cardRef.current) return;
    setBusy(true);
    setMsg(null);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#07302E',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `athletetime-${athlete.name}-기록카드.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setMsg('이미지를 저장했어요.');
    } catch {
      setMsg('이미지 저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setMsg('기록 문구를 복사했어요.');
    } catch {
      setMsg('복사에 실패했어요. 문구를 길게 눌러 직접 복사해 주세요.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>공유 카드</CardTitle>
            <p className="mt-1 text-sm text-ink-3">{SHARE_POLICY.ownerConfirmNotice}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-3 transition hover:bg-surface-2"
            >
              닫기
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 미성년 추정 시 — 증폭 절제 안내 (차단이 아니라 환기) */}
        {isMinor && MINOR_POLICY.guardShareAmplification ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            {MINOR_POLICY.shareGuardNotice}
          </p>
        ) : null}

        {/* ── 캡처 대상 카드 (워터마크·출처·성격 항상 포함, 제거 불가) ── */}
        <div className="overflow-hidden rounded-lg border border-line">
          <div
            ref={cardRef}
            className="relative flex flex-col gap-5 p-6 text-white"
            style={{ background: 'linear-gradient(160deg,#0A4D49 0%,#07302E 100%)' }}
          >
            {/* 상단: 성격 배지 (제거 불가) */}
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/85">
                {SHARE_POLICY.cardBadge}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
                {SHARE_POLICY.watermark}
              </span>
            </div>

            {/* 선수 */}
            <div>
              <p className="text-2xl font-semibold leading-tight">{athlete.name}</p>
              <p className="mt-1 text-sm text-white/70">
                {athlete.team || '소속 미상'}
                {athlete.years?.length ? ` · ${athlete.years[0]}–${athlete.years[athlete.years.length - 1]}` : ''}
              </p>
            </div>

            {/* 대표 기록 */}
            {record ? (
              <div className="rounded-lg bg-white/8 px-4 py-4">
                <p className="text-xs text-white/60">{record.eventLabel}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">{record.record || '기록 미상'}</p>
                <p className="mt-2 text-xs leading-5 text-white/65">
                  {record.competitionName} · {record.date}
                  {!record.windLegal ? ' · 참고용(풍속 초과)' : ''}
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-white/8 px-4 py-4 text-sm text-white/70">모은 기록이 아직 없어요.</div>
            )}

            {/* 하단: 출처·성격 (제거 불가) */}
            <div className="border-t border-white/15 pt-3">
              <p className="text-[11px] leading-4 text-white/70">
                출처 {providerLabel} — AthleteTime이 모아 정리
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-white/55">
                {SHARE_POLICY.cardFooterNotice}
              </p>
            </div>
          </div>
        </div>

        {/* 액션 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSaveImage} disabled={busy}>
            {busy ? '저장 중…' : SHARE_POLICY.saveImageLabel}
          </Button>
          <Button variant="outline" onClick={handleCopyText} disabled={busy}>
            {SHARE_POLICY.copyTextLabel}
          </Button>
          <Link
            to={`/community?record=${encodeURIComponent(athlete.name)}`}
            className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            커뮤니티에서 이야기하기
          </Link>
          {msg ? <span className="text-xs text-ink-3">{msg}</span> : null}
        </div>

        <p className="text-[11px] leading-4 text-ink-4">
          {SHARE_POLICY.cardFooterNotice} 카드의 출처·워터마크는 지울 수 없어요.
        </p>
      </CardContent>
    </Card>
  );
}
