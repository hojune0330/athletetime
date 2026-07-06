/**
 * AdminPipelinePage - 파이프라인 + 감시기 관리
 */

import { useState, useEffect } from 'react';
import * as adminApi from '../../api/admin';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

export default function AdminPipelinePage() {
  const [pipelineStatus, setPipelineStatus] = useState<any>(null);
  const [watcherStatus, setWatcherStatus] = useState<any>(null);
  const [watcherLogs, setWatcherLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [pipelineUrl, setPipelineUrl] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pipeline, watcher, logs] = await Promise.all([
        adminApi.getPipelineStatus().catch(() => null),
        adminApi.getWatcherStatus().catch(() => null),
        adminApi.getWatcherLogs().catch(() => ({ logs: [] })),
      ]);
      setPipelineStatus(pipeline);
      setWatcherStatus(watcher);
      setWatcherLogs(logs?.logs || []);
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'startWatcher':
          await adminApi.startWatcher();
          break;
        case 'stopWatcher':
          await adminApi.stopWatcher();
          break;
        case 'scanWatcher':
          await adminApi.scanWatcher();
          break;
        case 'runPipeline':
          if (!pipelineUrl) {
            alert('URL을 입력해주세요');
            setActionLoading('');
            return;
          }
          await adminApi.runPipeline({ url: pipelineUrl });
          break;
      }
      await loadData();
    } catch (e: any) {
      alert('실행 실패: ' + (e.message || '알 수 없는 오류'));
    } finally {
      setActionLoading('');
    }
  };

  if (loading && !pipelineStatus) {
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
          <h1 className="text-2xl font-bold text-neutral-900">파이프라인 & 감시기</h1>
          <p className="text-sm text-neutral-500 mt-1">카드뉴스 자동 생성 시스템</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 파이프라인 */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center">
              <CogIcon className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">파이프라인</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  pipelineStatus?.running ? 'bg-blue-500 animate-pulse' : 'bg-neutral-300'
                }`} />
                <p className="text-xs text-neutral-500">
                  {pipelineStatus?.running ? '실행 중' : '대기 중'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">URL 실행</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={pipelineUrl}
                  onChange={(e) => setPipelineUrl(e.target.value)}
                  placeholder="경기결과 페이지 URL을 입력하세요"
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => handleAction('runPipeline')}
                  disabled={!!actionLoading}
                  className="px-4 py-2 bg-accent-500 text-white text-sm font-medium rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <PlayIcon className="w-4 h-4" />
                  실행
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 감시기 */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <EyeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">감시기 (Watcher)</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  watcherStatus?.running ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'
                }`} />
                <p className="text-xs text-neutral-500">
                  {watcherStatus?.running ? '감시 중' : '정지'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {watcherStatus?.running ? (
              <button
                onClick={() => handleAction('stopWatcher')}
                disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                <StopIcon className="w-4 h-4" />
                정지
              </button>
            ) : (
              <button
                onClick={() => handleAction('startWatcher')}
                disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                <PlayIcon className="w-4 h-4" />
                시작
              </button>
            )}
            <button
              onClick={() => handleAction('scanWatcher')}
              disabled={!!actionLoading}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              스캔
            </button>
          </div>
        </div>
      </div>

      {/* 감시기 로그 */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">감시기 로그</h2>
        </div>
        <div className="p-4 max-h-80 overflow-y-auto">
          {watcherLogs.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">로그가 없습니다</p>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {watcherLogs.slice(-50).map((log, i) => (
                <div key={i} className="px-3 py-1.5 bg-neutral-50 rounded text-neutral-600 break-all">
                  {typeof log === 'string' ? log : JSON.stringify(log)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
