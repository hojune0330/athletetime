/**
 * 데이터 정정/삭제/이의제기 요청 API
 *
 * 백엔드: card-studio/routes/publicRoutes.js
 *   POST /api/card-studio/data-requests
 *   GET  /api/card-studio/data-requests/:ticketId
 */

import { apiClient } from './client';

export type DataRequestType = 'correction' | 'deletion' | 'objection';

export type DataRequestStatus =
  | 'received'
  | 'under_review'
  | 'search_hidden'
  | 'corrected'
  | 'restored'
  | 'removed';

export interface DataRequestInput {
  type: DataRequestType;
  athleteName: string;
  affiliation?: string;
  competition?: string;
  event?: string;
  recordKey?: string;
  sourceId?: string;
  reason: string;
  contact?: string;
}

export interface DataRequestReceipt {
  ticketId: string;
  status: DataRequestStatus;
  receivedAt: string;
  message: string;
}

export interface DataRequestStatusInfo {
  type: DataRequestType;
  status: DataRequestStatus;
  version: number;
  receivedAt: string;
  updatedAt: string;
}

const BASE = '/api/card-studio/data-requests';

/** 요청 접수 → 접수증(티켓) 반환 */
export async function submitDataRequest(input: DataRequestInput): Promise<DataRequestReceipt> {
  const { data } = await apiClient.post(BASE, input);
  return data.data as DataRequestReceipt;
}

/** 접수 번호로 처리 상태 조회 */
export async function getDataRequestStatus(ticketId: string): Promise<DataRequestStatusInfo> {
  const { data } = await apiClient.get(`${BASE}/${encodeURIComponent(ticketId)}`);
  return data.data as DataRequestStatusInfo;
}

// ── 관리자 API ──

export interface AdminDataRequest {
  id: string;
  ticketHint: string;
  type: DataRequestType;
  athleteName: string;
  affiliation: string;
  competition: string;
  event: string;
  status: DataRequestStatus;
  version: number;
  receivedAt: string;
  updatedAt: string;
}

export interface AdminDataRequestDetail extends AdminDataRequest {
  reason: string;
  contact: string;
  history: readonly {
    fromStatus?: DataRequestStatus;
    status: DataRequestStatus;
    at: string;
    note: string;
    version?: number;
  }[];
}

export interface Suppression {
  key: string;
  ticketId: string;
  athleteName: string;
  affiliation: string;
  competition: string;
  /** mask=검토 중 마스킹, hide=검색 비노출(de-index), remove=완전 삭제 */
  mode: 'mask' | 'hide' | 'remove';
  since: string;
}

const ADMIN_BASE = '/api/card-studio/admin/data-requests';

/** (관리자) 요청 목록 + 활성 suppression */
export async function adminListDataRequests(status?: DataRequestStatus): Promise<{
  requests: AdminDataRequest[];
  suppressions: Suppression[];
}> {
  const { data } = await apiClient.get(ADMIN_BASE, { params: status ? { status } : {} });
  return { requests: data.data as AdminDataRequest[], suppressions: data.suppressions as Suppression[] };
}

/** (관리자) 요청 상태 변경 */
export async function adminUpdateDataRequest(
  id: string,
  status: DataRequestStatus,
  expectedVersion: number,
  note?: string,
): Promise<{ readonly status: DataRequestStatus; readonly version: number }> {
  const { data } = await apiClient.patch(`${ADMIN_BASE}/${encodeURIComponent(id)}`, {
    status,
    note,
    expectedVersion,
  });
  return data.data;
}

export async function adminGetDataRequestDetail(id: string): Promise<AdminDataRequestDetail> {
  const { data } = await apiClient.get(`${ADMIN_BASE}/${encodeURIComponent(id)}`);
  return data.data as AdminDataRequestDetail;
}

/** 상태 라벨(한글) */
export const STATUS_LABELS: Record<DataRequestStatus, string> = {
  received: '접수됨',
  under_review: '검토 중(마스킹)',
  search_hidden: '검색 비노출',
  corrected: '정정 완료',
  restored: '유지(검토 완료)',
  removed: '삭제 처리됨',
};

/** 상태 설명(관리자/이용자 안내용) */
export const STATUS_DESCRIPTIONS: Record<DataRequestStatus, string> = {
  received: '요청이 접수되었습니다.',
  under_review: '검토 중이며 해당 기록은 임시로 "비공개 요청 처리 중"으로 표시됩니다.',
  search_hidden:
    '원본 출처에는 기록이 그대로 남지만, 이름·소속 검색과 추천 화면에서는 노출되지 않습니다.',
  corrected: '잘못된 기록을 정정했습니다. 결과는 계속 공개됩니다.',
  restored: '검토 결과 기록을 그대로 유지합니다.',
  removed: '예외적으로 모든 노출에서 기록을 제외했습니다.',
};

/** 요청 유형 라벨(한글) */
export const TYPE_LABELS: Record<DataRequestType, string> = {
  correction: '정정 요청',
  deletion: '삭제 요청',
  objection: '이의 제기',
};
