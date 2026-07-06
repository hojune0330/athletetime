/**
 * 카드 테마 시스템 — "Vibrant & Block-based" (ui-ux-pro-max 추천)
 *
 * 각 테마는 카드 캔버스 전용 토큰 세트다.
 * 사이트 디자인 시스템(TRAINORACLE)과 별개 — 카드는 "굿즈"이므로
 * 화려하고 개성 있게, 단 텍스트 대비 4.5:1은 전 테마 보장.
 *
 * 토큰만 바꾸면 새 테마 추가 가능 (레이아웃은 CardPreview가 공통 처리).
 */

export interface CardTheme {
  id: string;
  label: string;
  /** 테마 한 줄 설명 (선택 화면) */
  vibe: string;
  /** 카드 배경 (CSS background 값 — 그라디언트 허용) */
  bg: string;
  /** 메인 텍스트 */
  ink: string;
  /** 보조 텍스트 */
  inkSub: string;
  /** 포인트 (기록 값, 배지) */
  accent: string;
  /** 포인트 위 텍스트 */
  accentInk: string;
  /** 블록/패널 배경 */
  panel: string;
  /** 트랙 레인 장식 색 (데코 스트라이프) */
  lane: string;
  /** 사진 없을 때 아바타 배경 */
  avatarBg: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'track-night',
    label: '트랙 나이트',
    vibe: '어두운 트랙 위 형광 임팩트',
    bg: 'linear-gradient(160deg, #12141C 0%, #1B1E2B 55%, #232741 100%)',
    ink: '#FFFFFF',
    inkSub: '#A8ADC4',
    accent: '#CCFF00',
    accentInk: '#12141C',
    panel: 'rgba(255,255,255,0.07)',
    lane: 'rgba(204,255,0,0.35)',
    avatarBg: '#2B2F45',
  },
  {
    id: 'sprint-orange',
    label: '스프린트',
    vibe: '전력질주 에너지, 오렌지 블록',
    bg: 'linear-gradient(150deg, #FF6B1A 0%, #F0430F 60%, #C82D08 100%)',
    ink: '#FFFFFF',
    inkSub: '#FFD9C2',
    accent: '#1E1B4B',
    accentInk: '#FFFFFF',
    panel: 'rgba(30,27,75,0.18)',
    lane: 'rgba(255,255,255,0.4)',
    avatarBg: '#D14A12',
  },
  {
    id: 'clean-paper',
    label: '클린 페이퍼',
    vibe: '기록증 느낌, 깔끔한 화이트',
    bg: 'linear-gradient(170deg, #FFFFFF 0%, #F4F3EE 100%)',
    ink: '#0E1412',
    inkSub: '#5F6965',
    accent: '#0D5F5A',
    accentInk: '#FFFFFF',
    panel: 'rgba(13,95,90,0.06)',
    lane: 'rgba(13,95,90,0.25)',
    avatarBg: '#E8E6DF',
  },
  {
    id: 'indigo-pop',
    label: '인디고 팝',
    vibe: '소셜 감성, 인디고+오렌지 듀오톤',
    bg: 'linear-gradient(155deg, #4F46E5 0%, #4338CA 55%, #312E81 100%)',
    ink: '#FFFFFF',
    inkSub: '#C7D2FE',
    accent: '#F97316',
    accentInk: '#FFFFFF',
    panel: 'rgba(255,255,255,0.10)',
    lane: 'rgba(249,115,22,0.45)',
    avatarBg: '#3730A3',
  },
  {
    id: 'dawn-run',
    label: '새벽 러닝',
    vibe: '이른 아침 러너의 파스텔 하늘',
    bg: 'linear-gradient(165deg, #FDE8D7 0%, #F6C6C9 45%, #A5B4FC 100%)',
    ink: '#1E1B4B',
    inkSub: '#4C4A78',
    accent: '#1E1B4B',
    accentInk: '#FDE8D7',
    panel: 'rgba(30,27,75,0.08)',
    lane: 'rgba(30,27,75,0.30)',
    avatarBg: '#F0D5D8',
  },
  {
    id: 'field-forest',
    label: '필드 포레스트',
    vibe: '필드 종목의 묵직한 그린',
    bg: 'linear-gradient(160deg, #07302E 0%, #0D5F5A 70%, #14776F 100%)',
    ink: '#FFFFFF',
    inkSub: '#9FD1CC',
    accent: '#FFD166',
    accentInk: '#07302E',
    panel: 'rgba(255,255,255,0.08)',
    lane: 'rgba(255,209,102,0.35)',
    avatarBg: '#0A4D49',
  },
];

export function getTheme(id: string): CardTheme {
  return CARD_THEMES.find((t) => t.id === id) ?? CARD_THEMES[0];
}
