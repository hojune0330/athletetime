import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

/**
 * TRAINORACLE — Loading primitives
 *
 * 1) `<LoadingState text="..." />`  — 페이지·섹션 단위 스켈레톤 (PaceRisePage 패턴 승계)
 * 2) `<BusySpinner />`              — 버튼 안 작은 인디케이터 (white border, 클릭 잠금시 사용)
 * 3) `<CenteredSpinner />`          — 풀페이지 단위 큰 스피너 (primary-500)
 *
 * 디자인 원칙 (토스식 즉시 반응):
 * - 스켈레톤을 우선 노출(레이아웃 시프트 방지)
 * - 스피너는 액션 버튼 안에만 사용 (페이지 진입은 스켈레톤)
 * - `motion-reduce:animate-none` 으로 접근성 준수
 */

function LoadingState({
  text = "데이터를 불러오는 중...",
  rows = 3,
  className,
}: {
  text?: string;
  rows?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}) {
  const widths = ["w-full", "w-5/6", "w-full", "w-3/4", "w-4/5"];
  const safeRows = Math.min(Math.max(1, rows), 5);
  return (
    <div
      className={cn("flex flex-col gap-3 py-6", className)}
      role="status"
      aria-live="polite"
    >
      {Array.from({ length: safeRows }).map((_, i) => (
        <Skeleton key={i} className={cn("h-14", widths[safeRows - 1 - i] ?? "w-full")} />
      ))}
      <p className="mt-2 text-sm text-ink-3">{text}</p>
    </div>
  );
}

type SpinnerTone = "white" | "ink" | "neutral" | "brand";

function BusySpinner({
  className,
  tone = "white",
  size = "sm",
}: {
  className?: string;
  tone?: SpinnerTone;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-4 w-4 border-2" : "h-5 w-5 border-2";
  const toneCls =
    tone === "white"
      ? "border-white border-t-transparent"
      : tone === "ink"
        ? "border-ink/80 border-t-transparent"
        : tone === "neutral"
          ? "border-neutral-500 border-t-transparent"
          : "border-brand border-t-transparent";
  return (
    <span
      role="status"
      aria-label="처리 중"
      className={cn(
        dim,
        "inline-block rounded-full animate-spin motion-reduce:animate-none",
        toneCls,
        className,
      )}
    />
  );
}

function CenteredSpinner({
  text,
  size = "lg",
  className,
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "h-6 w-6 border-2" : size === "md" ? "h-8 w-8 border-[3px]" : "h-10 w-10 border-4";
  return (
    <div
      className={cn(
        "mx-auto flex flex-col items-center justify-center gap-3 py-10",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          dim,
          "rounded-full border-primary-500 border-t-transparent animate-spin motion-reduce:animate-none",
        )}
      />
      {text ? <p className="text-sm text-ink-3">{text}</p> : null}
    </div>
  );
}

export { LoadingState, BusySpinner, CenteredSpinner };
