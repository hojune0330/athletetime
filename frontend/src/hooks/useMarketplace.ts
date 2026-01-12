/**
 * 중고거래 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/marketplace';
import type {
  MarketplaceListParams,
  CreateMarketplaceItemData,
  UpdateMarketplaceItemData,
} from '../api/marketplace';

// ============================================
// Query Keys
// ============================================

export const marketplaceKeys = {
  all: ['marketplace'] as const,
  lists: () => [...marketplaceKeys.all, 'list'] as const,
  list: (params: MarketplaceListParams) => [...marketplaceKeys.lists(), params] as const,
  details: () => [...marketplaceKeys.all, 'detail'] as const,
  detail: (id: number) => [...marketplaceKeys.details(), id] as const,
  comments: (itemId: number) => [...marketplaceKeys.all, 'comments', itemId] as const,
};

// ============================================
// Queries
// ============================================

/**
 * 상품 목록 조회
 */
export const useMarketplaceItems = (params?: MarketplaceListParams) => {
  return useQuery({
    queryKey: marketplaceKeys.list(params || {}),
    queryFn: () => api.getMarketplaceItems(params),
  });
};

/**
 * 상품 상세 조회
 */
export const useMarketplaceItem = (id: number) => {
  return useQuery({
    queryKey: marketplaceKeys.detail(id),
    queryFn: () => api.getMarketplaceItem(id),
    enabled: !!id && id > 0,
  });
};

/**
 * 댓글 목록 조회
 */
export const useMarketplaceComments = (itemId: number) => {
  return useQuery({
    queryKey: marketplaceKeys.comments(itemId),
    queryFn: () => api.getMarketplaceComments(itemId),
    enabled: !!itemId && itemId > 0,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * 상품 등록
 */
export const useCreateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMarketplaceItemData) => api.createMarketplaceItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.lists() });
    },
  });
};

/**
 * 상품 수정
 */
export const useUpdateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMarketplaceItemData }) =>
      api.updateMarketplaceItem(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.detail(variables.id) });
    },
  });
};

/**
 * 상품 삭제
 */
export const useDeleteMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteMarketplaceItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.lists() });
    },
  });
};

/**
 * 댓글 작성
 */
export const useCreateMarketplaceComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, content }: { itemId: number; content: string }) =>
      api.createMarketplaceComment(itemId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.comments(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.detail(variables.itemId) });
    },
  });
};

/**
 * 댓글 삭제
 */
export const useDeleteMarketplaceComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, commentId }: { itemId: number; commentId: number }) =>
      api.deleteMarketplaceComment(itemId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.comments(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.detail(variables.itemId) });
    },
  });
};
