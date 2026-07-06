/**
 * 대회 일정 카드뉴스 생성기
 * /schedule-card
 *
 * 대회 일정 정보를 1080×1080 Instagram 스타일 카드뉴스로 만드는 페이지.
 *
 * NOTE: 이미지 다운로드 기능은 html2canvas 라이브러리를 사용합니다.
 *   npm install html2canvas
 *   또는
 *   pnpm add html2canvas
 * 를 실행한 뒤 사용하세요.
 */

import { useState, useRef, useCallback } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/common/PageHeader';
import { useCompetitions } from '../hooks/useCompetitions';
import type { Competition } from '../api/competitions';

// ============================================================
// 상수
// ============================================================

const CATEGORY_OPTIONS = [
  { value: 'track_field', label: '트랙&필드' },
  { value: 'road', label: '도로경기' },
  { value: 'single_event', label: '단일종목' },
  { value: 'corporate', label: '실업연맹' },
  { value: 'university', label: '대학연맹' },
  { value: 'junior', label: '중고연맹' },
] as const;

// DESIGN_GUIDE.md 기준 색상
const CARD_COLORS = {
  bg: '#FFFFFF',
  textMain: '#111111',
  textSub: '#666666',
  textLight: '#999999',
  accent: '#03C75A',
  dividerBold: '#111111',
  dividerLight: '#E5E5E5',
} as const;

// ============================================================
// 타입
// ============================================================

interface EventRow {
  id: number;
  name: string;      // 종목명
  datetime: string;  // 일시
  note: string;      // 비고 (선택)
}

interface CardData {
  competitionName: string;
  startDate: string;
  endDate: string;
  venue: string;
  category: string;
  events: EventRow[];
  branding: string;
}

// ============================================================
// 헬퍼 함수
// ============================================================

function formatDateRange(start: string, end: string): string {
  if (!start && !end) return '';
  if (!start) return end;
  if (!end || start === end) return start;
  return `${start} ~ ${end}`;
}

function getCategoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

let nextId = 4;
function createEventRow(): EventRow {
  return { id: nextId++, name: '', datetime: '', note: '' };
}

// ============================================================
// 카드 프리뷰 컴포넌트 (1080×1080 실제 크기로 렌더링)
// ============================================================

interface CardPreviewProps {
  data: CardData;
  cardRef: React.RefObject<HTMLDivElement>;
}

