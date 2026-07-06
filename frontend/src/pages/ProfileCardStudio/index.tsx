/**
 * ProfileCardStudio — 프로필 카드 스튜디오 (v3: 자유도 확장)
 *
 * UX 설계 (ui-ux-pro-max 'Vibrant & Block-based' + 토스/카카오식 점진 공개):
 * - 진입 즉시 편집 (선택 마찰 0) — 기본 흐름만으로 카드 완성 가능
 * - "꾸미기" 확장 레이어: 사진 보정(필터 8종 + 수동 슬라이더) / 이모지·텍스트 스티커 자유 배치
 *   → 쉽게 쓰는 사람은 안 열어도 되고, 파고드는 사람에겐 자유도 최대
 * - 보정은 offscreen canvas에 "구워서" 미리보기 = 저장본 보장 (html2canvas filter 비호환 회피)
 * - 스티커는 미리보기 위에서 직접 드래그 배치, % 좌표라 포맷 전환에도 유지
 * - 인스타그램 직행 공유: 모바일 공유 시트 → 스토리 카메라 딥링크 폴백
 * - 저장·공유는 브라우저 안에서만 (서버 전송 없음)
 *
 * 접근성/UX 가드 (skill 체크리스트):
 * - 모든 입력에 label 연결, inputmode 지정, 44px 터치 타깃
 * - UI 아이콘은 SVG(Heroicons)만 — 이모지는 사용자가 카드에 올리는 "표현 콘텐츠"로만 허용
 * - 저장 버튼 busy 상태 표시
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ShareIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import type { CardData, CardFormat, RecordEntry, StickerItem } from './types';
import {
  createEmptyCard,
  CARD_DIMENSIONS,
  EVENT_PRESETS,
  RECORD_KIND_LABEL,
  CARD_TRUST,
  DEFAULT_ADJUST,
} from './types';
import { CARD_THEMES, getTheme } from './themes';
import { CardPreview } from './CardPreview';
import { exportCardPng, shareCard, shareToInstagram } from './exportCard';
import { FILTER_PRESETS, bakePhoto } from './filters';
import {
  EMOJI_PALETTE,
  TEXT_CHIP_PRESETS,
  STICKER_COLORS,
  MAX_STICKERS,
  STICKER_MIN_SIZE,
  STICKER_MAX_SIZE,
  createEmojiSticker,
  createTextSticker,
  clampSticker,
} from './stickers';

const MAX_RECORDS = 3;

/** 상태 반영이 화면에 그려질 때까지 대기 (내보내기 전 선택 테두리 제거용) */
function nextPaint(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export default function ProfileCardStudio() {
  const [searchParams] = useSearchParams();
  const initialName = (searchParams.get('name') || '').trim();
  const [card, setCard] = useState<CardData>(() => createEmptyCard(initialName));
  const [busy, setBusy] = useState<'save' | 'share' | 'insta' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.28);
  const previewBoxRef = useRef<HTMLDivElement>(null);

  // 꾸미기 확장 레이어 상태
  const [bakedPhoto, setBakedPhoto] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const patch = useCallback((p: Partial<CardData>) => setCard((c) => ({ ...c, ...p })), []);

  // ── 보정 굽기: 사진/보정값/필터가 바뀌면 debounce 후 offscreen canvas에 구워 미리보기=저장본 보장 ──
  useEffect(() => {
    if (!card.photo) {
      setBakedPhoto(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      bakePhoto(card.photo!, card.adjust, card.filterId)
        .then((baked) => {
          if (!cancelled) setBakedPhoto(baked);
        })
        .catch(() => {
          if (!cancelled) setBakedPhoto(card.photo);
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [card.photo, card.adjust, card.filterId]);

  // ── 스티커 드래그 (미리보기 위 직접 배치) ──
  const onStickerPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const s = card.stickers.find((st) => st.id === id);
      if (!s) return;
      setSelectedStickerId(id);
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: s.x, origY: s.y };

      const dim = CARD_DIMENSIONS[card.format];
      const move = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = ((ev.clientX - d.startX) / (dim.w * previewScale)) * 100;
        const dy = ((ev.clientY - d.startY) / (dim.h * previewScale)) * 100;
        setCard((c) => ({
          ...c,
          stickers: c.stickers.map((st) =>
            st.id === d.id ? clampSticker({ ...st, x: d.origX + dx, y: d.origY + dy }) : st,
          ),
        }));
      };
      const up = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [card.stickers, card.format, previewScale],
  );

  const addSticker = (s: StickerItem) => {
    setCard((c) => (c.stickers.length >= MAX_STICKERS ? c : { ...c, stickers: [...c.stickers, s] }));
    setSelectedStickerId(s.id);
  };
  const patchSticker = (id: string, p: Partial<StickerItem>) =>
    setCard((c) => ({
      ...c,
      stickers: c.stickers.map((st) => (st.id === id ? clampSticker({ ...st, ...p }) : st)),
    }));
  const removeSticker = (id: string) => {
    setCard((c) => ({ ...c, stickers: c.stickers.filter((st) => st.id !== id) }));
    setSelectedStickerId((cur) => (cur === id ? null : cur));
  };

  const selectedSticker = card.stickers.find((s) => s.id === selectedStickerId) ?? null;

  // 미리보기 배율: 컨테이너 폭에 맞춤
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const dim = CARD_DIMENSIONS[card.format];
    const compute = () => {
      const pad = 16;
      const maxW = el.clientWidth - pad;
      const maxH = Math.max(320, window.innerHeight * 0.52);
      setPreviewScale(Math.min(maxW / dim.w, maxH / dim.h, 0.5));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [card.format]);

  // ── 사진 업로드 ──
  const onPhotoChange = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('이미지 파일만 넣을 수 있어요.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCard((c) => ({ ...c, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  }, []);

  // ── 기록 편집 ──
  const setRecord = (i: number, p: Partial<RecordEntry>) =>
    setCard((c) => ({
      ...c,
      records: c.records.map((r, idx) => (idx === i ? { ...r, ...p } : r)),
    }));
  const addRecord = () =>
    setCard((c) =>
      c.records.length >= MAX_RECORDS
        ? c
        : { ...c, records: [...c.records, { kind: c.records.some((r) => r.kind === 'pb') ? 'season' : 'pb', value: '' }] },
    );
  const removeRecord = (i: number) =>
    setCard((c) => (c.records.length <= 1 ? c : { ...c, records: c.records.filter((_, idx) => idx !== i) }));

  // ── 내보내기 (캐처 전 스티커 선택 테두리 해제) ──
  const handleSave = async () => {
    if (!canvasRef.current) return;
    setBusy('save');
    setSelectedStickerId(null);
    setNotice(null);
    await nextPaint();
    try {
      await exportCardPng(canvasRef.current, card);
      setNotice('이미지를 저장했어요.');
    } catch {
      setNotice('저장에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };
  const handleShare = async () => {
    if (!canvasRef.current) return;
    setBusy('share');
    setSelectedStickerId(null);
    setNotice(null);
    await nextPaint();
    try {
      const result = await shareCard(canvasRef.current, card);
      if (result === 'downloaded') setNotice('공유가 지원되지 않는 브라우저라 이미지로 저장했어요.');
    } catch {
      setNotice('공유에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };
  const handleInstagram = async () => {
    if (!canvasRef.current) return;
    setBusy('insta');
    setSelectedStickerId(null);
    setNotice(null);
    await nextPaint();
    try {
      const result = await shareToInstagram(canvasRef.current, card);
      if (result === 'deeplinked') setNotice('카드를 저장했어요. 인스타그램 스토리에서 방금 저장한 이미지를 올려주세요.');
      else if (result === 'downloaded') setNotice('카드를 저장했어요. 인스타그램 앱에서 이미지를 올려주세요.');
    } catch {
      setNotice('공유 준비에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  const theme = getTheme(card.themeId);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-neutral-50">
      {/* 헤더 */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <Link
          to="/records"
          className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
        >
          <ChevronLeftIcon className="w-4 h-4" /> 기록 검색으로
        </Link>
        <h1 className="mt-2 text-2xl md:text-3xl font-black text-neutral-900">내 기록 카드 만들기</h1>
        <p className="mt-1 text-neutral-600">
          사진 넣고 기록 적으면 바로 카드가 돼요. 사진과 기록은 서버로 보내지 않아요.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] gap-6">
        {/* ══ 미리보기 (라이브) ══ */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div ref={previewBoxRef} className="flex justify-center" onPointerDown={() => setSelectedStickerId(null)}>
            <CardPreview
              ref={canvasRef}
              card={card}
              scale={previewScale}
              displayPhoto={bakedPhoto}
              selectedStickerId={selectedStickerId}
              onStickerPointerDown={onStickerPointerDown}
            />
          </div>
          {card.stickers.length > 0 && (
            <p className="mt-2 text-center text-xs text-neutral-500">스티커는 미리보기에서 직접 끌어서 옮길 수 있어요.</p>
          )}

          {/* 포맷 토글 */}
          <div className="mt-4 flex justify-center gap-2" role="group" aria-label="카드 크기 선택">
            {(Object.keys(CARD_DIMENSIONS) as CardFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => patch({ format: f })}
                aria-pressed={card.format === f}
                className={`min-h-[44px] px-5 rounded font-bold text-sm transition-colors cursor-pointer ${
                  card.format === f
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 border border-neutral-300 hover:border-neutral-500'
                }`}
              >
                {CARD_DIMENSIONS[f].label}
              </button>
            ))}
          </div>

          {/* 저장/공유 */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy !== null}
              className="min-h-[48px] inline-flex items-center gap-2 px-5 rounded bg-neutral-900 text-white font-bold hover:bg-neutral-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              {busy === 'save' ? '저장 중…' : '이미지 저장'}
            </button>
            <button
              type="button"
              onClick={handleInstagram}
              disabled={busy !== null}
              className="min-h-[48px] inline-flex items-center gap-2 px-5 rounded font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)' }}
            >
              <CameraIcon className="w-5 h-5" />
              {busy === 'insta' ? '준비 중…' : '인스타그램'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={busy !== null}
              className="min-h-[48px] inline-flex items-center gap-2 px-5 rounded font-bold transition-colors cursor-pointer disabled:opacity-50"
              style={{ background: theme.accent, color: theme.accentInk }}
            >
              <ShareIcon className="w-5 h-5" />
              {busy === 'share' ? '준비 중…' : '공유하기'}
            </button>
          </div>
          {notice && (
            <p role="status" className="mt-3 text-center text-sm font-semibold text-neutral-700">
              {notice}
            </p>
          )}
          <p className="mt-2 text-center text-xs text-neutral-500">
            카드에는 ‘{CARD_TRUST.badge}’ 표기가 항상 함께 담겨요.
          </p>
        </div>

        {/* ══ 입력 폼 ══ */}
        <div className="space-y-6 pb-16">
          {/* 테마 */}
          <section aria-labelledby="theme-heading">
            <h2 id="theme-heading" className="text-sm font-black text-neutral-900 uppercase tracking-wide mb-2">
              테마
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {CARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patch({ themeId: t.id })}
                  aria-pressed={card.themeId === t.id}
                  title={t.vibe}
                  className={`min-h-[64px] rounded-lg p-1.5 text-left transition-all cursor-pointer border-2 ${
                    card.themeId === t.id ? 'border-neutral-900 scale-[1.02]' : 'border-transparent hover:border-neutral-300'
                  }`}
                >
                  <span aria-hidden className="block h-8 rounded" style={{ background: t.bg }} />
                  <span className="mt-1 block text-xs font-bold text-neutral-800 truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 사진 */}
          <section aria-labelledby="photo-heading">
            <h2 id="photo-heading" className="text-sm font-black text-neutral-900 uppercase tracking-wide mb-2">
              사진
            </h2>
            {card.photo ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src={card.photo} alt="업로드한 사진 미리보기" className="w-16 h-16 rounded object-cover" />
                  <button
                    type="button"
                    onClick={() => patch({ photo: null })}
                    className="min-h-[44px] inline-flex items-center gap-1 px-4 rounded border border-neutral-300 text-sm font-semibold text-neutral-700 hover:border-red-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="w-4 h-4" /> 사진 빼기
                  </button>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-600">사진 위치 (위–아래)</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={card.photoFocusY}
                    onChange={(e) => patch({ photoFocusY: Number(e.target.value) })}
                    className="mt-1 w-full accent-neutral-900"
                  />
                </label>

                {/* ── 보정: 필터 프리셋 ── */}
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-neutral-600">필터</span>
                  <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="사진 필터 선택">
                    {FILTER_PRESETS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => patch({ filterId: f.id, adjust: { ...f.adjust } })}
                        aria-pressed={card.filterId === f.id}
                        className={`min-h-[44px] rounded text-xs font-bold transition-colors cursor-pointer border ${
                          card.filterId === f.id
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── 보정: 수동 슬라이더 (접이식 고급) ── */}
                <div className="rounded-lg border border-neutral-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowAdjust((v) => !v)}
                    aria-expanded={showAdjust}
                    className="w-full min-h-[48px] flex items-center justify-between px-4 text-sm font-bold text-neutral-800 cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      <AdjustmentsHorizontalIcon className="w-5 h-5" /> 세부 보정
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${showAdjust ? 'rotate-180' : ''}`} />
                  </button>
                  {showAdjust && (
                    <div className="px-4 pb-4 space-y-3">
                      {(
                        [
                          { key: 'brightness', label: '밝기', min: 50, max: 150 },
                          { key: 'contrast', label: '대비', min: 50, max: 160 },
                          { key: 'saturate', label: '채도', min: 0, max: 200 },
                          { key: 'warmth', label: '따뜻함', min: 0, max: 50 },
                        ] as const
                      ).map((s) => (
                        <label key={s.key} className="block">
                          <span className="flex justify-between text-xs font-semibold text-neutral-600">
                            <span>{s.label}</span>
                            <span className="tabular-nums">{card.adjust[s.key]}</span>
                          </span>
                          <input
                            type="range"
                            min={s.min}
                            max={s.max}
                            value={card.adjust[s.key]}
                            onChange={(e) =>
                              patch({ adjust: { ...card.adjust, [s.key]: Number(e.target.value) } })
                            }
                            className="mt-1 w-full accent-neutral-900"
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => patch({ adjust: { ...DEFAULT_ADJUST }, filterId: 'original' })}
                        className="min-h-[44px] w-full rounded border border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-neutral-500 transition-colors cursor-pointer"
                      >
                        보정 초기화
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 min-h-[88px] rounded-lg border-2 border-dashed border-neutral-300 bg-white text-neutral-600 font-semibold hover:border-neutral-500 transition-colors cursor-pointer">
                <PhotoIcon className="w-6 h-6" />
                사진 올리기 (내 폰에서만 처리돼요)
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </section>

          {/* 꾸미기 — 이모지/텍스트 스티커 자유 배치 */}
          <section aria-labelledby="sticker-heading">
            <div className="rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() => setShowStickers((v) => !v)}
                aria-expanded={showStickers}
                className="w-full min-h-[52px] flex items-center justify-between px-4 cursor-pointer"
              >
                <span id="sticker-heading" className="inline-flex items-center gap-2 text-sm font-black text-neutral-900 uppercase tracking-wide">
                  <SparklesIcon className="w-5 h-5" /> 꾸미기
                  <span className="font-semibold normal-case text-neutral-500">— 이모지·텍스트 자유 배치</span>
                </span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${showStickers ? 'rotate-180' : ''}`} />
              </button>
              {showStickers && (
                <div className="px-4 pb-4 space-y-4">
                  <p className="text-xs text-neutral-500">
                    탭해서 카드에 올리고, 미리보기에서 끌어서 자리를 잡아요. (최대 {MAX_STICKERS}개)
                  </p>

                  {/* 이모지 팔레트 */}
                  {EMOJI_PALETTE.map((g) => (
                    <div key={g.group}>
                      <span className="mb-1 block text-xs font-semibold text-neutral-600">{g.group}</span>
                      <div className="grid grid-cols-8 gap-1">
                        {g.items.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => addSticker(createEmojiSticker(em))}
                            disabled={card.stickers.length >= MAX_STICKERS}
                            aria-label={`${em} 스티커 추가`}
                            className="min-h-[44px] rounded text-2xl hover:bg-neutral-100 disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* 텍스트 칩 */}
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-neutral-600">텍스트 칩</span>
                    <div className="flex flex-wrap gap-1.5">
                      {TEXT_CHIP_PRESETS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addSticker(createTextSticker(t))}
                          disabled={card.stickers.length >= MAX_STICKERS}
                          className="min-h-[44px] px-3 rounded-full border border-neutral-300 bg-white text-sm font-bold text-neutral-800 hover:border-neutral-600 disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 선택된 스티커 편집기 */}
                  {selectedSticker && (
                    <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-900">선택한 스티커</span>
                        <button
                          type="button"
                          onClick={() => removeSticker(selectedSticker.id)}
                          aria-label="선택한 스티커 삭제"
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                      {selectedSticker.type === 'text' && (
                        <>
                          <input
                            type="text"
                            aria-label="스티커 문구"
                            value={selectedSticker.content}
                            onChange={(e) => patchSticker(selectedSticker.id, { content: e.target.value })}
                            maxLength={16}
                            className={inputCls}
                          />
                          <div className="flex gap-1.5" role="group" aria-label="스티커 색상">
                            {STICKER_COLORS.map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => patchSticker(selectedSticker.id, { color: col })}
                                aria-pressed={selectedSticker.color === col}
                                aria-label={`색상 ${col}`}
                                className={`w-9 h-9 min-h-[36px] rounded-full border-2 cursor-pointer transition-transform ${
                                  selectedSticker.color === col ? 'border-neutral-900 scale-110' : 'border-neutral-300'
                                }`}
                                style={{ background: col }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      <label className="block">
                        <span className="flex justify-between text-xs font-semibold text-neutral-600">
                          <span>크기</span>
                          <span className="tabular-nums">{selectedSticker.size}</span>
                        </span>
                        <input
                          type="range"
                          min={STICKER_MIN_SIZE}
                          max={STICKER_MAX_SIZE}
                          value={selectedSticker.size}
                          onChange={(e) => patchSticker(selectedSticker.id, { size: Number(e.target.value) })}
                          className="mt-1 w-full accent-neutral-900"
                        />
                      </label>
                      <label className="block">
                        <span className="flex justify-between text-xs font-semibold text-neutral-600">
                          <span>회전</span>
                          <span className="tabular-nums">{selectedSticker.rotation}°</span>
                        </span>
                        <input
                          type="range"
                          min={-45}
                          max={45}
                          value={selectedSticker.rotation}
                          onChange={(e) => patchSticker(selectedSticker.id, { rotation: Number(e.target.value) })}
                          className="mt-1 w-full accent-neutral-900"
                        />
                      </label>
                    </div>
                  )}

                  {card.stickers.length > 0 && !selectedSticker && (
                    <p className="text-xs text-neutral-500">미리보기에서 스티커를 탭하면 크기·회전을 바꿀 수 있어요.</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 기본 정보 */}
          <section aria-labelledby="info-heading" className="space-y-3">
            <h2 id="info-heading" className="text-sm font-black text-neutral-900 uppercase tracking-wide">
              기본 정보
            </h2>
            <Field label="이름" required>
              <input
                type="text"
                value={card.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="홍길동"
                maxLength={12}
                className={inputCls}
              />
            </Field>
            <Field label="소속 (학교·팀)">
              <input
                type="text"
                value={card.team}
                onChange={(e) => patch({ team: e.target.value })}
                placeholder="서울고 / OO러닝크루"
                maxLength={20}
                className={inputCls}
              />
            </Field>
            <Field label="종목">
              <input
                type="text"
                list="event-presets"
                value={card.event}
                onChange={(e) => patch({ event: e.target.value })}
                placeholder="100m"
                maxLength={16}
                className={inputCls}
              />
              <datalist id="event-presets">
                {EVENT_PRESETS.map((ev) => (
                  <option key={ev} value={ev} />
                ))}
              </datalist>
            </Field>
          </section>

          {/* 기록 (수기 입력) */}
          <section aria-labelledby="records-heading" className="space-y-3">
            <h2 id="records-heading" className="text-sm font-black text-neutral-900 uppercase tracking-wide">
              내 기록 <span className="font-semibold normal-case text-neutral-500">— 직접 적어요</span>
            </h2>
            {card.records.map((r, i) => (
              <div key={i} className="flex gap-2">
                <select
                  aria-label={`기록 ${i + 1} 종류`}
                  value={r.kind}
                  onChange={(e) => setRecord(i, { kind: e.target.value as RecordEntry['kind'] })}
                  className="min-h-[48px] rounded border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 cursor-pointer"
                >
                  {(Object.keys(RECORD_KIND_LABEL) as RecordEntry['kind'][]).map((k) => (
                    <option key={k} value={k}>
                      {RECORD_KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`기록 ${i + 1} 값`}
                  value={r.value}
                  onChange={(e) => setRecord(i, { value: e.target.value })}
                  placeholder="10.52 / 2:08.31 / 6m72"
                  maxLength={12}
                  className={`${inputCls} flex-1 font-bold`}
                />
                {card.records.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecord(i)}
                    aria-label={`기록 ${i + 1} 삭제`}
                    className="min-h-[48px] min-w-[44px] rounded border border-neutral-300 text-neutral-500 hover:text-red-600 hover:border-red-400 transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5 mx-auto" />
                  </button>
                )}
              </div>
            ))}
            {card.records.length < MAX_RECORDS && (
              <button
                type="button"
                onClick={addRecord}
                className="min-h-[44px] inline-flex items-center gap-1 px-4 rounded border border-dashed border-neutral-400 text-sm font-semibold text-neutral-600 hover:border-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" /> 기록 줄 추가
              </button>
            )}
          </section>

          {/* 대회/메시지 */}
          <section aria-labelledby="extra-heading" className="space-y-3">
            <h2 id="extra-heading" className="text-sm font-black text-neutral-900 uppercase tracking-wide">
              곁들이기 <span className="font-semibold normal-case text-neutral-500">— 안 적어도 돼요</span>
            </h2>
            <Field label="대회명">
              <input
                type="text"
                value={card.competition}
                onChange={(e) => patch({ competition: e.target.value })}
                placeholder="전국체전 예선"
                maxLength={30}
                className={inputCls}
              />
            </Field>
            <Field label="날짜">
              <input
                type="text"
                inputMode="numeric"
                value={card.date}
                onChange={(e) => patch({ date: e.target.value })}
                placeholder="2026.07.06"
                maxLength={12}
                className={inputCls}
              />
            </Field>
            <Field label="한 줄 메시지">
              <input
                type="text"
                value={card.message}
                onChange={(e) => patch({ message: e.target.value })}
                placeholder="오늘도 0.1초 줄였다"
                maxLength={30}
                className={inputCls}
              />
            </Field>
          </section>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full min-h-[48px] rounded border border-neutral-300 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-neutral-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
