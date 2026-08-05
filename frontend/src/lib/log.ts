/**
 * 🔒 프론트 로거 유틸 (DEV 게이트 + PII 마스킹)
 *
 * 백엔드 privacyGuardLogger와 짝을 이루는 클라이언트 로거.
 *
 * 정책:
 * 1. **DEV 게이트**: `import.meta.env.DEV` 일 때만 출력.
 *    운영 번들에 그대로 노출되는 행동/에러 스택 leak 차단.
 * 2. **PII 마스킹**: 이메일·Bearer 토큰·한국 전화번호·카드형 숫자열 일차 차단.
 *    엄격한 마스킹 아님, 운영 console leak를 1차 줄이는 용도.
 * 3. **group**: `console.group[Collapsed]` 대응.
 *
 * 사용:
 *   import { log } from '@/lib/log';
 *   log.debug('mount', { ... });
 *   log.info('changed', id);
 *   log.warn('soft-fail', e.message);
 *   log.error('crash', e);
 *   log.group('Init', () => { log.debug('a'); log.debug('b'); });
 */

/* eslint-disable no-console */

const isDev = (): boolean => {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
};

const ORIGIN = '[FE]';

/**
 * 간단한 PII 마스킹 — 이메일·토큰·전화·카드형 숫자열을 일차적으로 차단.
 */
function maskString(t: string): string {
  return t
    .replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer ***')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, (m) => {
      const at = m.indexOf('@');
      if (at <= 1) return '*'.repeat(Math.max(1, m.length - 1)) + m.slice(at);
      return m[0] + '***' + m.slice(at);
    })
    .replace(/\b01[016789]-?\d{3,4}-?\d{4}\b/g, '010-****-****')
    .replace(/\b(?:\d[ -]?){12,16}\b/g, (m) => m.replace(/\d/g, '*'));
}

function maskArg(v: unknown): unknown {
  if (typeof v === 'string') return maskString(v);
  if (v instanceof Error) {
    const e: Error = new Error(maskString(v.message));
    e.name = v.name;
    return e;
  }
  return v;
}

function dev(method: 'debug' | 'info' | 'warn' | 'error', args: unknown[]): void {
  if (!isDev()) return;
  const out = [ORIGIN, method.toUpperCase(), ...args.map(maskArg)] as unknown[];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const c = console as any;
  if (method === 'warn') c.warn(...out);
  else if (method === 'error') c.error(...out);
  else if (method === 'info') c.info(...out);
  else c.debug(...out);
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export const log = {
  debug(...args: unknown[]): void {
    dev('debug', args);
  },
  info(...args: unknown[]): void {
    dev('info', args);
  },
  warn(...args: unknown[]): void {
    dev('warn', args);
  },
  error(...args: unknown[]): void {
    dev('error', args);
  },
  /**
   * DEV 게이트 group — `console.group[Collapsed]` 대응.
   */
  group(label: string, body: () => void): void {
    if (!isDev()) return;
    const c = console as { group?: (...a: unknown[]) => void; groupEnd?: () => void };
    if (typeof c.group === 'function') {
      c.group(`${ORIGIN} GROUP`, label);
      try { body(); } finally { c.groupEnd?.(); }
    } else {
      body();
    }
  },
};

/**
 * DEV 여부 — 외부에서 동기적으로 의식 가능
 */
export const logIsDev: boolean = isDev();
