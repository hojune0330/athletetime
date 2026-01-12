/**
 * 중고거래 API
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface MarketplaceItem {
  id: number;
  title: string;
  description?: string;
  price: number;
  status: '판매중' | '예약중' | '판매완료';
  images: string[];
  thumbnail_index: number;
  view_count: number;
  seller_id: string;
  seller_nickname: string;
  seller_profile_image?: string;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceComment {
  id: number;
  item_id: number;
  user_id: string;
  user_nickname: string;
  user_profile_image?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceListResponse {
  success: boolean;
  items: MarketplaceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MarketplaceItemResponse {
  success: boolean;
  item: MarketplaceItem;
}

export interface MarketplaceCommentsResponse {
  success: boolean;
  comments: MarketplaceComment[];
}

export interface MarketplaceListParams {
  search?: string;
  status?: '판매중' | '예약중' | '판매완료' | '';
  sort?: 'latest' | 'price_low' | 'price_high' | 'views';
  page?: number;
  limit?: number;
}

export interface CreateMarketplaceItemData {
  title: string;
  description?: string;
  price: number;
  images?: string[];
  thumbnail_index?: number;
}

export interface UpdateMarketplaceItemData {
  title?: string;
  description?: string;
  price?: number;
  status?: '판매중' | '예약중' | '판매완료';
  images?: string[];
  thumbnail_index?: number;
}

// ============================================
// API Functions
// ============================================

/**
 * 상품 목록 조회
 */
export const getMarketplaceItems = async (
  params?: MarketplaceListParams
): Promise<MarketplaceListResponse> => {
  const response = await apiClient.get('/api/marketplace', { params });
  return response.data;
};

/**
 * 상품 상세 조회
 */
export const getMarketplaceItem = async (id: number): Promise<MarketplaceItemResponse> => {
  const response = await apiClient.get(`/api/marketplace/${id}`);
  return response.data;
};

/**
 * 상품 등록
 */
export const createMarketplaceItem = async (
  data: CreateMarketplaceItemData
): Promise<MarketplaceItemResponse> => {
  const response = await apiClient.post('/api/marketplace', data);
  return response.data;
};

/**
 * 상품 수정
 */
export const updateMarketplaceItem = async (
  id: number,
  data: UpdateMarketplaceItemData
): Promise<MarketplaceItemResponse> => {
  const response = await apiClient.put(`/api/marketplace/${id}`, data);
  return response.data;
};

/**
 * 상품 삭제
 */
export const deleteMarketplaceItem = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/marketplace/${id}`);
};

/**
 * 댓글 목록 조회
 */
export const getMarketplaceComments = async (
  itemId: number
): Promise<MarketplaceCommentsResponse> => {
  const response = await apiClient.get(`/api/marketplace/${itemId}/comments`);
  return response.data;
};

/**
 * 댓글 작성
 */
export const createMarketplaceComment = async (
  itemId: number,
  content: string
): Promise<{ success: boolean; comment: MarketplaceComment }> => {
  const response = await apiClient.post(`/api/marketplace/${itemId}/comments`, { content });
  return response.data;
};

/**
 * 댓글 삭제
 */
export const deleteMarketplaceComment = async (
  itemId: number,
  commentId: number
): Promise<void> => {
  await apiClient.delete(`/api/marketplace/${itemId}/comments/${commentId}`);
};
