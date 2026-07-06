/**
 * 카드 내보내기 — PNG 저장 + Web Share
 *
 * - html2canvas로 실크기(1080px) DOM을 캡처 → 스케일 업 없음, 선명한 출력
 * - transform: scale()은 캡처 전에 임시 해제 (html2canvas는 transform을 무시하지 못함)
 * - 서버 전송 없음: 전부 브라우저 안에서 처리
 */

import type { CardData } from './types';
import { CARD_DIMENSIONS } from './types';

async function renderToBlob(el: HTMLElement, card: CardData): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas');
  const dim = CARD_DIMENSIONS[card.format];

  // 미리보기 scale 임시 해제
  const prevTransform = el.style.transform;
  el.style.transform = 'none';
  try {
    const canvas = await html2canvas(el, {
      width: dim.w,
      height: dim.h,
      scale: 1,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('toBlob failed');
    return blob;
  } finally {
    el.style.transform = prevTransform;
  }
}

function fileName(card: CardData): string {
  const name = (card.name || 'athlete').replace(/[^\w가-힣a-zA-Z0-9]/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `athletetime-card-${name}-${date}.png`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** PNG로 저장 */
export async function exportCardPng(el: HTMLElement, card: CardData): Promise<void> {
  const blob = await renderToBlob(el, card);
  download(blob, fileName(card));
}

/**
 * Web Share API로 공유. 미지원 브라우저는 다운로드로 폴백.
 * @returns 'shared' | 'downloaded'
 */
export async function shareCard(el: HTMLElement, card: CardData): Promise<'shared' | 'downloaded'> {
  const blob = await renderToBlob(el, card);
  const file = new File([blob], fileName(card), { type: 'image/png' });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 성공 취급
      if (e instanceof Error && e.name === 'AbortError') return 'shared';
      // 그 외 실패 → 다운로드 폴백
    }
  }
  download(blob, fileName(card));
  return 'downloaded';
}
