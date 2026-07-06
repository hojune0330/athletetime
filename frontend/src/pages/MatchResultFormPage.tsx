/**
 * 경기 결과 등록/수정 페이지
 * /matchResult/:competitionId/new - 등록
 * /matchResult/:competitionId/:resultId/edit - 수정
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/common/PageHeader';
import { useCompetition, useMatchResult, useCreateMatchResult, useUpdateMatchResult } from '../hooks/useCompetitions';
import { useAuth } from '../context/AuthContext';
import type { MatchResultItem } from '../api/competitions';

// 종목 옵션
const EVENT_OPTIONS = [
  '100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', '10000m',
  '100mH', '110mH', '400mH', '3000mSC',
  '높이뛰기', '장대높이뛰기', '멀리뛰기', '세단뛰기',
  '포환던지기', '원반던지기', '해머던지기', '창던지기',
  '10종경기', '7종경기',
  '마라톤', '하프마라톤', '10km', '5km',
  '20km경보', '35km경보', '50km경보',
  '4x100m 계주', '4x400m 계주',
];

// 종별 옵션
const DIVISION_OPTIONS = [
  '남자부', '여자부',
  '남자고등부', '여자고등부',
  '남자중등부', '여자중등부',
  '남자초등부', '여자초등부',
  '남자일반부', '여자일반부',
];

// 라운드 옵션
const ROUND_OPTIONS = ['예선', '준결승', '결승', '본선'];

// 비고 옵션
const NOTE_OPTIONS = ['', 'PB', 'SB', 'KR', 'AR', 'WR', 'DNS', 'DNF', 'DQ'];

// 빈 결과 항목
const emptyResultItem: MatchResultItem = {
  rank: 1,
  athlete_name: '',
  team: '',
  record: '',
  note: '',
};

export default function MatchResultFormPage() {
  const { competitionId, resultId } = useParams<{ competitionId: string; resultId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const isEditMode = !!resultId;
  
  // 폼 상태
  const [event, setEvent] = useState('100m');
  const [customEvent, setCustomEvent] = useState('');
  const [division, setDivision] = useState('남자부');
  const [round, setRound] = useState('결승');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [results, setResults] = useState<MatchResultItem[]>([
    { ...emptyResultItem, rank: 1 },
    { ...emptyResultItem, rank: 2 },
    { ...emptyResultItem, rank: 3 },
  ]);
  
  // API 훅
  const { data: competition } = useCompetition(competitionId || '');
  const { data: matchResult, isLoading: isLoadingResult } = useMatchResult(
    isEditMode ? parseInt(resultId) : 0
  );
  const createMutation = useCreateMatchResult();
  const updateMutation = useUpdateMatchResult();
  
  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && matchResult) {
      // 기존 종목이 옵션에 있는지 확인
      if (EVENT_OPTIONS.includes(matchResult.event)) {
        setEvent(matchResult.event);
        setCustomEvent('');
      } else {
        setEvent('기타');
        setCustomEvent(matchResult.event);
      }
      setDivision(matchResult.division);
      setRound(matchResult.round);
      setEventDate(matchResult.event_date?.split('T')[0] || '');
      setNotes(matchResult.notes || '');
      
      const loadedResults = Array.isArray(matchResult.results) ? matchResult.results : [];
      if (loadedResults.length > 0) {
        setResults(loadedResults);
      }
    }
  }, [isEditMode, matchResult]);
  
  // 관리자가 아니면 접근 차단
  if (!isAdmin) {
    return (
      <div className="py-16">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3 className="empty-state-title">접근 권한이 없습니다</h3>
          <p className="empty-state-description">관리자만 접근할 수 있는 페이지입니다.</p>
          <Link to={`/matchResult/${competitionId}`} className="btn-primary mt-4">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }
  
  // 결과 항목 추가
  const addResultItem = () => {
    const newRank = results.length + 1;
    setResults([...results, { ...emptyResultItem, rank: newRank }]);
  };
  
  // 결과 항목 삭제
  const removeResultItem = (index: number) => {
    if (results.length <= 1) return;
    const newResults = results.filter((_, i) => i !== index);
    // 순위 재정렬
    setResults(newResults.map((item, i) => ({ ...item, rank: i + 1 })));
  };
  
  // 결과 항목 업데이트
  const updateResultItem = (index: number, field: keyof MatchResultItem, value: string | number) => {
    const newResults = [...results];
    newResults[index] = { ...newResults[index], [field]: value };
    setResults(newResults);
  };
  
  // 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalEvent = event === '기타' ? customEvent : event;
    
    // 유효성 검사
    if (!finalEvent.trim()) {
      alert('종목을 입력해주세요.');
      return;
    }
    
    // 빈 결과 필터링
    const validResults = results.filter(r => r.athlete_name.trim() && r.record.trim());
    
    if (validResults.length === 0) {
      alert('최소 1명의 선수 기록을 입력해주세요.');
      return;
    }
    
    try {
      const data = {
        competition_id: competitionId || '',
        event: finalEvent,
        division,
        round,
        results: validResults,
        event_date: eventDate || undefined,
        notes: notes || undefined,
      };
      
      if (isEditMode) {
        await updateMutation.mutateAsync({
          id: parseInt(resultId),
          data,
        });
        alert('경기 결과가 수정되었습니다.');
      } else {
        await createMutation.mutateAsync(data);
        alert('경기 결과가 등록되었습니다.');
      }
      navigate(`/matchResult/${competitionId}`);
    } catch (error) {
      alert(isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    }
  };
  
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  
  // 로딩
  if (isEditMode && isLoadingResult) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div>
      {/* 헤더 */}
      <PageHeader
        title={isEditMode ? '경기 결과 수정' : '경기 결과 등록'}
        icon={isEditMode ? '✏️' : '🏅'}
        description={competition ? `${competition.name} · ${competition.location}` : undefined}
        backTo={`/matchResult/${competitionId}`}
        backText="경기 결과 목록으로"
      />
      
      {/* 폼 카드 */}
      <div className="card">
        <form onSubmit={handleSubmit} className="card-body space-y-6">
          {/* 경기 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                종목 <span className="text-danger-500">*</span>
              </label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="input"
                disabled={isSubmitting}
              >
                {EVENT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="기타">기타 (직접 입력)</option>
              </select>
              {event === '기타' && (
                <input
                  type="text"
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  placeholder="종목명 입력"
                  className="input mt-2"
                  disabled={isSubmitting}
                />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                종별 <span className="text-danger-500">*</span>
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="input"
                disabled={isSubmitting}
              >
                {DIVISION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                라운드 <span className="text-danger-500">*</span>
              </label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="input"
                disabled={isSubmitting}
              >
                {ROUND_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 경기 일자 (선택) */}
          <div className="w-48">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              경기 일자 <span className="text-neutral-400">(선택)</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input"
              disabled={isSubmitting}
            />
          </div>
          
          {/* 선수 기록 입력 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-neutral-700">
                선수 기록 <span className="text-danger-500">*</span>
              </label>
              <button
                type="button"
                onClick={addResultItem}
                className="btn-secondary text-sm"
                disabled={isSubmitting}
              >
                <PlusIcon className="w-4 h-4" />
                선수 추가
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 w-16">순위</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600">선수명</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600">소속</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 w-28">기록</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 w-24">비고</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-600 w-16">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, index) => (
                    <tr key={index} className="border-b border-neutral-100">
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.rank}
                          onChange={(e) => updateResultItem(index, 'rank', parseInt(e.target.value) || 0)}
                          className="input text-center w-14"
                          min="1"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.athlete_name}
                          onChange={(e) => updateResultItem(index, 'athlete_name', e.target.value)}
                          placeholder="선수명"
                          className="input"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.team}
                          onChange={(e) => updateResultItem(index, 'team', e.target.value)}
                          placeholder="소속"
                          className="input"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.record}
                          onChange={(e) => updateResultItem(index, 'record', e.target.value)}
                          placeholder="10.21"
                          className="input font-mono"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.note || ''}
                          onChange={(e) => updateResultItem(index, 'note', e.target.value)}
                          className="input"
                          disabled={isSubmitting}
                        >
                          {NOTE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt || '-'}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeResultItem(index)}
                          disabled={results.length <= 1 || isSubmitting}
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
          
          {/* 비고 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              메모 <span className="text-neutral-400">(선택)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="추가 메모..."
              rows={2}
              className="textarea"
              disabled={isSubmitting}
            />
          </div>
          
          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/matchResult/${competitionId}`)}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isEditMode ? '수정 중...' : '등록 중...'}</span>
                </>
              ) : (
                isEditMode ? '수정하기' : '등록하기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
