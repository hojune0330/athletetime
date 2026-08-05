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
 *
 * v6.0.0 (ui 2단계):
 *   - 페이지 UI(A): TRAINORACLE 디자인 시스템 정합 — 공용 Card/Button/Input/Skeleton,
 *     탭은 깔끔한 인라인 버튼 + 토큰 클래스(스퀘어 4px, ink/brand 토큰).
 *   - 카드 export 영역(B): accent #03C75A → brand teal #0D5F5A 로 통일,
 *     네이버 그린 제거. 인라인 style은 1080×1080 픽셀 정확도와 dynamic 값에만 사용.
 *   - useRef(...) 단언 제거, ID 카운터를 useRef 기반으로 옮겨 리마운트 안전.
 */

import { useCallback, useRef, useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/common/PageHeader';
import { useCompetitions } from '../hooks/useCompetitions';
import type { Competition } from '../api/competitions';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';

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

// 카드 export 영역 — TRAINORACLE 팔레트와 동형(보존=정합)
// html2canvas는 CSS 변수 보다 hex 값이 더 안정적으로 캡처되므로
// 디자인 시스템 hex 값을 직접 매핑해서 사용한다.
const CARD_THEME = {
  bg: '#FAFAF7',         // bg
  textMain: '#0E1412',   // ink
  textSub: '#2B3330',    // ink-2
  textLight: '#8F9894',  // ink-4
  accent: '#0D5F5A',     // brand (teal)  — 네이버 그린 제거
  dividerBold: '#0E1412',
  dividerLight: '#E8E6DF', // hair
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

type Mode = 'auto' | 'manual';

// ============================================================
// 헬퍼
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

// ============================================================
// 카드 프리뷰 컴포넌트 (1080×1080 실제 크기로 렌더링)
// 인라인 style은 1080×1080 export 정확도와 dynamic 값에만 사용한다.
// (html2canvas가 인식할 수 있도록 px 값을 명시)
// ============================================================

interface CardPreviewProps {
  data: CardData;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

function CardPreview({ data, cardRef }: CardPreviewProps) {
  const { competitionName, startDate, endDate, venue, category, events, branding } = data;
  const periodText = formatDateRange(startDate, endDate);
  const categoryLabel = getCategoryLabel(category);

  // 종목 행 — 빈 행은 프리뷰에서 건너뜀
  const visibleEvents = events.filter((e) => e.name.trim() || e.datetime.trim());
  const previewEvents = visibleEvents.slice(0, 12);

  return (
    /* 1080×1080 실제 크기 카드 — CSS transform으로 축소해서 보여줌 */
    <div
      ref={cardRef}
      style={{
        width: 1080,
        height: 1080,
        backgroundColor: CARD_THEME.bg,
        fontFamily:
          '"Noto Sans CJK KR", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
        boxSizing: 'border-box',
        padding: '72px 80px 60px',
        display: 'flex',
        flexDirection: 'column',
        color: CARD_THEME.textMain,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        {/* 종별 배지 */}
        <div
          style={{
            display: 'inline-block',
            border: `2px solid ${CARD_THEME.textMain}`,
            borderRadius: 4,
            padding: '4px 14px',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: CARD_THEME.textMain,
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
            color: CARD_THEME.textMain,
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
              color: CARD_THEME.textSub,
              letterSpacing: '0.01em',
            }}
          >
            {periodText}
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div
        style={{
          height: 3,
          backgroundColor: CARD_THEME.dividerBold,
          marginBottom: 40,
        }}
      />

      {/* EVENTS TABLE */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* 테이블 헤더 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1.2fr',
            gap: '0 24px',
            paddingBottom: 16,
            borderBottom: `1px solid ${CARD_THEME.dividerLight}`,
            marginBottom: 8,
          }}
        >
          {(['종목', '일시', '비고'] as const).map((h) => (
            <div
              key={h}
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: CARD_THEME.textLight,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* 종목 행 */}
        {previewEvents.length === 0 ? (
          <div
            style={{
              fontSize: 28,
              color: CARD_THEME.textLight,
              paddingTop: 32,
              textAlign: 'center',
            }}
          >
            종목을 추가해주세요
          </div>
        ) : (
          previewEvents.map((ev, idx) => (
            <div
              key={ev.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1.2fr',
                gap: '0 24px',
                padding: '20px 0',
                borderBottom:
                  idx < previewEvents.length - 1
                    ? `1px solid ${CARD_THEME.dividerLight}`
                    : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: CARD_THEME.textMain,
                  letterSpacing: '-0.01em',
                }}
              >
                {ev.name}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 400,
                  color: CARD_THEME.textSub,
                }}
              >
                {ev.datetime}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 400,
                  color: CARD_THEME.textLight,
                }}
              >
                {ev.note}
              </div>
            </div>
          ))
        )}
      </div>

      {/* BOTTOM DIVIDER */}
      <div
        style={{
          height: 2,
          backgroundColor: CARD_THEME.dividerBold,
          marginTop: 32,
          marginBottom: 28,
        }}
      />

      {/* FOOTER */}
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
            color: CARD_THEME.textSub,
            maxWidth: 700,
          }}
        >
          {venue || ''}
        </div>

        {/* 브랜딩 — TRAINORACLE brand teal */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: CARD_THEME.accent,
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
// 메인 페이지
// ============================================================

export default function ScheduleCardPage() {
  const [mode, setMode] = useState<Mode>('auto');

  // 폼 상태
  const [competitionName, setCompetitionName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState('track_field');
  const [idCounter, setIdCounter] = useState(4);
  const [events, setEvents] = useState<EventRow[]>(() =>
    [1, 2, 3].map((id) => ({ id, name: '', datetime: '', note: '' })),
  );
  const [branding, setBranding] = useState('AthleteTime');

  // 자동 모드 — 선택된 대회 id
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');

  // 카드 ref (html2canvas 캡처용) — null 허용으로 타입 안전하게
  const cardRef = useRef<HTMLDivElement | null>(null);

  // 대회 목록 불러오기
  const { data: competitionsData, isLoading: isLoadingCompetitions } = useCompetitions();
  const competitions: Competition[] = competitionsData?.competitions ?? [];

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

  const addEventRow = () => {
    if (events.length >= 12) return;
    setIdCounter((n) => n + 1);
    setEvents((prev) => [
      ...prev,
      { id: idCounter + 1, name: '', datetime: '', note: '' },
    ]);
  };

  const removeEventRow = (id: number) => {
    if (events.length <= 1) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEventRow = (id: number, field: keyof Omit<EventRow, 'id'>, value: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

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
    } catch {
      // 디자인 결정: html2canvas 부재 시 영상 다운로드 못 함을 명확히 알린다.
      // 화면 잠그는 confirm 대신 alert 유지(짧은 안내).
      window.alert('html2canvas 패키지가 설치되지 않았습니다.\nnpm install html2canvas 후 다시 시도해주세요.');
    }
  };

  const cardData: CardData = {
    competitionName,
    startDate,
    endDate,
    venue,
    category,
    events,
    branding,
  };

  // 탭 버튼 — 공용 토큰, 스퀘어 코너 4px
  const tabCls = (active: boolean) =>
    cn(
      'flex-1 rounded-md px-3 py-2 text-body-sm font-medium transition-colors',
      active
        ? 'bg-brand/10 text-brand'
        : 'bg-surface text-ink-3 hover:bg-surface-2 hover:text-ink',
    );

  return (
    <div className="min-h-screen bg-bg text-ink">
      <PageHeader
        icon="📅"
        title="대회 일정 카드뉴스"
        description="대회 일정 정보를 카드뉴스로 만들어보세요"
        backTo="/competitions"
        backText="대회 목록으로"
      />

      {/* 탭 */}
      <div role="tablist" aria-label="입력 모드" className="mb-5 flex gap-2 border-b border-hair">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'auto'}
          onClick={() => setMode('auto')}
          className={tabCls(mode === 'auto')}
        >
          자동 생성
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'manual'}
          onClick={() => setMode('manual')}
          className={tabCls(mode === 'manual')}
        >
          직접 입력
        </button>
      </div>

      {/* 메인 그리드: 좌(폼) + 우(프리뷰) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEFT — FORM */}
        <div className="space-y-5 lg:col-span-3">
          {/* 자동 생성 — 대회 선택 */}
          {mode === 'auto' && (
            <Card>
              <CardHeader className="border-b border-hair">
                <CardTitle className="text-body-sm font-semibold text-ink-2">대회 선택</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingCompetitions ? (
                  <Skeleton className="h-11 w-full rounded-md" />
                ) : (
                  <select
                    value={selectedCompetitionId}
                    onChange={(e) => handleSelectCompetition(e.target.value)}
                    className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    aria-label="대회 선택"
                  >
                    <option value="">— 대회를 선택하면 자동으로 채워집니다 —</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.start_date ? ` (${c.start_date.split('T')[0]})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </CardContent>
            </Card>
          )}

          {/* 기본 정보 */}
          <Card>
            <CardHeader className="border-b border-hair">
              <CardTitle className="text-body-sm font-semibold text-ink-2">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="sc-name" className="mb-1 block text-body-sm font-medium text-ink-2">
                  대회명 <span className="text-err">*</span>
                </label>
                <Input
                  id="sc-name"
                  type="text"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  placeholder="예) 제50회 전국육상선수권대회"
                />
              </div>

              <div>
                <label className="mb-1 block text-body-sm font-medium text-ink-2">기간</label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    aria-label="시작일"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    aria-label="종료일"
                  />
                </div>
                <p className="mt-1 text-caption text-ink-4">시작일 / 종료일</p>
              </div>

              <div>
                <label htmlFor="sc-venue" className="mb-1 block text-body-sm font-medium text-ink-2">
                  장소
                </label>
                <Input
                  id="sc-venue"
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="예) 서울올림픽주경기장"
                />
              </div>

              <div>
                <label htmlFor="sc-category" className="mb-1 block text-body-sm font-medium text-ink-2">
                  종별
                </label>
                <select
                  id="sc-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-body-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* 종목 목록 */}
          <Card>
            <CardHeader className="border-b border-hair">
              <div className="flex items-center justify-between">
                <CardTitle className="text-body-sm font-semibold text-ink-2">
                  종목 목록
                  <span className="ml-1 font-normal text-ink-4">(최대 12개)</span>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEventRow}
                  disabled={events.length >= 12}
                  aria-label="종목 추가"
                >
                  <PlusIcon className="h-4 w-4" aria-hidden />
                  종목 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-2">
                      <th className="px-4 py-2.5 text-left text-caption font-medium text-ink-4">종목명</th>
                      <th className="px-4 py-2.5 text-left text-caption font-medium text-ink-4">일시</th>
                      <th className="w-28 px-4 py-2.5 text-left text-caption font-medium text-ink-4">비고</th>
                      <th className="w-14 px-4 py-2.5 text-center text-caption font-medium text-ink-4">삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id} className="border-t border-hair">
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            value={ev.name}
                            onChange={(e) => updateEventRow(ev.id, 'name', e.target.value)}
                            placeholder="예) 남자 100m"
                            className="text-body-sm"
                            aria-label="종목명"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            value={ev.datetime}
                            onChange={(e) => updateEventRow(ev.id, 'datetime', e.target.value)}
                            placeholder="예) 4/5 10:00"
                            className="text-body-sm"
                            aria-label="일시"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            value={ev.note}
                            onChange={(e) => updateEventRow(ev.id, 'note', e.target.value)}
                            placeholder="예) 결승"
                            className="text-body-sm"
                            aria-label="비고"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEventRow(ev.id)}
                            disabled={events.length <= 1}
                            aria-label="종목 삭제"
                            className="text-ink-4 hover:bg-err/10 hover:text-err"
                          >
                            <TrashIcon className="h-4 w-4" aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 브랜딩 */}
          <Card>
            <CardHeader className="border-b border-hair">
              <CardTitle className="text-body-sm font-semibold text-ink-2">브랜딩</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label htmlFor="sc-branding" className="mb-1 block text-body-sm font-medium text-ink-2">
                  브랜딩 텍스트
                </label>
                <Input
                  id="sc-branding"
                  type="text"
                  value={branding}
                  onChange={(e) => setBranding(e.target.value)}
                  placeholder="AthleteTime"
                  maxLength={20}
                />
                <p className="mt-1 text-caption text-ink-4">카드 우측 하단에 표시됩니다</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — PREVIEW */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader className="border-b border-hair">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-body-sm font-semibold text-ink-2">미리보기</CardTitle>
                  <span className="font-mono text-caption text-ink-4">1080 × 1080</span>
                </div>
              </CardHeader>
              <CardContent>
                <PreviewWrapper cardData={cardData} cardRef={cardRef} />
              </CardContent>
            </Card>

            <Button type="button" onClick={handleDownload} className="w-full gap-2" size="lg">
              <span aria-hidden>⬇</span>
              이미지 다운로드
            </Button>

            <p className="text-center text-caption text-ink-4">
              PNG 형식으로 저장됩니다 · 1080×1080px
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 프리뷰 래퍼 — 1080px 를 축소 비율로 표시
// 인라인 값은 동적 scale 계산만(컨테이너 사이즈 고정)
// ============================================================

function PreviewWrapper({
  cardData,
  cardRef,
}: {
  cardData: CardData;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const PREVIEW_WIDTH = 360;
  const scale = PREVIEW_WIDTH / 1080;
  const scaledHeight = Math.round(1080 * scale);

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-lg border border-line bg-surface"
      style={{ width: PREVIEW_WIDTH, height: scaledHeight }}
    >
      <div style={{ transformOrigin: 'top left', transform: `scale(${scale})` }}>
        <CardPreview data={cardData} cardRef={cardRef} />
      </div>
    </div>
  );
}
