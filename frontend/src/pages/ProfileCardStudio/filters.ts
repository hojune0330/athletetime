/**
 * 사진 보정 — 필터 프리셋 + 굽기(bake) 파이프라인
 *
 * 왜 CSS filter가 아니라 "굽기"인가:
 * - html2canvas의 CSS filter 지원이 브라우저마다 다름 → 미리보기와 저장본이 달라질 위험
 * - 그래서 보정이 바뀔 때마다 offscreen canvas로 원본을 다시 구워 dataURL로 만들고,
 *   미리보기·내보내기 모두 같은 구운 이미지를 쓴다. (보는 것 = 저장되는 것)
 * - ctx.filter 미지원 브라우저(iOS 구형 사파리)는 픽셀 수동 연산으로 폴백 → 전 기기 동일 결과
 * - 전 과정 브라우저 안 처리. 서버 전송 없음.
 */

import type { PhotoAdjust } from './types';

export interface FilterPreset {
  id: string;
  label: string;
  /** 프리셋 선택 시 적용되는 기본 보정값 */
  adjust: PhotoAdjust;
  /** 흑백 여부 (프리셋 고유 속성 — 슬라이더로 바꿔도 유지) */
  grayscale: boolean;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'original', label: '원본', adjust: { brightness: 100, contrast: 100, saturate: 100, warmth: 0 }, grayscale: false },
  { id: 'clear', label: '선명하게', adjust: { brightness: 105, contrast: 112, saturate: 106, warmth: 0 }, grayscale: false },
  { id: 'vivid', label: '쨍하게', adjust: { brightness: 104, contrast: 116, saturate: 138, warmth: 0 }, grayscale: false },
  { id: 'warm', label: '따뜻하게', adjust: { brightness: 104, contrast: 104, saturate: 108, warmth: 20 }, grayscale: false },
  { id: 'film', label: '필름', adjust: { brightness: 102, contrast: 94, saturate: 86, warmth: 14 }, grayscale: false },
  { id: 'dawn', label: '새벽 러닝', adjust: { brightness: 108, contrast: 95, saturate: 84, warmth: 8 }, grayscale: false },
  { id: 'night', label: '나이트 트랙', adjust: { brightness: 96, contrast: 118, saturate: 112, warmth: 0 }, grayscale: false },
  { id: 'mono', label: '흑백', adjust: { brightness: 104, contrast: 115, saturate: 100, warmth: 0 }, grayscale: true },
];

export function getFilterPreset(id: string): FilterPreset {
  return FILTER_PRESETS.find((f) => f.id === id) ?? FILTER_PRESETS[0];
}

/** CSS/ctx filter 문자열 */
export function buildFilterString(adjust: PhotoAdjust, grayscale: boolean): string {
  const parts = [
    `brightness(${adjust.brightness}%)`,
    `contrast(${adjust.contrast}%)`,
    `saturate(${adjust.saturate}%)`,
  ];
  if (adjust.warmth > 0) parts.push(`sepia(${adjust.warmth}%)`);
  if (grayscale) parts.push('grayscale(100%)');
  return parts.join(' ');
}

function isIdentity(adjust: PhotoAdjust, grayscale: boolean): boolean {
  return (
    !grayscale &&
    adjust.brightness === 100 &&
    adjust.contrast === 100 &&
    adjust.saturate === 100 &&
    adjust.warmth === 0
  );
}

/** ctx.filter 미지원 브라우저용 픽셀 수동 보정 (brightness/contrast/saturate/sepia/grayscale) */
function applyFilterManually(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  adjust: PhotoAdjust,
  grayscale: boolean,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const b = adjust.brightness / 100;
  const c = adjust.contrast / 100;
  const s = adjust.saturate / 100;
  const sep = Math.min(adjust.warmth, 100) / 100;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let bl = d[i + 2];

    // brightness
    r *= b; g *= b; bl *= b;
    // contrast
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    // saturate (luminance 기준 보간)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    r = lum + (r - lum) * s;
    g = lum + (g - lum) * s;
    bl = lum + (bl - lum) * s;
    // sepia (따뜻함) — 표준 매트릭스와 원본 보간
    if (sep > 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * bl;
      const sg = 0.349 * r + 0.686 * g + 0.168 * bl;
      const sb = 0.272 * r + 0.534 * g + 0.131 * bl;
      r = r + (sr - r) * sep;
      g = g + (sg - g) * sep;
      bl = bl + (sb - bl) * sep;
    }
    // grayscale
    if (grayscale) {
      const gy = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      r = gy; g = gy; bl = gy;
    }

    d[i] = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, bl));
  }
  ctx.putImageData(img, 0, 0);
}

const MAX_BAKE_DIM = 2000;

/**
 * 원본 dataURL에 보정을 구워 새 dataURL을 만든다.
 * 미리보기와 내보내기가 같은 결과물을 쓰므로 "보는 것 = 저장되는 것".
 */
export async function bakePhoto(photoDataUrl: string, adjust: PhotoAdjust, filterId: string): Promise<string> {
  const preset = getFilterPreset(filterId);
  if (isIdentity(adjust, preset.grayscale)) return photoDataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('image load failed'));
    el.src = photoDataUrl;
  });

  const ratio = Math.min(1, MAX_BAKE_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return photoDataUrl;

  const filterStr = buildFilterString(adjust, preset.grayscale);
  // ctx.filter 지원 감지: 세팅 후 읽어서 반영됐는지 확인
  ctx.filter = filterStr;
  const nativeFilter = ctx.filter !== 'none' && ctx.filter !== '';

  if (nativeFilter) {
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.filter = 'none';
    ctx.drawImage(img, 0, 0, w, h);
    applyFilterManually(ctx, w, h, adjust, preset.grayscale);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}
