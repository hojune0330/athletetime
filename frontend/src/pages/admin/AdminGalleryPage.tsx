/**
 * AdminGalleryPage - 카드뉴스 갤러리 관리
 */

import { useState, useEffect } from 'react';
import * as adminApi from '../../api/admin';
import {
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface GalleryImage {
  filename: string;
  path: string;
  size: number;
  modified: string;
  url?: string;
}

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadGallery = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getGallery();
      setImages(data.images || data.files || []);
    } catch (e: any) {
      setError(e.message || '갤러리를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleDelete = async (filename: string) => {
    if (!confirm(`"${filename}" 이미지를 삭제하시겠습니까?`)) return;
    setDeleting(filename);
    try {
      await adminApi.deleteGalleryImage(filename);
      setImages(prev => prev.filter(img => img.filename !== filename));
      if (selectedImage?.filename === filename) setSelectedImage(null);
    } catch (e: any) {
      alert('삭제 실패: ' + (e.message || '알 수 없는 오류'));
    } finally {
      setDeleting(null);
    }
  };

  const filteredImages = images.filter(img =>
    img.filename.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">갤러리</h1>
          <p className="text-sm text-neutral-500 mt-1">
            생성된 카드뉴스 이미지 {images.length}개
          </p>
        </div>
        <button
          onClick={loadGallery}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-all disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 검색 */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder="파일명으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 이미지 그리드 */}
      {loading && images.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-16">
          <PhotoIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 text-lg font-medium">
            {search ? '검색 결과가 없습니다' : '생성된 이미지가 없습니다'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img) => (
            <div
              key={img.filename}
              className="group bg-white rounded-xl border border-neutral-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedImage(img)}
            >
              <div className="aspect-square bg-neutral-100 relative overflow-hidden">
                <img
                  src={`/output/${img.filename}`}
                  alt={img.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2394a3b8" font-size="12">No Image</text></svg>';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg">
                    보기
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-neutral-700 truncate" title={img.filename}>
                  {img.filename}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-neutral-400">
                    {img.size ? formatSize(img.size) : '--'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(img.filename);
                    }}
                    disabled={deleting === img.filename}
                    className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 이미지 오버레이 */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <h3 className="text-sm font-medium text-neutral-900 truncate pr-4">{selectedImage.filename}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={`/output/${selectedImage.filename}`}
                  download
                  className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </a>
                <button
                  onClick={() => handleDelete(selectedImage.filename)}
                  className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[calc(90vh-60px)] overflow-auto">
              <img
                src={`/output/${selectedImage.filename}`}
                alt={selectedImage.filename}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
