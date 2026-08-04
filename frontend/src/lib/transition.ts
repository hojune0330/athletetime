/**
 * useNavigateWithTransition — 토스 스타일 페이지 전환을 위한 폴백 훅.
 *
 * `document.startViewTransition()`을 감지해 지원 브라우저에서는 View Transition으로,
 * 미지원 브라우저(레거시 Safari 등)나 런타임 예외 시에는 일반 navigate로 안전하게 분기한다.
 *
 * v1.0.0 — 1B (마스터 플랜 1단계)
 * - 기능 감지: 'startViewTransition' in document
 * - 폴백: 미지원 / throw 시 navigate(to, opts) 직접 호출
 * - 타입: Document 확장은 최소한으로 캐스팅 (compat)
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

type TransitionOptions = { replace?: boolean };

/** View Transition API 지원 여부를 감지한다 (테스트에서 주입 가능). */
export function supportsViewTransition(): boolean {
  if (typeof document === 'undefined') return false;
  return 'startViewTransition' in document;
}

/**
 * 내보낸 헤더 — 테스트/디버깅용으로 View Transition을 시작하고 완료 Promise를 반환한다.
 * 폴백 시 `null`을 반환한다.
 */
export function startViewTransition(cb: () => void): (() => void) | null {
  try {
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === 'function') {
      const transition = doc.startViewTransition(() => {
        cb();
      });
      return () => {
        // 완료/취소를 기다리기 위한 헬퍼 (필요 시 사용)
        void transition;
      };
    }
  } catch {
    // View Transition 시작 실패 — 폴백
  }
  return null;
}

/**
 * 페이지 이동을 View Transition으로 감싸는 훅.
 * - 지원 브라우저: `document.startViewTransition(() => navigate(...))`
 * - 미지원/예외: 기존 `navigate(to, opts)` 직접 호출
 *
 * @returns (to: string | number, opts?: { replace?: boolean }) => void
 */
export function useNavigateWithTransition() {
  const navigate = useNavigate();

  return useCallback(
    (to: string | number, opts?: TransitionOptions) => {
      const doNavigate = () => {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, opts);
        }
      };

      if (!supportsViewTransition()) {
        doNavigate();
        return;
      }

      const started = startViewTransition(doNavigate);
      if (!started) {
        // startViewTransition이 없거나 시작 실패 — 폴백
        doNavigate();
      }
    },
    [navigate],
  );
}
