/**
 * 이미지 갤러리 컴포넌트
 * 
 * Cloudinary 이미지 표시
 * - 썸네일 그리드
 * - 클릭 시 라이트박스
 * - 이미지 네비게이션
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PostImage } from '../../types';

interface ImageGalleryProps {
  images: PostImage[];
  className?: string;
}

export default function ImageGallery({ images, className = '' }: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  /**
   * 라이트박스 열기
   */
  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden'; // 스크롤 방지
  };

  /**
   * 라이트박스 닫기
   */
  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = ''; // 스크롤 복원
  };

  /**
   * 이전 이미지
   */
  const previousImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  /**
   * 다음 이미지
   */
  const nextImage = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  /**
   * 키보드 이벤트 (ESC, 화살표)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') previousImage();
    if (e.key === 'ArrowRight') nextImage();
  };

  return (
    <>
      {/* 썸네일 그리드 */}
      <div className={`grid gap-2 ${className}`}>
        {images.length === 1 && (
          <div className="col-span-full">
            <img
              src={images[0].cloudinary_url}
              alt="Post image 1"
              className="w-full h-auto max-h-[500px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openLightbox(0)}
            />
          </div>
        )}

        {images.length === 2 && (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <img
                key={img.id}
                src={img.thumbnail_url || img.cloudinary_url}
                alt={`Post image ${i + 1}`}
                className="w-full h-60 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openLightbox(i)}
              />
            ))}
          </div>
        )}

        {images.length === 3 && (
          <div className="grid grid-cols-2 gap-2">
            <img
              src={images[0].thumbnail_url || images[0].cloudinary_url}
              alt="Post image 1"
              className="col-span-2 w-full h-80 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openLightbox(0)}
            />
            {images.slice(1).map((img, i) => (
              <img
                key={img.id}
                src={img.thumbnail_url || img.cloudinary_url}
                alt={`Post image ${i + 2}`}
                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openLightbox(i + 1)}
              />
            ))}
          </div>
        )}

        {images.length === 4 && (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <img
                key={img.id}
                src={img.thumbnail_url || img.cloudinary_url}
                alt={`Post image ${i + 1}`}
                className="w-full h-60 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openLightbox(i)}
              />
            ))}
          </div>
        )}

        {images.length >= 5 && (
          <div className="grid grid-cols-4 gap-2">
            <img
              src={images[0].thumbnail_url || images[0].cloudinary_url}
              alt="Post image 1"
              className="col-span-2 row-span-2 w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openLightbox(0)}
            />
            {images.slice(1, 5).map((img, i) => (
              <img
                key={img.id}
                src={img.thumbnail_url || img.cloudinary_url}
                alt={`Post image ${i + 2}`}
                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openLightbox(i + 1)}
              />
            ))}
            {images.length > 5 && (
              <div
                className="relative w-full h-40 bg-black/50 rounded-lg cursor-pointer flex items-center justify-center"
                onClick={() => openLightbox(5)}
              >
                <span className="text-white text-2xl font-bold">
                  +{images.length - 5}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* 이전 버튼 */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                previousImage();
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}

          {/* 이미지 */}
          <img
            src={images[currentIndex].cloudinary_url}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 다음 버튼 */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}

          {/* 이미지 인디케이터 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>

          {/* 카운터 */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
