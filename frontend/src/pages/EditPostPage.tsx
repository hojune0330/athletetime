/**
 * 게시글 수정 페이지 (v4.1.0 - Light Mode Design System v2)
 * 
 * WritePage 폼을 재사용하여 기존 게시글 내용을 수정
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { usePost, useUpdatePost } from '../hooks/usePosts';
import { showToast } from '../utils/toast';

// ============================================
// 폼 유효성 검사
// ============================================

interface FormData {
  title: string;
  content: string;
}

function validateForm(data: FormData): string | null {
  if (!data.title.trim()) return '제목을 입력해주세요.';
  if (data.title.length > 200) return '제목은 200자 이내로 입력해주세요.';
  
  if (!data.content.trim()) return '내용을 입력해주세요.';
  if (data.content.length > 10000) return '내용은 10000자 이내로 입력해주세요.';
  
  return null;
}

// ============================================
// 메인 컴포넌트
// ============================================

export default function EditPostPage() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();
  const id = postId || '';
  
  // location.state에서 비밀번호 가져오기
  const password = (location.state as { password?: string })?.password;
  
  // 비밀번호 없이 직접 접근한 경우 상세 페이지로 리다이렉트
  useEffect(() => {
    if (!password) {
      showToast('비밀번호 확인이 필요합니다.', { type: 'error' });
      navigate(`/community/post/${id}`, { replace: true });
    }
  }, [password, id, navigate]);
  
  // 폼 상태
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // API 훅
  const { data: post, isLoading: isPostLoading } = usePost(id);
  const updatePostMutation = useUpdatePost();
  
  // 게시글 데이터로 폼 초기화
  useEffect(() => {
    if (post && !isInitialized) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
      });
      setIsInitialized(true);
    }
  }, [post, isInitialized]);
  
  /**
   * 폼 입력 핸들러
   */
  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };
  
  /**
   * 게시글 수정 제출
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 유효성 검사
    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (!password) {
      setError('비밀번호가 없습니다. 다시 시도해주세요.');
      return;
    }
    
    try {
      // 게시글 수정 (카테고리는 기존 값 유지)
      await updatePostMutation.mutateAsync({
        id,
        data: {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: post?.category_name || '자유',
          password,
        },
      });
      
      showToast('✅ 게시글이 수정되었습니다!', { type: 'success' });
      setTimeout(() => navigate(`/community/post/${id}`), 500);
    } catch (err: any) {
      console.error('게시글 수정 실패:', err);
      setError(err.message || '게시글 수정에 실패했습니다.');
      showToast('게시글 수정에 실패했습니다.', { type: 'error' });
    }
  };
  
  /**
   * 취소 핸들러
   */
  const handleCancel = () => {
    const hasChanges = post && (
      formData.title !== post.title ||
      formData.content !== post.content
    );
    
    if (hasChanges) {
      if (!confirm('수정 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
        return;
      }
    }
    navigate(`/community/post/${id}`);
  };
  
  const isSubmitting = updatePostMutation.isPending;
  
  // 비밀번호 없으면 렌더링하지 않음
  if (!password) {
    return null;
  }
  
  // 게시글 로딩 중
  if (isPostLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 py-8 px-4">
        <div className="max-w-5xl mx-auto flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }
  
  // 게시글을 찾을 수 없는 경우
  if (!post) {
    return (
      <div className="min-h-screen bg-neutral-50 py-8 px-4">
        <div className="max-w-5xl mx-auto empty-state py-16">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">게시글을 찾을 수 없습니다</h3>
          <p className="empty-state-description">
            게시글이 삭제되었거나 존재하지 않습니다.
          </p>
          <button onClick={() => navigate('/community')} className="btn-primary">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors min-h-[44px]"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">돌아가기</span>
          </button>
          
          <h1 className="text-2xl font-bold text-neutral-900">
            게시글 수정
          </h1>
          
          <div className="w-24" /> {/* Spacer */}
        </div>
        
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
            <p className="text-danger-700 text-sm">{error}</p>
          </div>
        )}
        
        {/* 수정 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제목 */}
          <div className="card">
            <div className="card-body">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                제목 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="제목을 입력하세요 (최대 200자)"
                maxLength={200}
                className="input text-lg"
                disabled={isSubmitting}
                required
              />
              <p className="mt-2 text-xs text-neutral-400 text-right">
                {formData.title.length} / 200
              </p>
            </div>
          </div>
          
          {/* 내용 */}
          <div className="card">
            <div className="card-body">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                내용 <span className="text-danger-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="내용을 입력하세요 (최대 10000자)"
                maxLength={10000}
                rows={15}
                className="textarea"
                disabled={isSubmitting}
                required
              />
              <p className="mt-2 text-xs text-neutral-400 text-right">
                {formData.content.length} / 10000
              </p>
            </div>
          </div>
          
          {/* 기존 이미지 표시 (수정 불가) */}
          {post.images && post.images.length > 0 && (
            <div className="card">
              <div className="card-body">
                <label className="block text-sm font-medium text-neutral-700 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary-500" />
                  <span>첨부된 이미지</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {post.images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100">
                      <img
                        src={img.thumbnail_url || img.cloudinary_url}
                        alt={`이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-neutral-400">
                  * 이미지는 수정할 수 없습니다. 이미지 변경이 필요한 경우 게시글을 새로 작성해주세요.
                </p>
              </div>
            </div>
          )}
          
          {/* 제출 버튼 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary w-full sm:w-auto"
              disabled={isSubmitting}
            >
              취소
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>수정 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>게시글 수정</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
