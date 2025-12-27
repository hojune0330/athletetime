/**
 * 경기 결과 상세 페이지
 * /matchResult/:competitionId/:resultId
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import PageHeader from '../components/common/PageHeader';
import { useMatchResult, useDeleteMatchResult } from '../hooks/useCompetitions';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

// 순위별 스타일
function getRankStyle(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-yellow-100 text-yellow-800 font-bold';
    case 2:
      return 'bg-gray-100 text-gray-700 font-semibold';
    case 3:
      return 'bg-orange-100 text-orange-700 font-semibold';
    default:
      return 'bg-white text-neutral-700';
  }
}

// 순위 뱃지
function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  };
  
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${getRankStyle(rank)}`}>
      {medals[rank] || rank}
    </span>
  );
}

// 삭제 확인 모달
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-2">경기 결과 삭제</h3>
          <p className="text-neutral-500 mb-4 text-sm">
            이 경기 결과를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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

export default function MatchResultDetailPage() {
  const { competitionId, resultId } = useParams<{ competitionId: string; resultId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // API 호출
  const { data: matchResult, isLoading, isError } = useMatchResult(parseInt(resultId || '0'));
  const deleteMutation = useDeleteMatchResult();
  
  // 삭제 핸들러
  const handleDelete = async () => {
    if (!resultId) return;
    
    try {
      await deleteMutation.mutateAsync(parseInt(resultId));
      alert('경기 결과가 삭제되었습니다.');
      navigate(`/matchResult/${competitionId}`);
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  };
  
  // 로딩
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  // 에러
  if (isError || !matchResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">경기 결과를 찾을 수 없습니다</h3>
          <p className="empty-state-description">요청하신 경기 결과가 존재하지 않습니다.</p>
          <Link to={`/matchResult/${competitionId}`} className="btn-primary mt-4">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }
  
  const results = Array.isArray(matchResult.results) ? matchResult.results : [];
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fadeIn">
      {/* 헤더 */}
      <PageHeader
        title={`${matchResult.event} ${matchResult.division} ${matchResult.round}`}
        icon="🏅"
        description={`${matchResult.competition_name}${matchResult.competition_location ? ` · ${matchResult.competition_location}` : ''}`}
        backTo={`/matchResult/${competitionId}`}
        backText="경기 결과 목록으로"
        actions={
          isAdmin ? (
            <>
              <Link
                to={`/matchResult/${competitionId}/${resultId}/edit`}
                className="btn-secondary"
              >
                <PencilSquareIcon className="w-4 h-4" />
                수정
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn-ghost text-danger-500 hover:bg-danger-50"
              >
                <TrashIcon className="w-4 h-4" />
                삭제
              </button>
            </>
          ) : undefined
        }
      />
      
      {/* 결과 테이블 */}
      {results.length === 0 ? (
        <div className="empty-state py-16">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">등록된 기록이 없습니다</h3>
          {isAdmin && (
            <Link to={`/matchResult/${competitionId}/${resultId}/edit`} className="btn-primary mt-4">
              기록 추가하기
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary-600 text-white">
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">순위</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">선수명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">소속</th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-28">기록</th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-24">비고</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`border-b border-neutral-100 transition-colors ${
                      item.rank <= 3 ? getRankStyle(item.rank) : 'hover:bg-neutral-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <RankBadge rank={item.rank} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                      {item.athlete_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {item.team}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-sm font-bold text-primary-600">
                        {item.record}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.note && (
                        <span className={`badge ${
                          item.note === 'PB' ? 'bg-green-100 text-green-700' :
                          item.note === 'SB' ? 'bg-blue-100 text-blue-700' :
                          item.note === 'KR' ? 'bg-red-100 text-red-700' :
                          item.note === 'WR' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {item.note}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 범례 */}
          <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100">
            <p className="text-xs text-neutral-500">
              <span className="font-medium">비고:</span>{' '}
              <span className="badge bg-green-100 text-green-700 mr-1">PB</span> 개인최고기록{' '}
              <span className="badge bg-blue-100 text-blue-700 mr-1">SB</span> 시즌최고기록{' '}
              <span className="badge bg-red-100 text-red-700 mr-1">KR</span> 한국신기록{' '}
              <span className="badge bg-yellow-100 text-yellow-700">WR</span> 세계신기록
            </p>
          </div>
        </div>
      )}
      
      {/* 비고/메모 */}
      {matchResult.notes && (
        <div className="card mt-6">
          <div className="card-body">
            <h3 className="font-medium text-neutral-900 mb-2">📝 비고</h3>
            <p className="text-sm text-neutral-600 whitespace-pre-wrap">{matchResult.notes}</p>
          </div>
        </div>
      )}
      
      {/* 삭제 확인 모달 */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
