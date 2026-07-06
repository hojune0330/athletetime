/**
 * AdminCardStudioPage - 카드뉴스 스튜디오
 * 
 * 프로필 카드, 일정, 공지, 결과 카드뉴스 생성
 */

import { useState } from 'react';
import {
  UserIcon,
  CalendarIcon,
  MegaphoneIcon,
  TrophyIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '../../api/client';

type StudioTab = 'profile' | 'schedule' | 'notice' | 'result';
type AdminActionResponse = {
  readonly success?: boolean;
  readonly error?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

const tabs: { id: StudioTab; label: string; icon: typeof UserIcon; description: string; color: string }[] = [
  { id: 'profile', label: '프로필 카드', icon: UserIcon, description: '선수 프로필 카드뉴스', color: 'indigo' },
  { id: 'schedule', label: '일정 카드', icon: CalendarIcon, description: '대회 일정 카드뉴스', color: 'blue' },
  { id: 'notice', label: '공지 카드', icon: MegaphoneIcon, description: '공지사항 카드뉴스', color: 'amber' },
  { id: 'result', label: '결과 카드', icon: TrophyIcon, description: '경기 결과 카드뉴스', color: 'emerald' },
];

export default function AdminCardStudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('profile');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">카드 스튜디오</h1>
          <p className="text-sm text-neutral-500 mt-1">
            육상 카드뉴스를 생성하고 관리합니다
          </p>
        </div>
      </div>

      {/* 탭 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeTab === tab.id
                ? 'border-primary-500 bg-primary-50 shadow-sm'
                : 'border-neutral-100 bg-white hover:border-neutral-200 hover:shadow-sm'
            }`}
          >
            <tab.icon className={`w-6 h-6 mb-2 ${
              activeTab === tab.id ? 'text-primary-600' : 'text-neutral-400'
            }`} />
            <h3 className={`text-sm font-bold ${
              activeTab === tab.id ? 'text-primary-700' : 'text-neutral-700'
            }`}>
              {tab.label}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">{tab.description}</p>
          </button>
        ))}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
        {activeTab === 'profile' && <ProfileCardSection />}
        {activeTab === 'schedule' && <ScheduleCardSection />}
        {activeTab === 'notice' && <NoticeCardSection />}
        {activeTab === 'result' && <ResultCardSection />}
      </div>
    </div>
  );
}

// ─── 프로필 카드 ────────────────────────────────

function ProfileCardSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900">프로필 카드 생성</h2>
        <div className="flex gap-2">
          <a
            href="/profile-card-wizard.html"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            마법사 모드
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </a>
          <a
            href="/profile-card-modular.html"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            모듈러 빌더
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="bg-neutral-50 rounded-xl p-8 text-center">
        <UserIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-600 mb-2">프로필 카드 빌더를 사용하세요</p>
        <p className="text-sm text-neutral-400">
          위의 "마법사 모드" 또는 "모듈러 빌더" 버튼을 클릭하면<br />
          전용 빌더 화면이 열립니다
        </p>
      </div>
    </div>
  );
}

// ─── 일정 카드 ────────────────────────────────

function ScheduleCardSection() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!pdfFile) return;
    setUploading(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      
      const response = await apiClient.post<AdminActionResponse>(
        '/api/card-studio/admin/schedule/parse-and-generate',
        formData
      );

      const data = response.data;
      if (data.success) {
        setResult('카드뉴스가 생성되었습니다!');
      } else {
        setResult('오류: ' + (data.error || '생성 실패'));
      }
    } catch (error: unknown) {
      setResult('오류: ' + getErrorMessage(error, '요청 실패'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-neutral-900">일정 카드뉴스 생성</h2>
      
      <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-primary-300 transition-colors">
        <CalendarIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-600 mb-4">대회 일정 PDF를 업로드하세요</p>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          className="mx-auto text-sm"
        />
      </div>

      {pdfFile && (
        <div className="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3">
          <span className="text-sm text-neutral-700">{pdfFile.name}</span>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {uploading ? '생성 중...' : '카드뉴스 생성'}
          </button>
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-xl text-sm ${
          result.startsWith('오류') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}

// ─── 공지 카드 ────────────────────────────────

function NoticeCardSection() {
  const [form, setForm] = useState({ title: '', content: '', date: '' });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.title || !form.content) {
      setResult('오류: 제목과 내용을 입력해주세요');
      return;
    }
    
    setGenerating(true);
    setResult(null);
    
    try {
      const response = await apiClient.post<AdminActionResponse>(
        '/api/card-studio/admin/notice/generate',
        form
      );

      const data = response.data;
      setResult(data.success ? '공지 카드뉴스가 생성되었습니다!' : '오류: ' + (data.error || '생성 실패'));
    } catch (error: unknown) {
      setResult('오류: ' + getErrorMessage(error, '요청 실패'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-neutral-900">공지 카드뉴스 생성</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">제목</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="공지사항 제목"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">내용</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
            className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={4}
            placeholder="공지사항 내용을 입력하세요"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">날짜 (선택)</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {generating ? '생성 중...' : '카드뉴스 생성'}
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded-xl text-sm ${
          result.startsWith('오류') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}

// ─── 결과 카드 ────────────────────────────────

function ResultCardSection() {
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!url) {
      setResult('오류: 결과 URL을 입력해주세요');
      return;
    }
    
    setGenerating(true);
    setResult(null);
    
    try {
      const response = await apiClient.post<AdminActionResponse>(
        '/api/card-studio/admin/result/generate',
        { url }
      );

      const data = response.data;
      setResult(data.success ? '결과 카드뉴스가 생성되었습니다!' : '오류: ' + (data.error || '생성 실패'));
    } catch (error: unknown) {
      setResult('오류: ' + getErrorMessage(error, '요청 실패'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-neutral-900">경기 결과 카드뉴스 생성</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">경기결과 원본 URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="경기결과 페이지 URL을 입력하세요"
          />
          <p className="text-xs text-neutral-400 mt-1.5">
            경기결과 페이지 URL을 입력하세요
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {generating ? '데이터 수집 및 생성 중...' : '카드뉴스 생성'}
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded-xl text-sm ${
          result.startsWith('오류') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}
