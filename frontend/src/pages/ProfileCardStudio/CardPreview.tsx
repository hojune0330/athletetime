/**
 * CardPreview — 카드 캔버스 렌더러
 *
 * 이 DOM이 그대로 html2canvas로 PNG가 된다.
 * - 실제 크기(1080x1920 / 1080x1080)로 렌더하고 CSS transform scale로 미리보기 축소
 *   → 내보내기 화질 보장 (스케일 업 없음)
 * - 워터마크/'직접 입력한 기록' 배지는 제거 불가 (SHARE_POLICY 연장)
 * - 폰트: 사이트 전역에 이미 로드된 Pretendard 사용 (별도 로드 없음 → CORS/FOUT 없음)
 */

import { forwardRef } from 'react';
import type { CardData } from './types';
import { CARD_DIMENSIONS, CARD_TRUST, RECORD_KIND_BADGE } from './types';
import { getTheme } from './themes';

interface Props {
  card: CardData;
  /** 미리보기 축소 배율 (내보내기 시 1) */
  scale: number;
}

export const CardPreview = forwardRef<HTMLDivElement, Props>(function CardPreview({ card, scale }, ref) {
  const theme = getTheme(card.themeId);
  const dim = CARD_DIMENSIONS[card.format];
  const isStory = card.format === 'story';

  // 이름이 길면 자동 축소
  const nameSize = card.name.length > 8 ? 88 : card.name.length > 5 ? 108 : 128;

  const filledRecords = card.records.filter((r) => r.value.trim() !== '');

  return (
    <div
      style={{ width: dim.w * scale, height: dim.h * scale, overflow: 'hidden', borderRadius: 16 * scale }}
      className="shadow-2xl"
    >
      <div
        ref={ref}
        style={{
          width: dim.w,
          height: dim.h,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: theme.bg,
          color: theme.ink,
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── 데코: 트랙 레인 스트라이프 ── */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: isStory ? 64 : 48,
            bottom: 0,
            width: 8,
            background: theme.lane,
            opacity: 0.9,
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: isStory ? 96 : 76,
            bottom: 0,
            width: 3,
            background: theme.lane,
            opacity: 0.5,
          }}
        />

        {/* ── 상단: 배지 + 대회/날짜 ── */}
        <div style={{ padding: isStory ? '96px 88px 0' : '72px 72px 0', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span
              style={{
                background: theme.accent,
                color: theme.accentInk,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '0.12em',
                padding: '12px 28px',
                textTransform: 'uppercase',
              }}
            >
              {card.event || 'TRACK & FIELD'}
            </span>
          </div>
          {(card.competition || card.date) && (
            <p style={{ marginTop: 28, fontSize: 34, color: theme.inkSub, fontWeight: 600 }}>
              {[card.competition, card.date].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* ── 사진 ── */}
        <div
          style={{
            margin: isStory ? '56px 88px 0' : '40px 72px 0',
            height: isStory ? 760 : 380,
            background: theme.avatarBg,
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {card.photo ? (
            <img
              src={card.photo}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `50% ${card.photoFocusY}%`,
              }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 러너 실루엣 (SVG, 이모지 금지) */}
              <svg width="220" height="220" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.35 }}>
                <path
                  d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.2 7.2 0 0 0 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.56-.89-1.68-1.25-2.65-.84L6 8.3V13h2V9.6l1.8-.7z"
                  fill={theme.ink}
                />
              </svg>
            </div>
          )}
        </div>

        {/* ── 이름 + 소속 ── */}
        <div style={{ padding: isStory ? '64px 88px 0' : '44px 72px 0', position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontSize: nameSize,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: 0,
              wordBreak: 'keep-all',
            }}
          >
            {card.name || '이름'}
          </h1>
          {card.team && (
            <p style={{ marginTop: 16, fontSize: 40, color: theme.inkSub, fontWeight: 700 }}>{card.team}</p>
          )}
        </div>

        {/* ── 기록 블록 ── */}
        {filledRecords.length > 0 && (
          <div
            style={{
              margin: isStory ? '56px 88px 0' : '36px 72px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {filledRecords.map((r, i) => (
              <div
                key={`${r.kind}-${i}`}
                style={{
                  background: theme.panel,
                  padding: '28px 36px',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 28,
                }}
              >
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    color: theme.accent,
                    minWidth: 130,
                  }}
                >
                  {RECORD_KIND_BADGE[r.kind]}
                </span>
                <span
                  style={{
                    fontSize: i === 0 ? 96 : 64,
                    fontWeight: 900,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── 한 줄 메시지 ── */}
        {card.message && (
          <p
            style={{
              margin: isStory ? '48px 88px 0' : '32px 72px 0',
              fontSize: 40,
              fontWeight: 600,
              color: theme.inkSub,
              lineHeight: 1.4,
              wordBreak: 'keep-all',
            }}
          >
            “{card.message}”
          </p>
        )}

        {/* ── 하단 고정: 신뢰 표기 (제거 불가) ── */}
        <div
          style={{
            marginTop: 'auto',
            padding: isStory ? '0 88px 80px' : '0 72px 56px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: 28, color: theme.inkSub, fontWeight: 600 }}>{CARD_TRUST.badge}</span>
          <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.06em', color: theme.ink, opacity: 0.85 }}>
            {CARD_TRUST.watermark}
          </span>
        </div>
      </div>
    </div>
  );
});
