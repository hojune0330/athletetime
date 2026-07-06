/**
 * 중고거래 등록/수정 페이지
 * /marketplace/new (등록)
 * /marketplace/:id/edit (수정)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  useMarketplaceItem,
  useCreateMarketplaceItem,
  useUpdateMarketplaceItem,
} from '../hooks/useMarketplace';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/common/PageHeader';
import { uploadImages } from '../api/upload';

interface FormData {
  title: string;
  description: string;
  price: string;
  images: string[];
  thumbnail_index: number;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  price: '',
  images: [],
  thumbnail_index: 0,
};

export default function MarketplaceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;

  // 상태
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isUploading, setIsUploading] = useState(false);

  // API 호출
  const { data: itemData, isLoading } = useMarketplaceItem(parseInt(id || '0'));
  const createMutation = useCreateMarketplaceItem();
  const updateMutation = useUpdateMarketplaceItem();

  // 로그인 보호는 라우트 가드(RequireAuth)에서 처리합니다.

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && itemData?.item) {
      const item = itemData.item;
      
      // 본인 확인
      if (item.seller_id !== user?.id) {
        alert('본인의 상품만 수정할 수 있습니다.');
        navigate('/marketplace');
        return;
      }

      setFormData({
        title: item.title,
        description: item.description || '',
        price: item.price.toString(),
        images: item.images || [],
        thumbnail_index: item.thumbnail_index || 0,
      });
    }
  }, [isEditMode, itemData, user, navigate]);

  // 입력 변경 핸들러
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 에러 클리어
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // 이미지 파일 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formData.images.length + files.length > 10) {
      alert('이미지는 최대 10개까지 등록할 수 있습니다.');
      return;
    }

    setIsUploading(true);

    try {
      // 파일 유효성 검사
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name}은(는) 5MB를 초과합니다.`);
        }

        // 파일 타입 체크
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        }
      }

      console.log('📤 이미지 업로드 시작:', fileArray.length, '개 파일');
      
      // 백엔드 API를 통해 업로드
      const response = await uploadImages(fileArray);
      
      console.log('✅ 이미지 업로드 성공:', response);
      
      const uploadedUrls = response.images.map((img) => img.url);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));

      // 이미지 에러 클리어
      if (errors.images) {
        setErrors((prev) => ({ ...prev, images: undefined }));
      }

      // input 초기화
      e.target.value = '';
      
      alert(`${uploadedUrls.length}개 이미지가 업로드되었습니다.`);
    } catch (error: unknown) {
      console.error('❌ 이미지 업로드 오류:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ 에러 상세:', error.response?.data);
      }
      
      // 더 자세한 에러 메시지
      let errorMessage = '이미지 업로드에 실패했습니다.';
      
      if (axios.isAxiosError<{ error?: string }>(error) && error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다. 로그인 후 다시 시도해주세요.';
      } else if (axios.isAxiosError<{ error?: string }>(error) && error.response?.status === 400) {
        errorMessage = error.response?.data?.error || '잘못된 요청입니다.';
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // 이미지 삭제
  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      // 대표 이미지 인덱스 조정
      let newThumbnailIndex = prev.thumbnail_index;
      if (index === prev.thumbnail_index) {
        newThumbnailIndex = 0;
      } else if (index < prev.thumbnail_index) {
        newThumbnailIndex = prev.thumbnail_index - 1;
      }

      return {
        ...prev,
        images: newImages,
        thumbnail_index: newThumbnailIndex,
      };
    });
  };

  // 대표 이미지 설정
  const handleSetThumbnail = (index: number) => {
    setFormData((prev) => ({ ...prev, thumbnail_index: index }));
  };

  // 유효성 검사
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = '상품명을 입력해주세요.';
    } else if (formData.title.length < 2 || formData.title.length > 100) {
      newErrors.title = '상품명은 2~100자 사이여야 합니다.';
    }

    if (!formData.price.trim()) {
      newErrors.price = '가격을 입력해주세요.';
    } else {
      const priceNum = parseInt(formData.price);
      if (isNaN(priceNum)) {
        newErrors.price = '숫자만 입력 가능합니다.';
      } else if (priceNum < 0) {
        newErrors.price = '가격은 0원 이상이어야 합니다.';
      }
    }

    // 이미지 필수 검사
    if (formData.images.length === 0) {
      newErrors.images = '최소 1개 이상의 이미지를 등록해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      price: parseInt(formData.price),
      images: formData.images,
      thumbnail_index: formData.thumbnail_index,
    };

    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({
          id: parseInt(id),
          data: submitData,
        });
        alert('상품이 수정되었습니다.');
        navigate(`/marketplace/${id}`);
      } else {
        const result = await createMutation.mutateAsync(submitData);
        alert('상품이 등록되었습니다.');
        navigate(`/marketplace/${result.item.id}`);
      }
    } catch {
      alert(isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading && isEditMode) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={isEditMode ? '상품 수정' : '상품 등록'}
        icon="📝"
        description={isEditMode ? '상품 정보를 수정하세요' : '판매할 상품을 등록하세요'}
      />

      <div className="card">
        <div className="card-body p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 상품명 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
                상품명 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`input w-full ${errors.title ? 'border-danger-500' : ''}`}
                placeholder="상품명을 입력하세요 (2~100자)"
                maxLength={100}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-danger-600">{errors.title}</p>
              )}
            </div>

            {/* 가격 */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-neutral-700 mb-2">
                가격 <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className={`input w-full pr-12 ${errors.price ? 'border-danger-500' : ''}`}
                  placeholder="0"
                  min="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
                  원
                </span>
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-danger-600">{errors.price}</p>
              )}
              {formData.price && !errors.price && (
                <p className="mt-1 text-sm text-neutral-500">
                  {parseInt(formData.price).toLocaleString('ko-KR')}원
                </p>
              )}
            </div>

            {/* 상품 설명 */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                상품 설명
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input w-full min-h-[150px] resize-none"
                placeholder="상품에 대해 자세히 설명해주세요..."
              />
            </div>

            {/* 이미지 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                상품 이미지 <span className="text-danger-500">*</span>
                <span className="text-neutral-500 font-normal"> (최대 10개, 각 5MB 이하)</span>
              </label>

              {/* 이미지 파일 업로드 */}
              <div className="mb-4">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isUploading || formData.images.length >= 10}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className={`btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer ${
                    isUploading || formData.images.length >= 10
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  } ${
                    errors.images ? 'border-2 border-danger-500' : ''
                  }`}
                >
                  <PhotoIcon className="w-5 h-5" />
                  {isUploading
                    ? '업로드 중...'
                    : formData.images.length >= 10
                    ? '최대 10개까지 업로드 가능'
                    : '이미지 선택'}
                </label>
                {errors.images && (
                  <p className="mt-1 text-sm text-danger-600">{errors.images}</p>
                )}
                <p className="mt-2 text-xs text-neutral-500">
                  * JPG, PNG, GIF 형식 지원 / 각 파일 최대 5MB
                </p>
              </div>

              {/* 이미지 목록 */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div
                      key={index}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                        index === formData.thumbnail_index
                          ? 'border-primary-500'
                          : 'border-neutral-200'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`상품 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.opacity = '0';
                        }}
                      />

                      {/* 대표 이미지 배지 */}
                      {index === formData.thumbnail_index && (
                        <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs font-medium px-2 py-1 rounded">
                          대표
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {index !== formData.thumbnail_index && (
                          <button
                            type="button"
                            onClick={() => handleSetThumbnail(index)}
                            className="px-2 py-1 bg-white text-neutral-700 text-xs rounded hover:bg-neutral-100"
                          >
                            대표 설정
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="p-1 bg-danger-500 text-white rounded hover:bg-danger-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-2 text-sm text-neutral-500">
                * 첫 번째 이미지가 자동으로 대표 이미지로 설정됩니다.
              </p>
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              <Link to={isEditMode ? `/marketplace/${id}` : '/marketplace'} className="btn-secondary flex-1">
                취소
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isSubmitting
                  ? isEditMode
                    ? '수정 중...'
                    : '등록 중...'
                  : isEditMode
                  ? '수정하기'
                  : '등록하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
