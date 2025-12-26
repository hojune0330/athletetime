/**
 * 대회 목록 페이지
 * /competitions
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useCompetitions, useDeleteCompetition } from '../hooks/useCompetitions';
import { useAuth } from '../context/AuthContext';
import type { Competition } from '../api/competitions';

// 탭 타입
type TabType = '국내경기' | '국제경기';

// 카테고리 순서
const CATEGORY_ORDER = ['대한육상연맹사업', '트랙 및 필드', '로드레이스', '단일종목경기'];

// 연도 옵션 생성 (현재년도 기준 ±5년)
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).reverse();

// 날짜 포맷팅
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const formatDate = (d: Date) => 
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

// 월 포맷팅
function formatMonth(month: number): string {
  return `${String(month).padStart(2, '0')}월`;
}

// 삭제 확인 모달
interface DeleteModalProps {
  isOpen: boolean;
  competitionName: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, competitionName, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="card max-w-md w-full animate-fadeInUp">
        <div className="card-body p-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-2">대회 삭제</h3>
          <p className="text-neutral-500 mb-4 text-sm">
            <strong>"{competitionName}"</strong> 대회를 삭제하시겠습니까?<br />
            관련된 모든 경기 결과도 함께 삭제됩니다.
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

// 카테고리 섹션 컴포넌트
interface CategorySectionProps {
  category: string;
  competitions: Competition[];
  isAdmin: boolean;
  onEdit: (id: number) => void;
  onDelete: (competition: Competition) => void;
}

function CategorySection({ category, competitions, isAdmin, onEdit, onDelete }: CategorySectionProps) {
  if (competitions.length === 0) return null;
  
  return (
    <div className="mb-6">
      {/* 카테고리 헤더 */}
      <div className="bg-primary-600 text-white px-4 py-2 rounded-t-lg font-medium">
        {category}
      </div>
      
      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-200">
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 w-20">월</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">대회명</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 w-48">기간</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 w-24">장소</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 w-28">결과상세</th>
              {isAdmin && (
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 w-24">관리</th>
              )}
            </tr>
          </thead>
          <tbody>
            {competitions.map((comp) => (
              <tr key={comp.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 text-sm text-neutral-700">{formatMonth(comp.month)}</td>
                <td className="px-4 py-3 text-sm text-neutral-900 font-medium">{comp.name}</td>
                <td className="px-4 py-3 text-sm text-neutral-600">
                  {formatDateRange(comp.start_date, comp.end_date)}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600">{comp.location}</td>
                <td className="px-4 py-3 text-center">
                  <Link
                    to={`/matchResult/${comp.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white text-xs font-medium rounded hover:bg-primary-600 transition-colors"
                  >
                    <EyeIcon className="w-4 h-4" />
                    보기
                  </Link>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(comp.id)}
                        className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="수정"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(comp)}
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
  );
}

// 메인 컴포넌트
export default function CompetitionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  
  // 상태
  const [activeTab, setActiveTab] = useState<TabType>('국내경기');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  
  // API 호출
  const { data, isLoading, isError } = useCompetitions({
    type: activeTab,
    year: selectedYear,
  });
  
  const deleteMutation = useDeleteCompetition();
  
  // 카테고리별 그룹핑
  const groupedCompetitions = useMemo(() => {
    if (!data?.competitions) return {};
    
    const grouped: Record<string, Competition[]> = {};
    CATEGORY_ORDER.forEach(cat => {
      grouped[cat] = [];
    });
    
    data.competitions.forEach(comp => {
      if (grouped[comp.category]) {
        grouped[comp.category].push(comp);
      }
    });
    
    return grouped;
  }, [data?.competitions]);
  
  // 삭제 핸들러
  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      alert('대회가 삭제되었습니다.');
      setDeleteTarget(null);
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fadeIn">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">🏆 대회 목록</h1>
        
        {isAdmin && (
          <Link
            to="/competitions/new"
            className="btn-primary"
          >
            <PlusIcon className="w-5 h-5" />
            대회 등록
          </Link>
        )}
      </div>
      
      {/* 탭 + 연도 필터 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        {/* 탭 */}
        <div className="flex rounded-lg overflow-hidden border border-neutral-200">
          {(['국내경기', '국제경기'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* 연도 선택 */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-neutral-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="input w-32"
          >
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
        </div>
      </div>
      
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
      
      {/* 대회 목록 */}
      {!isLoading && !isError && (
        <>
          {data?.competitions.length === 0 ? (
            <div className="empty-state py-16">
              <div className="empty-state-icon">🏆</div>
              <h3 className="empty-state-title">등록된 대회가 없습니다</h3>
              <p className="empty-state-description">
                {selectedYear}년 {activeTab}이(가) 없습니다.
              </p>
              {isAdmin && (
                <Link to="/competitions/new" className="btn-primary mt-4">
                  <PlusIcon className="w-5 h-5" />
                  대회 등록하기
                </Link>
              )}
            </div>
          ) : (
            <div className="card overflow-hidden">
              {CATEGORY_ORDER.map((category) => (
                <CategorySection
                  key={category}
                  category={category}
                  competitions={groupedCompetitions[category] || []}
                  isAdmin={isAdmin}
                  onEdit={(id) => navigate(`/competitions/${id}/edit`)}
                  onDelete={(comp) => setDeleteTarget(comp)}
                />
              ))}
            </div>
          )}
        </>
      )}
      
      {/* 삭제 확인 모달 */}
      <DeleteModal
        isOpen={!!deleteTarget}
        competitionName={deleteTarget?.name || ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