function CardPreview({ data, cardRef }: CardPreviewProps) {
  const { competitionName, startDate, endDate, venue, category, events, branding } = data;
  const periodText = formatDateRange(startDate, endDate);
  const categoryLabel = getCategoryLabel(category);

  // 종목 행 — 빈 행은 프리뷰에서 건너뜀
  const visibleEvents = events.filter((e) => e.name.trim() || e.datetime.trim());

  return (
    /* 1080×1080 실제 크기 카드 — CSS transform으로 축소해서 보여줌 */
    <div
      ref={cardRef}
      style={{
        width: 1080,
        height: 1080,
        backgroundColor: CARD_COLORS.bg,
        fontFamily:
          '"Noto Sans CJK KR", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
        boxSizing: 'border-box',
        padding: '72px 80px 60px',
        display: 'flex',
        flexDirection: 'column',
        color: CARD_COLORS.textMain,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ───────── HEADER ───────── */}
      <div style={{ marginBottom: 24 }}>
        {/* 종별 배지 */}
        <div
          style={{
            display: 'inline-block',
            border: `2px solid ${CARD_COLORS.textMain}`,
            borderRadius: 4,
            padding: '4px 14px',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: CARD_COLORS.textMain,
            marginBottom: 24,
          }}
        >
          {categoryLabel}
        </div>

        {/* 대회명 */}
        <div
          style={{
            fontSize: competitionName.length > 20 ? 52 : 64,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: CARD_COLORS.textMain,
            marginBottom: 16,
            wordBreak: 'keep-all',
          }}
        >
          {competitionName || '대회명을 입력하세요'}
        </div>

        {/* 기간 */}
        {periodText && (
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: CARD_COLORS.textSub,
              letterSpacing: '0.01em',
            }}
          >
            {periodText}
          </div>
        )}
      </div>

      {/* ───────── DIVIDER ───────── */}
      <div
        style={{
          height: 3,
          backgroundColor: CARD_COLORS.dividerBold,
          marginBottom: 40,
        }}
      />

      {/* ───────── EVENTS TABLE ───────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* 테이블 헤더 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1.2fr',
            gap: '0 24px',
            paddingBottom: 16,
            borderBottom: `1px solid ${CARD_COLORS.dividerLight}`,
            marginBottom: 8,
          }}
        >
          {['종목', '일시', '비고'].map((h) => (
            <div
              key={h}
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: CARD_COLORS.textLight,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* 종목 행 */}
        {visibleEvents.length === 0 ? (
          <div
            style={{
              fontSize: 28,
              color: CARD_COLORS.textLight,
              paddingTop: 32,
              textAlign: 'center',
            }}
          >
            종목을 추가해주세요
          </div>
        ) : (
          visibleEvents.slice(0, 12).map((ev, idx) => (
            <div
              key={ev.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1.2fr',
                gap: '0 24px',
                padding: '20px 0',
                borderBottom:
                  idx < visibleEvents.slice(0, 12).length - 1
                    ? `1px solid ${CARD_COLORS.dividerLight}`
                    : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: CARD_COLORS.textMain,
                  letterSpacing: '-0.01em',
                }}
              >
                {ev.name}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 400,
                  color: CARD_COLORS.textSub,
                }}
              >
                {ev.datetime}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 400,
                  color: CARD_COLORS.textLight,
                }}
              >
                {ev.note}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ───────── BOTTOM DIVIDER ───────── */}
      <div
        style={{
          height: 2,
          backgroundColor: CARD_COLORS.dividerBold,
          marginTop: 32,
          marginBottom: 28,
        }}
      />

      {/* ───────── FOOTER ───────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        {/* 장소 */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: CARD_COLORS.textSub,
            maxWidth: 700,
          }}
        >
          {venue || ''}
        </div>

        {/* 브랜딩 */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: CARD_COLORS.accent,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {branding || 'AthleteTime'}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 메인 페이지 컴포넌트
// ============================================================

export default function ScheduleCardPage() {
  // 탭 상태
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  // 폼 상태
  const [competitionName, setCompetitionName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState('track_field');
  const [events, setEvents] = useState<EventRow[]>([
    { id: 1, name: '', datetime: '', note: '' },
    { id: 2, name: '', datetime: '', note: '' },
    { id: 3, name: '', datetime: '', note: '' },
  ]);
  const [branding, setBranding] = useState('AthleteTime');

  // 자동 모드 — 선택된 대회 id
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');

  // 카드 ref (html2canvas 캡처용)
  const cardRef = useRef<HTMLDivElement>(null!);

  // 대회 목록 불러오기
  const { data: competitionsData, isLoading: isLoadingCompetitions } = useCompetitions();
  const competitions: Competition[] = competitionsData?.competitions ?? [];

  // ── 자동 모드: 대회 선택 시 폼 자동 채우기 ──
  const handleSelectCompetition = useCallback(
    (id: string) => {
      setSelectedCompetitionId(id);
      if (!id) return;
      const comp = competitions.find((c) => c.id === id);
      if (!comp) return;
      setCompetitionName(comp.name);
      setStartDate(comp.start_date?.split('T')[0] ?? '');
      setEndDate(comp.end_date?.split('T')[0] ?? '');
      setVenue(comp.location ?? '');
      setCategory(comp.category ?? 'track_field');
    },
    [competitions],
  );

  // ── 종목 행 관리 ──
  const addEventRow = () => setEvents((prev) => [...prev, createEventRow()]);

  const removeEventRow = (id: number) => {
    if (events.length <= 1) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEventRow = (id: number, field: keyof Omit<EventRow, 'id'>, value: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  // ── 이미지 다운로드 ──
  const handleDownload = async () => {
    try {
      // NOTE: html2canvas 패키지를 먼저 설치해야 합니다.
      //   npm install html2canvas  또는  pnpm add html2canvas
      const { default: html2canvas } = await import('html2canvas');
      const element = cardRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 1, width: 1080, height: 1080 });
      const link = document.createElement('a');
      link.download = `schedule-card-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert(
        'html2canvas 패키지가 설치되지 않았습니다.\nnpm install html2canvas 를 실행한 후 다시 시도해주세요.',
      );
    }
  };

  // ── 카드 데이터 (프리뷰로 전달) ──
  const cardData: CardData = {
    competitionName,
    startDate,
    endDate,
    venue,
    category,
    events,
    branding,
  };

  // ── 탭 버튼 ──
  const TabButton = ({ tab, label }: { tab: 'auto' | 'manual'; label: string }) => (
    <button
      type="button"
      onClick={() => setMode(tab)}
      className={`tab-btn ${mode === tab ? 'tab-btn-active' : 'tab-btn-inactive'}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* ── 페이지 헤더 ── */}
      <PageHeader
        icon="📅"
        title="대회 일정 카드뉴스"
        description="대회 일정 정보를 카드뉴스로 만들어보세요"
        backTo="/competitions"
        backText="대회 목록으로"
      />

      {/* ── 탭 ── */}
      <div className="flex gap-2 mb-5">
        <TabButton tab="auto" label="자동 생성" />
        <TabButton tab="manual" label="직접 입력" />
      </div>

      {/* ── 메인 그리드: 좌(폼) + 우(프리뷰) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ════════ LEFT — FORM ════════ */}
        <div className="lg:col-span-3 space-y-5">

          {/* 자동 생성 — 대회 선택 */}
          {mode === 'auto' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-neutral-700">대회 선택</h2>
              </div>
              <div className="card-body">
                {isLoadingCompetitions ? (
                  <div className="skeleton h-11 w-full rounded-lg" />
                ) : (
                  <select
                    value={selectedCompetitionId}
                    onChange={(e) => handleSelectCompetition(e.target.value)}
                    className="input"
                  >
                    <option value="">— 대회를 선택하면 자동으로 채워집니다 —</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.start_date ? ` (${c.start_date.split('T')[0]})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* 기본 정보 */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-neutral-700">기본 정보</h2>
            </div>
            <div className="card-body space-y-4">
              {/* 대회명 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  대회명 <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  placeholder="예) 제50회 전국육상선수권대회"
                  className="input"
                />
              </div>

              {/* 기간 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  기간
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input"
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">시작일 / 종료일</p>
              </div>

              {/* 장소 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  장소
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="예) 서울올림픽주경기장"
                  className="input"
                />
              </div>

              {/* 종별 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  종별
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 종목 목록 */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-700">
                  종목 목록
                  <span className="text-neutral-400 font-normal ml-1">(최대 12개)</span>
                </h2>
                <button
                  type="button"
                  onClick={addEventRow}
                  disabled={events.length >= 12}
                  className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="w-4 h-4" />
                  종목 추가
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-neutral-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">
                        종목명
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500">
                        일시
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500 w-28">
                        비고
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-500 w-14">
                        삭제
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id} className="border-t border-neutral-100">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={ev.name}
                            onChange={(e) => updateEventRow(ev.id, 'name', e.target.value)}
                            placeholder="예) 남자 100m"
                            className="input text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={ev.datetime}
                            onChange={(e) => updateEventRow(ev.id, 'datetime', e.target.value)}
                            placeholder="예) 4/5 10:00"
                            className="input text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={ev.note}
                            onChange={(e) => updateEventRow(ev.id, 'note', e.target.value)}
                            placeholder="예) 결승"
                            className="input text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeEventRow(ev.id)}
                            disabled={events.length <= 1}
                            className="p-1.5 text-neutral-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 브랜딩 */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-neutral-700">브랜딩</h2>
            </div>
            <div className="card-body">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  브랜딩 텍스트
                </label>
                <input
                  type="text"
                  value={branding}
                  onChange={(e) => setBranding(e.target.value)}
                  placeholder="AthleteTime"
                  className="input"
                  maxLength={20}
                />
                <p className="text-xs text-neutral-400 mt-1">카드 우측 하단에 표시됩니다</p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════ RIGHT — PREVIEW ════════ */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-4">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-neutral-700">미리보기</h2>
                  <span className="text-xs text-neutral-400">1080 × 1080</span>
                </div>
              </div>
              <div className="card-body">
                {/* 카드 컨테이너 — 1080px를 축소해서 표시 */}
                <PreviewWrapper cardData={cardData} cardRef={cardRef} />
              </div>
            </div>

            {/* 다운로드 버튼 */}
            <button
              type="button"
              onClick={handleDownload}
              className="btn-primary w-full gap-2"
            >
              <span>⬇</span>
              이미지 다운로드
            </button>

            <p className="text-xs text-neutral-400 text-center">
              PNG 형식으로 저장됩니다 · 1080×1080px
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 프리뷰 래퍼 — 축소 비율 계산
// ============================================================

function PreviewWrapper({
  cardData,
  cardRef,
}: {
  cardData: CardData;
  cardRef: React.RefObject<HTMLDivElement>;
}) {
  // 컨테이너 너비에 맞게 scale 값을 정적으로 계산
  // lg:col-span-2 에서 실제 너비 ≈ 360px (여유 있게)
  // 모바일에서는 전체 너비 ≈ 320px
  const PREVIEW_WIDTH = 360; // px — CSS로 컨테이너에 고정
  const scale = PREVIEW_WIDTH / 1080;
  const scaledHeight = Math.round(1080 * scale);

  return (
    <div
      style={{
        width: PREVIEW_WIDTH,
        height: scaledHeight,
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #E5E5E5',
        borderRadius: 8,
        margin: '0 auto',
        backgroundColor: '#fff',
      }}
    >
      <div
        style={{
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          // 원본 크기(1080×1080)를 scale로 키우면 외부로 삐져나가지 않게 함
        }}
      >
        <CardPreview data={cardData} cardRef={cardRef} />
      </div>
    </div>
  );
}
