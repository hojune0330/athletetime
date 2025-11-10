<<<<<<< HEAD
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClockIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { useCreatePost } from '../hooks/usePosts'

export default function WritePage() {
  const navigate = useNavigate()
  const createPost = useCreatePost()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('track-sprint')
  const [eventType, setEventType] = useState('')
  const [record, setRecord] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [isOfficial, setIsOfficial] = useState(false)
  const [author, setAuthor] = useState('')
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const isSubmitting = createPost.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!password.trim()) {
      setSubmitError('삭제용 비밀번호를 입력해주세요.')
      return
    }

    try {
      await createPost.mutateAsync({
        title: title.trim() || '제목 없음',
        content: content.trim(),
        author: author.trim() || '익명',
        password: password.trim(),
        category,
      })

      setSubmitSuccess('게시글이 등록됐어요! 잠시 후 메인으로 이동합니다.')
      setTitle('')
      setContent('')
      setCategory('track-sprint')
      setEventType('')
      setRecord('')
      setRecordDate('')
      setIsOfficial(false)
      setAuthor('')
      setPassword('')

      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch (error) {
      console.error(error)
      setSubmitError('게시글을 등록하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  // 종목별 이벤트 목록
  const eventsByCategory: { [key: string]: string[] } = {
    'track-sprint': ['100m', '200m', '400m', '4x100m 릴레이'],
    'track-middle': ['800m', '1500m', '3000m'],
    'track-distance': ['5000m', '10000m', '3000m 장애물'],
    'track-hurdles': ['110m 허들', '100m 허들', '400m 허들'],
    'field-jumps': ['높이뛰기', '멀리뛰기', '세단뛰기', '장대높이뛰기'],
    'field-throws': ['포환던지기', '원반던지기', '창던지기', '해머던지기'],
    'running-marathon': ['풀코스', '하프', '10K', '5K'],
  }

=======
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
import { useNavigate, Link } from 'react-router-dom';
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
  
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
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
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
<<<<<<< HEAD
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                작성자 닉네임 (선택)
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                삭제용 비밀번호 <span className="text-primary-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="게시글 삭제 시 필요한 비밀번호"
                className="input-dark"
                required
              />
              <p className="mt-1 text-xs text-gray-500">※ 비밀번호는 잊지 않도록 주의해주세요.</p>
            </div>
          </div>

          {/* 기록 입력 (육상/러닝 카테고리일 때만) */}
          {(category.includes('track') || category.includes('field') || category.includes('running')) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
=======
              
              {/* 작성자명 */}
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
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
<<<<<<< HEAD

          {/* 옵션 설정 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowComments"
                defaultChecked
                className="w-4 h-4 rounded text-primary-500 bg-dark-700 border-dark-500 focus:ring-primary-500"
              />
              <label htmlFor="allowComments" className="text-sm text-gray-300">
                댓글 허용
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shareRecord"
                defaultChecked
                className="w-4 h-4 rounded text-primary-500 bg-dark-700 border-dark-500 focus:ring-primary-500"
              />
              <label htmlFor="shareRecord" className="text-sm text-gray-300">
                기록 공개 (랭킹 반영)
              </label>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}
          {submitSuccess && <p className="text-sm text-green-400">{submitSuccess}</p>}

          {/* 버튼 영역 */}
          <div className="flex items-center justify-between pt-4">
=======
          
          {/* 제출 버튼 */}
          <div className="flex items-center justify-between">
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 bg-dark-600 text-gray-300 rounded-lg hover:bg-dark-500 transition-colors font-medium"
              disabled={isSubmitting}
            >
              취소
            </button>
<<<<<<< HEAD
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary"
              >
                임시저장
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '작성 중...' : '게시글 작성'}
              </button>
            </div>
=======
            
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
>>>>>>> 81cc99afb4338017e546dcb5ed19ef6be0435e7a
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
