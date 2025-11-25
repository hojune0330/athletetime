/**
 * 게시글 작성 페이지 (v4.0.0 - Clean Architecture)
 * 
 * 핵심 개선:
 * - 깔끔한 코드 구조
 * - 컴포넌트 분리
 * - 유효성 검사 강화
 * - UX 향상
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useCreatePost, useCategories } from '../hooks/usePosts';
import { getAnonymousId, getUsername, setUsername } from '../utils/anonymousUser';
import { showToast } from '../utils/toast';
import ImageUploader from '../components/post/ImageUploader';

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
  
  // 폼 상태
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    author: '',
    password: '',
    categoryId: 2, // 기본: 자유게시판
    instagram: '',
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
  const handleChange = (field: keyof FormData, value: string | number) => {
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
    <div className="min-h-screen bg-dark-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>돌아가기</span>
          </button>
          
          <h1 className="text-2xl font-bold text-white">
            게시글 작성
          </h1>
          
          <div className="w-24" /> {/* Spacer */}
        </div>
        
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        
        {/* 작성 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 카테고리 & 작성자 정보 */}
          <div className="bg-dark-700 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  게시판 <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleChange('categoryId', Number(e.target.value))}
                  className="w-full px-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  작성자명 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleChange('author', e.target.value)}
                  placeholder="닉네임"
                  maxLength={50}
                  className="w-full px-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              {/* 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  비밀번호 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="4자 이상"
                  minLength={4}
                  className="w-full px-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
            
            {/* Instagram (선택) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Instagram (선택)
              </label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="@username"
                className="w-full px-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          {/* 제목 */}
          <div className="bg-dark-700 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="제목을 입력하세요 (최대 200자)"
              maxLength={200}
              className="w-full px-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-lg"
              disabled={isSubmitting}
              required
            />
            <p className="mt-2 text-xs text-gray-500 text-right">
              {formData.title.length} / 200
            </p>
          </div>
          
          {/* 내용 */}
          <div className="bg-dark-700 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              내용 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="내용을 입력하세요 (최대 10000자)"
              maxLength={10000}
              rows={15}
              className="w-full px-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary-500"
              disabled={isSubmitting}
              required
            />
            <p className="mt-2 text-xs text-gray-500 text-right">
              {formData.content.length} / 10000
            </p>
          </div>
          
          {/* 이미지 업로드 */}
          <div className="bg-dark-700 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              <span>이미지 첨부 (최대 5개)</span>
            </label>
            <ImageUploader
              images={images}
              onImagesChange={setImages}
              maxImages={5}
              maxSizeKB={5120}
            />
          </div>
          
          {/* 제출 버튼 */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 bg-dark-600 text-gray-300 rounded-lg hover:bg-dark-500 transition-colors font-medium"
              disabled={isSubmitting}
            >
              취소
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="mt-8 bg-dark-700 rounded-lg p-6">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary-400" />
            작성 가이드
          </h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              <span>이미지는 Cloudinary CDN에 업로드되어 빠르고 안정적으로 제공됩니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              <span>작성자명과 비밀번호는 게시글 수정/삭제 시 필요합니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              <span>욕설, 비방, 허위사실 유포 등은 제재 대상이 될 수 있습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              <span>서로 격려하고 응원하는 건전한 커뮤니티 문화를 만들어주세요.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
