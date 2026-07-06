/**
 * 프로필 카드 스튜디오 — 데이터 모델
 *
 * 원칙:
 * - 모든 기록은 사용자가 "직접 입력"한다 (스크랩 데이터 아님).
 *   → 카드 배지도 '직접 입력한 기록'으로 명시 (공개 기록 배지와 구분).
 * - 서버 전송 없음: 사진·기록 전부 브라우저 안에서만 처리.
 */

/** 카드 출력 포맷 */
export type CardFormat = 'story' | 'feed';

export const CARD_DIMENSIONS: Record<CardFormat, { w: number; h: number; label: string }> = {
  story: { w: 1080, h: 1920, label: '스토리 (9:16)' },
  feed: { w: 1080, h: 1080, label: '피드 (1:1)' },
};

/** 기록 한 줄 (라벨 + 값) */
export interface RecordEntry {
  /** 예: '오늘', 'PB', '시즌' */
  kind: 'today' | 'pb' | 'season';
  /** 예: '10.52', '2:08.31' — 자유 입력 */
  value: string;
}

/** 사진 보정 값 (100 = 원본, warmth는 0 = 원본) */
export interface PhotoAdjust {
  brightness: number;
  contrast: number;
  saturate: number;
  /** 따뜻함 0~50 (sepia %) */
  warmth: number;
}

export const DEFAULT_ADJUST: PhotoAdjust = { brightness: 100, contrast: 100, saturate: 100, warmth: 0 };

/**
 * 자유 배치 스티커 — 이모지/텍스트를 카드 위 아무 데나 놓는다.
 * 위치는 카드 크기 대비 %(0~100) → 포맷(스토리/피드) 바꿔도 배치 유지.
 */
export interface StickerItem {
  id: string;
  type: 'emoji' | 'text';
  content: string;
  /** 가로 위치 % (0~100) */
  x: number;
  /** 세로 위치 % (0~100) */
  y: number;
  /** 글자 크기 px (실크기 1080px 기준) */
  size: number;
  /** 회전 deg (-45~45) */
  rotation: number;
  /** 텍스트 색 */
  color?: string;
  /** 텍스트: 칩(pill) 배경 — 토스식 라벨 느낌 */
  pill?: boolean;
}

export interface CardData {
  name: string;
  /** 소속 (학교/팀) — 선택 */
  team: string;
  /** 종목 — 예: '100m', '멀리뛰기' */
  event: string;
  records: RecordEntry[];
  /** 대회명 — 선택 */
  competition: string;
  /** 날짜 — 선택, 자유 입력 */
  date: string;
  /** 한 줄 메시지 — 선택 */
  message: string;
  /** 사진 dataURL — 선택 */
  photo: string | null;
  /** 사진 세로 초점 (0~100, object-position Y%) */
  photoFocusY: number;
  /** 사진 보정 (내보내기 시 캔버스에 구워져서 100% 반영) */
  adjust: PhotoAdjust;
  /** 선택한 필터 프리셋 id ('custom' = 슬라이더 직접 조절) */
  filterId: string;
  /** 자유 배치 스티커 (이모지/텍스트) */
  stickers: StickerItem[];
  themeId: string;
  format: CardFormat;
}

export const RECORD_KIND_LABEL: Record<RecordEntry['kind'], string> = {
  today: '오늘의 기록',
  pb: '최고 기록 (PB)',
  season: '시즌 기록 (SB)',
};

/** 카드 위 짧은 라벨 */
export const RECORD_KIND_BADGE: Record<RecordEntry['kind'], string> = {
  today: 'TODAY',
  pb: 'PB',
  season: 'SB',
};

/** 자주 쓰는 종목 프리셋 (직접 입력도 가능) */
export const EVENT_PRESETS = [
  '100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', '10000m',
  '100mH', '110mH', '400mH', '3000mSC',
  '멀리뛰기', '세단뛰기', '높이뛰기', '장대높이뛰기',
  '포환던지기', '원반던지기', '창던지기', '해머던지기',
  '하프마라톤', '마라톤', '경보',
  '계주 4x100m', '계주 4x400m',
] as const;

export function createEmptyCard(name = ''): CardData {
  return {
    name,
    team: '',
    event: '',
    records: [{ kind: 'today', value: '' }],
    competition: '',
    date: '',
    message: '',
    photo: null,
    photoFocusY: 35,
    adjust: { ...DEFAULT_ADJUST },
    filterId: 'original',
    stickers: [],
    themeId: 'track-night',
    format: 'story',
  };
}

/** 카드 신뢰 표기 — 제거 불가 (빌더 UI와 캔버스 양쪽에서 사용) */
export const CARD_TRUST = {
  /** 수기 입력 카드의 성격 선언 — 공개 기록 배지('공개 기록 모음')와 구분 */
  badge: '직접 입력한 기록',
  watermark: 'AthleteTime',
} as const;
