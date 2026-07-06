/**
 * AdminDashboardPage - 관리자 대시보드 메인
 * 
 * 시스템 상태, 서비스 현황, 최근 활동
 */

import { useState, useEffect } from 'react';
import * as adminApi from '../../api/admin';
import {
  ServerIcon,
  CpuChipIcon,
  PhotoIcon,
  SignalIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface HealthData {
  status: string;
  version: string;
  mode: string;
  services: Record<string, string>;
  timestamp: string;
}

interface StatusData {
  server?: { uptime?: number; memory?: { rss?: number; heapUsed?: number } };
  gallery?: { count?: number };
  watcher?: { running?: boolean };
  pipeline?: { running?: boolean };
}

export default function AdminDashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [h, s] = await Promise.all([
        adminApi.getHealth(),
        adminApi.getStatus().catch(() => null),
      ]);
      setHealth(h);
      setStatus(s);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}시간 ${m}분`;
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">관리자 대시보드</h1>
          <p className="text-sm text-neutral-500 mt-1">
            AthleteTime v{health?.version || '4.0.0'} &mdash; {health?.mode === 'standalone' ? 'Standalone' : 'Production'}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-all disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 서비스 상태 카드들 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 서버 상태 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <ServerIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              health?.status === 'healthy' 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {health?.status === 'healthy' ? (
                <><CheckCircleIcon className="w-3.5 h-3.5" /> 정상</>
              ) : (
                <><ExclamationCircleIcon className="w-3.5 h-3.5" /> 이상</>
              )}
            </span>
          </div>
          <h3 className="text-sm font-medium text-neutral-500">서버</h3>
          <p className="text-2xl font-bold text-neutral-900 mt-1">
            {status?.server?.uptime ? formatUptime(status.server.uptime) : '가동 중'}
          </p>
        </div>

        {/* 메모리 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-neutral-500">메모리</h3>
          <p className="text-2xl font-bold text-neutral-900 mt-1">
            {status?.server?.memory?.rss ? formatBytes(status.server.memory.rss) : '--'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            힙: {status?.server?.memory?.heapUsed ? formatBytes(status.server.memory.heapUsed) : '--'}
          </p>
        </div>

        {/* 갤러리 이미지 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <PhotoIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-neutral-500">생성 이미지</h3>
          <p className="text-2xl font-bold text-neutral-900 mt-1">
            {status?.gallery?.count ?? 0}
          </p>
          <p className="text-xs text-neutral-400 mt-1">카드뉴스 이미지</p>
        </div>

        {/* 서비스 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center">
              <SignalIcon className="w-5 h-5 text-accent-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-neutral-500">모드</h3>
          <p className="text-2xl font-bold text-neutral-900 mt-1">
            {health?.mode === 'standalone' ? 'Dev' : 'Prod'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            DB: {health?.services?.database || '--'}
          </p>
        </div>
      </div>

      {/* 서비스 상태 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">서비스 현황</h2>
        </div>
        <div className="divide-y divide-neutral-50">
          {health?.services && Object.entries(health.services).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  value === 'active' || value === 'connected' || value === 'configured'
                    ? 'bg-emerald-500'
                    : value === 'mock' || value === 'mock-memory' || value === 'console-only'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium text-neutral-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
              <span className={`text-sm px-2.5 py-1 rounded-lg font-medium ${
                value === 'active' || value === 'connected' || value === 'configured'
                  ? 'bg-emerald-50 text-emerald-700'
                  : value === 'mock' || value === 'mock-memory' || value === 'console-only'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 활동 + 빠른 액션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 빠른 액션 */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">빠른 실행</h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/admin/gallery"
              className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-center"
            >
              <PhotoIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-purple-700">갤러리</span>
            </a>
            <a
              href="/admin/card-studio"
              className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
            >
              <span className="text-3xl block mb-1">🎨</span>
              <span className="text-sm font-medium text-blue-700">카드 스튜디오</span>
            </a>
            <a
              href="/admin/pipeline"
              className="p-4 bg-accent-50 hover:bg-accent-100 rounded-xl transition-colors text-center"
            >
              <CpuChipIcon className="w-8 h-8 text-accent-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-accent-700">파이프라인</span>
            </a>
            <a
              href="/admin/operator-guide"
              className="p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors text-center"
            >
              <DocumentTextIcon className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-amber-700">운영 기준</span>
            </a>
            <a
              href="/admin/content"
              className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors text-center"
            >
              <DocumentTextIcon className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-emerald-700">콘텐츠</span>
            </a>
          </div>
        </div>

        {/* 타임스탬프 */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">시스템 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">버전</span>
              <span className="font-medium text-neutral-900">v{health?.version || '4.0.0'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">모드</span>
              <span className="font-medium text-neutral-900">{health?.mode || '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">마지막 확인</span>
              <span className="font-medium text-neutral-900">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString('ko-KR') : '--'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">데이터베이스</span>
              <span className="font-medium text-neutral-900">{health?.services?.database || '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">이메일</span>
              <span className="font-medium text-neutral-900">{health?.services?.email || '--'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
