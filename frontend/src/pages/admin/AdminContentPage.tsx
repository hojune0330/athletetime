/**
 * AdminContentPage - 콘텐츠 관리 (자동 생성 큐, 이력)
 */

import { useState, useEffect } from 'react';
import * as adminApi from '../../api/admin';
import {
  QueueListIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function AdminContentPage() {
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [pipelineHistory, setPipelineHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [queue, history] = await Promise.all([
        adminApi.getAutoQueueStatus().catch(() => null),
        adminApi.getPipelineHistory().catch(() => ({ history: [] })),
      ]);
      setQueueStatus(queue);
      setPipelineHistory(history?.history || []);
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">콘텐츠 관리</h1>
          <p className="text-sm text-neutral-500 mt-1">자동 생성 큐와 생성 이력</p>
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

      {/* 자동 생성 큐 상태 */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <QueueListIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">자동 생성 큐</h2>
            <p className="text-xs text-neutral-500">
              {queueStatus?.running ? '실행 중' : '대기 중'}
            </p>
          </div>
        </div>

        {queueStatus ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-neutral-50 rounded-xl">
              <p className="text-xs text-neutral-500">대기</p>
              <p className="text-xl font-bold text-neutral-900">{queueStatus.pending || 0}</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl">
              <p className="text-xs text-neutral-500">처리 중</p>
              <p className="text-xl font-bold text-blue-600">{queueStatus.processing || 0}</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl">
              <p className="text-xs text-neutral-500">완료</p>
              <p className="text-xl font-bold text-emerald-600">{queueStatus.completed || 0}</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl">
              <p className="text-xs text-neutral-500">실패</p>
              <p className="text-xl font-bold text-red-600">{queueStatus.failed || 0}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">큐 상태를 불러올 수 없습니다</p>
        )}
      </div>

      {/* 생성 이력 */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">생성 이력</h2>
        </div>

        {pipelineHistory.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            <ClockIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p>생성 이력이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {pipelineHistory.slice(0, 20).map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-4 px-6 py-3.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  item.status === 'success' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {item.status === 'success' ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-700 truncate">
                    {item.filename || item.title || '이름 없음'}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString('ko-KR') : '--'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  item.status === 'success'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {item.status === 'success' ? '성공' : '실패'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
