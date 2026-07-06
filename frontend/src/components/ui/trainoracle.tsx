import * as React from 'react';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════
// TRAINORACLE domain primitives — Scientific Minimalism
// Ported from docs/design-system-trainoracle/ui_kits/trainoracle-app/Primitives.jsx
// Rule: color is information, never decoration. Mono for all numerics.
// ════════════════════════════════════════════════════════════════════

// ── Energy systems ──────────────────────────────────────────────────
export type EnergySystem = 'base' | 'lt' | 'vo2' | 'gly' | 'atp' | 'rest';

export const ENERGY: Record<EnergySystem, { code: string; name: string; color: string }> = {
  base: { code: 'BA', name: 'BASE', color: 'var(--e-base)' },
  lt: { code: 'LT', name: 'Lactate', color: 'var(--e-lt)' },
  vo2: { code: 'V2', name: 'VO2-Long', color: 'var(--e-vo2)' },
  gly: { code: 'GL', name: 'Glycolytic', color: 'var(--e-gly)' },
  atp: { code: 'AP', name: 'ATP-PC', color: 'var(--e-atp)' },
  rest: { code: 'RE', name: 'Recovery', color: 'var(--e-rest)' },
};

/**
 * EnergyTag — 7px dot + 2-char mono code + underlined name.
 * Energy color appears ONLY as the dot + underline, never as a fill.
 */
export function EnergyTag({
  system = 'vo2',
  name,
  className,
}: {
  system?: EnergySystem;
  name?: string;
  className?: string;
}) {
  const e = ENERGY[system] ?? ENERGY.vo2;
  return (
    <span className={cn('inline-flex items-center gap-1.5 align-middle', className)}>
      <span
        className="h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: e.color }}
        aria-hidden
      />
      <span className="font-mono text-[11px] font-semibold tracking-wider-2 text-ink">{e.code}</span>
      <span
        className="border-b-[1.5px] pb-px font-sans text-[12.5px] font-medium"
        style={{ color: e.color, borderColor: e.color }}
      >
        {name ?? e.name}
      </span>
    </span>
  );
}

// ── MainMark ────────────────────────────────────────────────────────
/** MAIN session marker — solid ink chip, mono caps. */
export function MainMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center bg-ink px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest-2 text-bg',
        className,
      )}
    >
      MAIN
    </span>
  );
}

// ── Verdict ─────────────────────────────────────────────────────────
export type VerdictKind = 'confirm' | 'recommend' | 'unc' | 'lack';

const VERDICT: Record<VerdictKind, { label: string; color: string }> = {
  confirm: { label: 'CONFIRM', color: 'var(--ok)' },
  recommend: { label: 'RECOMMEND', color: 'var(--brand)' },
  unc: { label: 'UNC', color: 'var(--unc)' },
  lack: { label: 'LACK', color: 'var(--warn)' },
};

/**
 * Verdict — AI judgement label with optional confidence %.
 * Per brand rule, AI output always carries verdict + confidence.
 */
export function Verdict({
  kind = 'recommend',
  confidence,
  className,
}: {
  kind?: VerdictKind;
  confidence?: number;
  className?: string;
}) {
  const v = VERDICT[kind];
  return (
    <span
      className={cn(
        'inline-block border-b-[1.5px] pb-px font-mono text-[10px] font-semibold uppercase tracking-widest-2',
        className,
      )}
      style={{ color: v.color, borderColor: v.color }}
    >
      {v.label}
      {confidence != null ? ` · ${confidence}%` : ''}
    </span>
  );
}

// ── MetricCell ──────────────────────────────────────────────────────
type MetricSubKind = 'up' | 'down' | 'warn' | 'neutral';

const SUB_COLOR: Record<MetricSubKind, string> = {
  up: 'var(--ok)',
  down: 'var(--err)',
  warn: 'var(--warn)',
  neutral: 'var(--ink-3)',
};

/**
 * MetricCell — labelled tabular-numeric value with optional delta.
 * Designed to sit in a hairline-divided row.
 */
export function MetricCell({
  label,
  value,
  unit,
  sub,
  subKind = 'neutral',
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  subKind?: MetricSubKind;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 flex-1 border-r border-hair px-3.5 py-3.5 last:border-r-0', className)}>
      <div className="font-mono text-[9.5px] font-medium uppercase tracking-widest-2 text-ink-3">
        {label}
      </div>
      <div className="mt-1.5 font-mono text-[22px] font-medium leading-none tracking-tighter-2 text-ink [font-variant-numeric:tabular-nums]">
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-normal text-ink-3">{unit}</span>}
      </div>
      {sub && (
        <div className="mt-1 font-mono text-[10px] tracking-wide" style={{ color: SUB_COLOR[subKind] }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── SectionHeader ───────────────────────────────────────────────────
/** Plain, readable section label with optional inline action.
 *  (예전엔 'A · 제목' 같은 모노스페이스 영문 인덱스였지만, 일반 사용자에게는
 *   불필요하게 어렵게 보여서 자연스러운 한글 라벨로 되돌렸다. `no`는 호환용으로 남기되 표시하지 않는다.) */
export function SectionHeader({
  no: _no,
  title,
  action,
  onAction,
  className,
}: {
  no?: string;
  title: React.ReactNode;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('mb-3.5 flex items-baseline justify-between', className)}>
      <div className="text-body-sm font-semibold text-ink-3">
        {title}
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="cursor-pointer bg-transparent p-0 text-body-sm text-ink-2 underline underline-offset-[3px] hover:text-ink"
        >
          {action}
        </button>
      )}
    </div>
  );
}
