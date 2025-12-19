/**
 * 게시글 작성 페이지 (v4.1.0 - Light Mode Design System v2)
 * 
 * 핵심 개선:
 * - 깔끔한 코드 구조
 * - 컴포넌트 분리
 * - 유효성 검사 강화
 * - UX 향상
 * - 라이트 모드 디자인
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Image as ImageIcon, Megaphone } from 'lucide-react';
import { useCreatePost, useCategories } from '../hooks/usePosts';
import { getAnonymousId, getUsername, setUsername } from '../utils/anonymousUser';
import { showToast } from '../utils/toast';
import ImageUploader from '../components/post/ImageUploader';
import { useAuth } from '../context/AuthContext';

// ============================================
// 폼 유효성 검사
// ============================================

interface FormData {
  title: string;
  content: string;
  author: string;
  password: string;
  categoryId: number;
  instagram: string;
  isNotice: boolean;
}

function validateForm(data: FormData, images: File[]): string | null {
  if (!data.title.trim()) return '제목을 입력해주세요.';
  if (data.title.length > 200) return '제목은 200자 이내로 입력해주세요.';
  
  if (!data.content.trim()) return '내용을 입력해주세요.';
  if (data.content.length > 10000) return '내용은 10000자 이내로 입력해주세요.';
  
  if (!data.author.trim()) return '작성자명을 입력해주세요.';
  if (data.author.length > 50) return '작성자명은 50자 이내로 입력해주세요.';
  
  if (!data.password) return '비밀번호를 입력해주세요.';
  if (data.password.length < 4) return '비밀번호는 4자 이상 입력해주세요.';
  
  if (images.length > 5) return '이미지는 최대 5개까지 업로드할 수 있습니다.';
  
  return null;
}

// ============================================
// 메인 컴포넌트
// ============================================

export default function WritePage() {
  const navigate = useNavigate();
  const anonymousId = getAnonymousId();
  const { user } = useAuth();
  
  // 관리자 여부 확인
  const isAdmin = user?.isAdmin || false;
  
  // 폼 상태
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    author: '',
    password: '',
    categoryId: 2, // 기본: 자유게시판
    instagram: '',
    isNotice: false,
  });
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // API 훅
  const { data: categoriesData } = useCategories();
  const createPostMutation = useCreatePost();
  
  const categories = categoriesData || [];
  
  /**
   * 컴포넌트 마운트 시 저장된 사용자명 불러오기
   */
  useEffect(() => {
    const savedUsername = getUsername();
    if (savedUsername) {
      setFormData(prev => ({ ...prev, author: savedUsername }));
    }
  }, []);
  
  /**
   * 폼 입력 핸들러
   */
  const handleChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };
  
  /**
   * 게시글 작성 제출
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 유효성 검사
    const validationError = validateForm(formData, images);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      // 사용자명 저장
      setUsername(formData.author);
      
      // 카테고리 이름 찾기
      const category = categories.find(c => c.id === formData.categoryId);
      const categoryName = category?.name || '자유';
      
      // 게시글 작성
      const post = await createPostMutation.mutateAsync({
        data: {
          title: formData.title.trim(),
          content: formData.content.trim(),
          author: formData.author.trim(),
          password: formData.password,
          category: categoryName,
          instagram: formData.instagram.trim() || undefined,
          anonymousId,
          isNotice: isAdmin && formData.isNotice,
        },
        images,
      });
      
      showToast('✅ 게시글이 작성되었습니다!', { type: 'success' });
      setTimeout(() => navigate(`/post/${post.id}`), 500);
    } catch (err: any) {
      console.error('게시글 작성 실패:', err);
      setError(err.message || '게시글 작성에 실패했습니다.');
      showToast('게시글 작성에 실패했습니다.', { type: 'error' });
    }
  };
  
  /**
   * 취소 핸들러
   */
  const handleCancel = () => {
    if (formData.title || formData.content || images.length > 0) {
      if (!confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
        return;
      }
    }
    navigate(-1);
  };
  
  const isSubmitting = createPostMutation.isPending;
  
  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
            게시글 작성
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
        
        {/* 작성 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 카테고리 & 작성자 정보 */}
          <div className="card">
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 카테고리 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    게시판 <span className="text-danger-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => handleChange('categoryId', Number(e.target.value))}
                    className="select"
                    disabled={isSubmitting}
                    required
                  >
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={1}>📢 공지</option>
                        <option value={2}>💬 자유</option>
                        <option value={3}>🏃 훈련</option>
                        <option value={4}>🏆 대회</option>
                        <option value={5}>👟 장비</option>
                        <option value={6}>❓ 질문</option>
                      </>
                    )}
                  </select>
                </div>
                
                {/* 작성자명 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    작성자명 <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => handleChange('author', e.target.value)}
                    placeholder="닉네임"
                    maxLength={50}
                    className="input"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                
                {/* 비밀번호 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    비밀번호 <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="4자 이상"
                    minLength={4}
                    className="input"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
              
              {/* Instagram (선택) */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Instagram <span className="text-neutral-400">(선택)</span>
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="@username"
                  className="input"
                  disabled={isSubmitting}
                />
              </div>
              
              {/* 관리자 전용: 공지사항 체크박스 */}
              {isAdmin && (
                <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isNotice}
                      onChange={(e) => handleChange('isNotice', e.target.checked)}
                      className="w-5 h-5 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-primary-600" />
                      <span className="font-medium text-primary-700">공지사항으로 등록</span>
                    </div>
                  </label>
                  <p className="mt-2 text-sm text-primary-600 ml-8">
                    공지사항은 게시판 목록 상단에 고정됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>
          
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
          
          {/* 이미지 업로드 */}
          <div className="card">
            <div className="card-body">
              <label className="block text-sm font-medium text-neutral-700 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary-500" />
                <span>이미지 첨부 <span className="text-neutral-400">(최대 5개)</span></span>
              </label>
              <ImageUploader
                images={images}
                onImagesChange={setImages}
                maxImages={5}
                maxSizeKB={5120}
              />
            </div>
          </div>
          
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
                  <span>작성 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>게시글 작성</span>
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* 작성 가이드 */}
        <div className="mt-8 card">
          <div className="card-body">
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary-500" />
              작성 가이드
            </h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="text-primary-500">•</span>
                <span>이미지는 Cloudinary CDN에 업로드되어 빠르고 안정적으로 제공됩니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500">•</span>
                <span>작성자명과 비밀번호는 게시글 수정/삭제 시 필요합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500">•</span>
                <span>욕설, 비방, 허위사실 유포 등은 제재 대상이 될 수 있습니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500">•</span>
                <span>서로 격려하고 응원하는 건전한 커뮤니티 문화를 만들어주세요.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
