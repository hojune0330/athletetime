/**
 * 자유 배치 스티커 — 이모지 + 텍스트 칩
 *
 * 설계 (토스/카카오식 "쉬운 기본 + 자유도 높은 고급"):
 * - 기본 흐름은 스티커 없이도 완성되는 카드. 스티커는 '꾸미기' 확장 레이어.
 * - 탭해서 추가 → 드래그로 배치 → 선택해서 크기/회전/삭제. 위치는 % 좌표라 포맷 바꿔도 유지.
 * - 이모지는 사용자가 "표현"으로 고르는 콘텐츠 (UI 아이콘으로는 여전히 미사용 — SVG 원칙 유지).
 */

import type { StickerItem } from './types';

/** 육상인 감성 큐레이션 이모지 팔레트 */
export const EMOJI_PALETTE: { group: string; items: string[] }[] = [
  { group: '달리기', items: ['🏃', '🏃‍♀️', '👟', '🦵', '💨', '⏱️', '🏁', '🎽'] },
  { group: '불태우기', items: ['🔥', '⚡', '💪', '🚀', '💥', '🌪️', '😤', '🫀'] },
  { group: '성취', items: ['🥇', '🥈', '🥉', '🏆', '🎖️', '👑', '💯', '🎯'] },
  { group: '기분', items: ['😆', '🥹', '😎', '🤩', '🥵', '😮‍💨', '🙌', '✌️'] },
  { group: '응원', items: ['📣', '👏', '🫶', '❤️‍🔥', '⭐', '✨', '🌟', '🍀'] },
];

/** 텍스트 칩 프리셋 — 탭 한 번으로 추가, 내용은 수정 가능 */
export const TEXT_CHIP_PRESETS = [
  'PB 갱신!',
  '오늘도 달림',
  '시즌 시작',
  '결승 진출',
  '0.1초 단축',
  '내일 더 빠르게',
] as const;

/** 스티커 텍스트 색상 팔레트 */
export const STICKER_COLORS = ['#FFFFFF', '#111111', '#CCFF00', '#F97316', '#4F46E5', '#EF4444'] as const;

export const MAX_STICKERS = 8;
export const STICKER_MIN_SIZE = 40;
export const STICKER_MAX_SIZE = 240;

let seq = 0;
function nextId(): string {
  seq += 1;
  return `stk-${Date.now().toString(36)}-${seq}`;
}

export function createEmojiSticker(emoji: string): StickerItem {
  return {
    id: nextId(),
    type: 'emoji',
    content: emoji,
    x: 50,
    y: 22,
    size: 110,
    rotation: 0,
  };
}

export function createTextSticker(text: string): StickerItem {
  return {
    id: nextId(),
    type: 'text',
    content: text,
    x: 50,
    y: 30,
    size: 52,
    rotation: -4,
    color: '#111111',
    pill: true,
  };
}

export function clampSticker(s: StickerItem): StickerItem {
  return {
    ...s,
    x: Math.max(2, Math.min(98, s.x)),
    y: Math.max(2, Math.min(94, s.y)),
    size: Math.max(STICKER_MIN_SIZE, Math.min(STICKER_MAX_SIZE, s.size)),
    rotation: Math.max(-45, Math.min(45, s.rotation)),
  };
}
