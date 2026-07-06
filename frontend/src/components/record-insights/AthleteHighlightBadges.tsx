import type { AthleteAnalyticsProfile, PublicRecord } from '../../api/recordAnalytics';
import { TRUST_NOTICE_COMBO, isLikelyMinorDivision } from '../../config/dataPolicy';

/**
 * 선수의 기록 중 미성년 부문이 섞여 있는지 추정. (#2)
 * 결과 노출은 막지 않되, "능동적 증폭(하이라이트)"임을 인지하고 톤을 더 보수적으로.
 * division 텍스트 기반 추정이라 100% 정확하지 않다 → 차단이 아니라 신호로만 사용.
 */
function hasMinorRecords(records: PublicRecord[]): boolean {
  return records.some((r) => isLikelyMinorDivision(r.divisionLabel));
}

/**
 * 선수 하이라이트 배지 — "놀람 트리거" (자랑하고 싶게 만드는 사실값).
 *
 * 신뢰 원칙:
 * - 평가어("우수/최강/뛰어남") 금지 → "가장 많이 줄어든 종목" 같은 사실 라벨만.
 * - 타인 비교 없음. 전부 "이 선수 자신의" 기록 안에서의 사실.
 * - "모은 범위 안에서"임을 카드 하단에 고지.
 * - 표본 부족(기록 1건 등)하면 해당 배지는 조용히 숨김.
 * - 성장폭(delta)은 같은 종목·같은 단위 안에서만 계산(단위 혼합 금지).
 */

type Badge = {
  key: string;
  label: string; // 사실 라벨 (예: "최다 출전 종목")
  value: string; // 사실 값 (예: "5000m")
  sub?: string; // 보조 설명 (예: "8경기")
};

const ABS = (n: number) => Math.abs(n);

// 같은 종목 안에서 비교 가능한 기록만으로 "처음→마지막" 변화량을 사실값으로 계산.
function eventDelta(records: PublicRecord[], eventKey: string): { display: string; magnitude: number; eventLabel: string } | null {
  const pts = records
    .filter((r) => r.eventKey === eventKey && r.isComparable && Number.isFinite(r.recordValue))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (pts.length < 2) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const raw = last.recordValue - first.recordValue;
  if (raw === 0) return null;
  // 방향(낮을수록/높을수록 좋음)은 평가가 아니라 변화 방향 부호로만 표현.
  const sign = raw > 0 ? '+' : '−';
  return {
    display: `${sign}${ABS(raw).toFixed(2)}`,
    magnitude: ABS(raw),
    eventLabel: first.eventLabel,
  };
}

function buildBadges(profile: AthleteAnalyticsProfile): Badge[] {
  const badges: Badge[] = [];
  const { events, records, athlete } = profile;

  // 1) 최다 출전 종목 (기록 수 기준)
  if (events.length >= 1) {
    const top = events.slice().sort((a, b) => b.recordCount - a.recordCount)[0];
    if (top && top.recordCount >= 2) {
      badges.push({
        key: 'top-event',
        label: '기록이 가장 많은 종목',
        value: top.eventLabel,
        sub: `${top.recordCount}건`,
      });
    }
  }

  // 2) 다종목 도전 (2종목 이상일 때만 — 1종목 선수에겐 의미 없음)
  if (events.length >= 2) {
    badges.push({
      key: 'multi-event',
      label: '모은 기록이 있는 종목',
      value: `${events.length}종목`,
      sub: events
        .slice()
        .sort((a, b) => b.recordCount - a.recordCount)
        .slice(0, 3)
        .map((e) => e.eventLabel)
        .join(' · '),
    });
  }

  // 3) 출전 연도 폭 (2개 연도 이상일 때만)
  const years = (athlete.years || []).filter((y) => Number.isFinite(y)).slice().sort((a, b) => a - b);
  if (years.length >= 2) {
    const span = years[years.length - 1] - years[0] + 1;
    badges.push({
      key: 'year-span',
      label: '기록을 모은 기간',
      value: `${years[0]}–${years[years.length - 1]}`,
      sub: `${years.length}개 연도`,
    });
    // 꾸준함: 연속 연도 최장 구간
    let best = 1;
    let cur = 1;
    for (let i = 1; i < years.length; i += 1) {
      if (years[i] === years[i - 1] + 1) {
        cur += 1;
        best = Math.max(best, cur);
      } else {
        cur = 1;
      }
    }
    void span;
    if (best >= 3) {
      badges.push({
        key: 'streak',
        label: '연속으로 기록을 모은 해',
        value: `${best}년 연속`,
      });
    }
  }

  // 4) 가장 변화폭이 큰 종목 (같은 종목 안, 사실값)
  let bestDelta: { display: string; magnitude: number; eventLabel: string } | null = null;
  for (const ev of events) {
    const d = eventDelta(records, ev.eventKey);
    if (d && (!bestDelta || d.magnitude > bestDelta.magnitude)) {
      bestDelta = d;
    }
  }
  if (bestDelta) {
    badges.push({
      key: 'biggest-change',
      label: '기록 변화가 가장 큰 종목',
      value: bestDelta.eventLabel,
      sub: `처음→최근 ${bestDelta.display}`,
    });
  }

  return badges;
}

export function AthleteHighlightBadges({ profile }: { profile: AthleteAnalyticsProfile }) {
  const badges = buildBadges(profile);
  if (badges.length === 0) return null;

  // 미성년 추정 시: 배지(능동적 하이라이트)는 그대로 보여주되 푸터 톤을 더 보수적으로. (#2)
  const minor = hasMinorRecords(profile.records);

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium text-ink-3">이 선수의 기록에서 눈에 띄는 점</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.key}
            className="rounded-lg border border-line bg-surface-2 px-3 py-2.5"
          >
            <p className="text-[11px] text-ink-4">{b.label}</p>
            <p className="mt-0.5 text-base font-semibold text-ink">{b.value}</p>
            {b.sub ? <p className="mt-0.5 text-xs text-ink-3">{b.sub}</p> : null}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-ink-4">
        {TRUST_NOTICE_COMBO.badgesFooter}
        {minor ? ' 어린 선수의 기록은 더 조심스럽게 다뤄요.' : ''}
      </p>
    </div>
  );
}
