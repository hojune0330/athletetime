/**
 * 이미지 업로더 컴포넌트
 * 
 * Cloudinary 업로드를 위한 multipart/form-data 이미지 선택기
 * - 최대 5개 이미지
 * - 미리보기 기능
 * - 드래그 앤 드롭 지원
 * - 이미지 순서 변경
 */

import { useState, useRef, type DragEvent } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  maxSizeKB?: number;
}

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  maxSizeKB = 5120, // 5MB
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 파일 유효성 검사
   */
  const validateFile = (file: File): string | null => {
    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      return '이미지 파일만 업로드할 수 있습니다.';
    }

    // 크기 확인
    if (file.size > maxSizeKB * 1024) {
      return `파일 크기는 ${maxSizeKB / 1024}MB를 초과할 수 없습니다.`;
    }

    return null;
  };

  /**
   * 파일 추가 처리
   */
  const handleFilesAdded = (newFiles: FileList | File[]) => {
    const filesArray = Array.from(newFiles);
    const remainingSlots = maxImages - images.length;

    if (remainingSlots <= 0) {
      alert(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`);
      return;
    }

    // 유효성 검사
    const validFiles: File[] = [];
    for (const file of filesArray.slice(0, remainingSlots)) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // 이미지 추가
    const updatedImages = [...images, ...validFiles];
    onImagesChange(updatedImages);

    // 미리보기 생성
    const newPreviews: string[] = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * 파일 선택 핸들러
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
  };

  /**
   * 드래그 앤 드롭 핸들러
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  /**
   * 이미지 제거
   */
  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    onImagesChange(updatedImages);
    setPreviews(updatedPreviews);
  };

  /**
   * 파일 선택 버튼 클릭
   */
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
            <Upload className="w-8 h-8 text-gray-600 dark:text-gray-300" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              이미지를 드래그하거나 클릭하여 선택
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              최대 {maxImages}개, 각 {maxSizeKB / 1024}MB 이하
            </p>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            {images.length} / {maxImages} 업로드됨
          </p>
        </div>
      </div>

      {/* 미리보기 */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              />

              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 파일 정보 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="truncate">{images[index].name}</p>
                <p className="text-gray-300">
                  {(images[index].size / 1024).toFixed(1)}KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 안내 메시지 */}
      {images.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <ImageIcon className="w-4 h-4" />
          <span>이미지는 Cloudinary CDN에 업로드되어 빠르게 제공됩니다.</span>
        </div>
      )}
    </div>
  );
}
