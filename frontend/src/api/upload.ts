/**
 * 이미지 업로드 API
 */

import apiClient from './client';

/**
 * 단일 이미지 업로드
 * @param {File} file - 업로드할 이미지 파일
 * @returns {Promise<{url: string, public_id: string}>} - Cloudinary 이미지 URL
 */
export const uploadImage = async (file: File): Promise<{ url: string; public_id: string }> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post<{ url: string; public_id: string }>(
    '/api/upload/image',
    formData
  );

  return response.data;
};

/**
 * 다중 이미지 업로드
 * @param {File[]} files - 업로드할 이미지 파일들 (최대 10개)
 * @returns {Promise<{images: Array<{url: string, public_id: string}>}>} - Cloudinary 이미지 URLs
 */
export const uploadImages = async (
  files: File[]
): Promise<{ images: Array<{ url: string; public_id: string }> }> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await apiClient.post<{ images: Array<{ url: string; public_id: string }> }>(
    '/api/upload/images',
    formData
  );

  return response.data;
};
