/**
 * 관리자 API 클라이언트
 * 
 * Card Studio + 시스템 관리 API
 */

import { apiClient } from './client';

// 하위 경로 — 개발 모드에서는 /api/card-studio/*, 프로덕션도 동일
const ADMIN_BASE = '/api/card-studio/admin';

// ============================================
// 시스템 상태
// ============================================

export async function getStatus() {
  const res = await apiClient.get(`${ADMIN_BASE}/status`);
  return res.data;
}

export async function getSystemInfo() {
  const res = await apiClient.get(`${ADMIN_BASE}/system/info`);
  return res.data;
}

export interface OperatorGuideStep {
  step: string;
  label: string;
  body: string;
}

export interface OperatorGuideEscalationState {
  id: string;
  label: string;
  when: string;
  owner: string;
}

export interface OperatorGuideScenario {
  id: string;
  title: string;
  summary: string;
  firstActions: string[];
  escalateWhen: string[];
  safePublicReply: string;
  avoid: string[];
}

export interface OperatorGuide {
  version: string;
  audience: string;
  title: string;
  disclaimer: string;
  dailyChecks: string[];
  responseFlow: OperatorGuideStep[];
  escalationStates: OperatorGuideEscalationState[];
  scenarios: OperatorGuideScenario[];
  publicPhrases: string[];
  forbiddenPhrases: string[];
  evidenceChecklist: string[];
  publicBoundary: {
    publicEnough: string[];
    internalOnly: string[];
  };
}

export async function getOperatorGuide(): Promise<OperatorGuide> {
  const res = await apiClient.get(`${ADMIN_BASE}/operator-guide`);
  return res.data.data;
}

export async function getHealth() {
  const res = await apiClient.get('/health');
  return res.data;
}

// ============================================
// 갤러리
// ============================================

export async function getGallery() {
  const res = await apiClient.get(`${ADMIN_BASE}/gallery`);
  return res.data;
}

export async function deleteGalleryImage(filename: string) {
  const res = await apiClient.delete(`${ADMIN_BASE}/gallery/${filename}`);
  return res.data;
}

// ============================================
// 파이프라인
// ============================================

export async function getPipelineStatus() {
  const res = await apiClient.get(`${ADMIN_BASE}/pipeline/status`);
  return res.data;
}

export async function getPipelineHistory() {
  const res = await apiClient.get(`${ADMIN_BASE}/pipeline/history`);
  return res.data;
}

export async function runPipeline(params: { url?: string; competitionId?: string }) {
  const res = await apiClient.post(`${ADMIN_BASE}/pipeline/run`, params);
  return res.data;
}

// ============================================
// 감시기 (Watcher)
// ============================================

export async function getWatcherStatus() {
  const res = await apiClient.get(`${ADMIN_BASE}/watcher/status`);
  return res.data;
}

export async function getWatcherLogs() {
  const res = await apiClient.get(`${ADMIN_BASE}/watcher/logs`);
  return res.data;
}

export async function startWatcher() {
  const res = await apiClient.post(`${ADMIN_BASE}/watcher/start`);
  return res.data;
}

export async function stopWatcher() {
  const res = await apiClient.post(`${ADMIN_BASE}/watcher/stop`);
  return res.data;
}

export async function scanWatcher() {
  const res = await apiClient.post(`${ADMIN_BASE}/watcher/scan`);
  return res.data;
}

// ============================================
// 콘텐츠 생성
// ============================================

export async function parseSchedulePdf(formData: FormData) {
  const res = await apiClient.post(`${ADMIN_BASE}/schedule/parse-pdf`, formData);
  return res.data;
}

export async function previewSchedule(data: unknown) {
  const res = await apiClient.post(`${ADMIN_BASE}/schedule/preview`, data);
  return res.data;
}

export async function generateSchedule(data: unknown) {
  const res = await apiClient.post(`${ADMIN_BASE}/schedule/generate`, data);
  return res.data;
}

export async function previewNotice(data: unknown) {
  const res = await apiClient.post(`${ADMIN_BASE}/notice/preview`, data);
  return res.data;
}

export async function generateNotice(data: unknown) {
  const res = await apiClient.post(`${ADMIN_BASE}/notice/generate`, data);
  return res.data;
}

export async function getResultEvents() {
  const res = await apiClient.get(`${ADMIN_BASE}/result/events`);
  return res.data;
}

export async function previewResult(data: unknown) {
  const res = await apiClient.post(`${ADMIN_BASE}/result/preview`, data);
  return res.data;
}

export async function generateResult(data: unknown) {
  const res = await apiClient.post(`${ADMIN_BASE}/result/generate`, data);
  return res.data;
}

// ============================================
// 자동 생성 큐
// ============================================

export async function getAutoQueueStatus() {
  const res = await apiClient.get(`${ADMIN_BASE}/admin/auto-queue/status`);
  return res.data;
}
