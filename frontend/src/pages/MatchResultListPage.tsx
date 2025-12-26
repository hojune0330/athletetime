/**
 * 경기 결과 목록 페이지
 * /matchResult/:competitionId
 */

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  MapPinIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useMatchResults, useDeleteMatchResult } from '../hooks/useCompetitions';
import { useAuth } from '../context/AuthContext';
import type { MatchResult } from '../api/competitions';

// 날짜 포맷팅
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const formatDate = (d: Date) => 
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

// 삭제 확인 모달
interface DeleteModalProps {
  isOpen: boolean;
  resultInfo: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, resultInfo, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-2">경기 결과 삭제</h3>
          <p className="text-neutral-500 mb-4 text-sm">
            <strong>"{resultInfo}"</strong> 경기 결과를 삭제하시겠습니까?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isDeleting}
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="btn-danger flex-1"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>삭제 중...</span>
                </>
              ) : (
                '삭제'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchResultListPage() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  
  // 필터 상태
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedRound, setSelectedRound] = useState('');
  
  // 삭제 상태
  const [deleteTarget, setDeleteTarget] = useState<MatchResult | null>(null);
  
  // API 호출
  const { data, isLoading, isError } = useMatchResults(
    parseInt(competitionId || '0'),
    {
      event: selectedEvent || undefined,
      division: selectedDivision || undefined,
      round: selectedRound || undefined,
    }
  );
  
  const deleteMutation = useDeleteMatchResult();
  
  // 삭제 핸들러
  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      alert('경기 결과가 삭제되었습니다.');
      setDeleteTarget(null);
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  };
  
  // 필터 초기화
  const clearFilters = () => {
    setSelectedEvent('');
    setSelectedDivision('');
    setSelectedRound('');
  };
  
  const hasFilters = selectedEvent || selectedDivision || selectedRound;
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fadeIn">
      {/* 뒤로가기 */}
      <button
        onClick={() => navigate('/competitions')}
        className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="font-medium">대회 목록으로</span>
      </button>
      
      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      )}
      
      {/* 에러 */}
      {isError && (
        <div className="empty-state py-16">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">데이터를 불러올 수 없습니다</h3>
          <p className="empty-state-description">잠시 후 다시 시도해주세요.</p>
        </div>
      )}
      
      {/* 메인 콘텐츠 */}
      {!isLoading && !isError && data && (
        <>
          {/* 대회 정보 헤더 */}
          <div className="card mb-6">
            <div className="card-body">
              <h1 className="text-2xl font-bold text-neutral-900 mb-3">
                🏆 {data.competition.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {formatDateRange(data.competition.start_date, data.competition.end_date)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  {data.competition.location}
                </span>
                <span className="badge bg-primary-100 text-primary-600">
                  {data.competition.type}
                </span>
                <span className="badge bg-neutral-100 text-neutral-600">
                  {data.competition.category}
                </span>
              </div>
            </div>
          </div>
          
          {/* 필터 + 등록 버튼 */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            {/* 필터 */}
            <div className="flex items-center gap-3 flex-wrap">
              <FunnelIcon className="w-5 h-5 text-neutral-400" />
              
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="input w-32 text-sm"
              >
                <option value="">전체 종목</option>
                {data.filters.events?.map(event => (
                  <option key={event} value={event}>{event}</option>
                ))}
              </select>
              
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="input w-32 text-sm"
              >
                <option value="">전체 종별</option>
                {data.filters.divisions?.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
              
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="input w-32 text-sm"
              >
                <option value="">전체 라운드</option>
                {data.filters.rounds?.map(round => (
                  <option key={round} value={round}>{round}</option>
                ))}
              </select>
              
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  필터 초기화
                </button>
              )}
            </div>
            
            {/* 등록 버튼 (관리자만) */}
            {isAdmin && (
              <Link
                to={`/matchResult/${competitionId}/new`}
                className="btn-primary"
              >
                <PlusIcon className="w-5 h-5" />
                경기 결과 등록
              </Link>
            )}
          </div>
          
          {/* 결과 테이블 */}
          {data.results.length === 0 ? (
            <div className="empty-state py-16">
              <div className="empty-state-icon">🏅</div>
              <h3 className="empty-state-title">등록된 경기 결과가 없습니다</h3>
              <p className="empty-state-description">
                {hasFilters ? '필터 조건에 맞는 결과가 없습니다.' : '아직 등록된 경기 결과가 없습니다.'}
              </p>
              {isAdmin && !hasFilters && (
                <Link to={`/matchResult/${competitionId}/new`} className="btn-primary mt-4">
                  <PlusIcon className="w-5 h-5" />
                  경기 결과 등록하기
                </Link>
              )}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-primary-600 text-white">
                      <th className="px-4 py-3 text-left text-sm font-medium w-32">종목</th>
                      <th className="px-4 py-3 text-left text-sm font-medium w-32">종별</th>
                      <th className="px-4 py-3 text-left text-sm font-medium w-32">라운드</th>
                      <th className="px-4 py-3 text-center text-sm font-medium w-28">결과</th>
                      {isAdmin && (
                        <th className="px-4 py-3 text-center text-sm font-medium w-24">관리</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((result) => (
                      <tr key={result.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-900 font-medium">{result.event}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{result.division}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{result.round}</td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/matchResult/${competitionId}/${result.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white text-xs font-medium rounded hover:bg-primary-600 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                            보기
                          </Link>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                to={`/matchResult/${competitionId}/${result.id}/edit`}
                                className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                title="수정"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteTarget(result)}
                                className="p-1.5 text-neutral-500 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                                title="삭제"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* 삭제 확인 모달 */}
      <DeleteModal
        isOpen={!!deleteTarget}
        resultInfo={deleteTarget ? `${deleteTarget.event} ${deleteTarget.division} ${deleteTarget.round}` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
