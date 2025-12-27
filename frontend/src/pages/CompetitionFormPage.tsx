/**
 * 대회 등록/수정 페이지
 * /competitions/new - 등록
 * /competitions/:id/edit - 수정
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { useCompetition, useCreateCompetition, useUpdateCompetition } from '../hooks/useCompetitions';
import { useAuth } from '../context/AuthContext';

// 대회 타입 옵션
const TYPE_OPTIONS = ['국내경기', '국제경기'] as const;

// 카테고리 옵션
const CATEGORY_OPTIONS = [
  '대한육상연맹사업',
  '트랙 및 필드',
  '로드레이스',
  '단일종목경기',
] as const;

// 폼 데이터 타입
interface FormData {
  name: string;
  type: '국내경기' | '국제경기';
  category: string;
  start_date: string;
  end_date: string;
  location: string;
  description: string;
}

const initialFormData: FormData = {
  name: '',
  type: '국내경기',
  category: '트랙 및 필드',
  start_date: '',
  end_date: '',
  location: '',
  description: '',
};

export default function CompetitionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const isEditMode = !!id;
  
  // 폼 상태
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  // API 훅
  const { data: competition, isLoading: isLoadingCompetition } = useCompetition(
    isEditMode ? parseInt(id) : 0
  );
  const createMutation = useCreateCompetition();
  const updateMutation = useUpdateCompetition();
  
  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && competition) {
      setFormData({
        name: competition.name,
        type: competition.type,
        category: competition.category,
        start_date: competition.start_date.split('T')[0],
        end_date: competition.end_date.split('T')[0],
        location: competition.location,
        description: competition.description || '',
      });
    }
  }, [isEditMode, competition]);
  
  // 관리자가 아니면 접근 차단
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3 className="empty-state-title">접근 권한이 없습니다</h3>
          <p className="empty-state-description">관리자만 접근할 수 있는 페이지입니다.</p>
          <Link to="/competitions" className="btn-primary mt-4">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }
  
  // 입력 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 에러 클리어
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // 유효성 검사
  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '대회명을 입력해주세요.';
    }
    if (!formData.start_date) {
      newErrors.start_date = '시작일을 선택해주세요.';
    }
    if (!formData.end_date) {
      newErrors.end_date = '종료일을 선택해주세요.';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = '종료일은 시작일 이후여야 합니다.';
    }
    if (!formData.location.trim()) {
      newErrors.location = '장소를 입력해주세요.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({
          id: parseInt(id),
          data: formData,
        });
        alert('대회가 수정되었습니다.');
      } else {
        await createMutation.mutateAsync(formData as any);
        alert('대회가 등록되었습니다.');
      }
      navigate('/competitions');
    } catch (error) {
      alert(isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    }
  };
  
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  
  // 수정 모드 로딩
  if (isEditMode && isLoadingCompetition) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fadeIn">
      {/* 헤더 */}
      <PageHeader
        title={isEditMode ? '대회 수정' : '대회 등록'}
        icon={isEditMode ? '✏️' : '➕'}
        description={isEditMode ? '대회 정보를 수정합니다' : '새로운 대회를 등록합니다'}
        backTo="/competitions"
        backText="목록으로"
      />
      
      {/* 폼 카드 */}
      <div className="card">
        <form onSubmit={handleSubmit} className="card-body space-y-6">
          {/* 대회명 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              대회명 <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="예: 제39회 전국체육고등학교체육대회(육상경기)"
              className={`input ${errors.name ? 'border-danger-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-danger-500 text-xs mt-1">{errors.name}</p>}
          </div>
          
          {/* 타입 & 카테고리 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                대회 유형 <span className="text-danger-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input"
                disabled={isSubmitting}
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                카테고리 <span className="text-danger-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input"
                disabled={isSubmitting}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* 기간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                시작일 <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={`input ${errors.start_date ? 'border-danger-500' : ''}`}
                disabled={isSubmitting}
              />
              {errors.start_date && <p className="text-danger-500 text-xs mt-1">{errors.start_date}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                종료일 <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={`input ${errors.end_date ? 'border-danger-500' : ''}`}
                disabled={isSubmitting}
              />
              {errors.end_date && <p className="text-danger-500 text-xs mt-1">{errors.end_date}</p>}
            </div>
          </div>
          
          {/* 장소 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              장소 <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="예: 대구"
              className={`input ${errors.location ? 'border-danger-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.location && <p className="text-danger-500 text-xs mt-1">{errors.location}</p>}
          </div>
          
          {/* 설명 (선택) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              설명 <span className="text-neutral-400">(선택)</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="대회에 대한 추가 설명..."
              rows={3}
              className="textarea"
              disabled={isSubmitting}
            />
          </div>
          
          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/competitions')}
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
