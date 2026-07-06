/**
 * ProfileCardPage - 프로필 카드 빌더 (공개 페이지)
 * 
 * 선수 프로필 카드뉴스를 생성할 수 있는 공개 페이지입니다.
 * 마법사 모드와 모듈러 빌더 모드를 제공합니다.
 * 레거시 HTML 빌더를 iframe으로 임베드하여 사용합니다.
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BRAND, TRUST_NOTICE } from '../config/dataPolicy';
import {
  UserIcon,
  SparklesIcon,
  Squares2X2Icon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

type BuilderMode = 'select' | 'wizard' | 'modular';

export default function ProfileCardPage() {
  const [mode, setMode] = useState<BuilderMode>('select');
  const [searchParams] = useSearchParams();
  const selectedName = (searchParams.get('name') || '').trim();

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {mode === 'select' ? (
        <SelectMode selectedName={selectedName} onSelect={setMode} />
      ) : (
        <BuilderView mode={mode} selectedName={selectedName} onBack={() => setMode('select')} />
      )}
    </div>
  );
}

// ─── 모드 선택 화면 ────────────────────────────────

function SelectMode({ selectedName, onSelect }: { selectedName: string; onSelect: (mode: BuilderMode) => void }) {
  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <UserIcon className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-neutral-900 mb-3">
          프로필 카드 빌더
        </h1>
        <p className="text-neutral-600 text-lg">
          {selectedName ? `${selectedName} 기록 카드 만들기` : '내 기록으로 프로필 카드를 만들어보세요'}
        </p>
        {selectedName ? (
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-2 text-sm text-primary-800">
            <span>검색에서 찾은 이름을 이어받았어요.</span>
            <Link to={`/records?q=${encodeURIComponent(selectedName)}`} className="font-bold underline underline-offset-4">
              기록 다시 확인
            </Link>
          </div>
        ) : null}
      </div>

      {/* 모드 선택 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* 마법사 모드 */}
        <button
          onClick={() => onSelect('wizard')}
          className="group bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-neutral-100 text-left"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <SparklesIcon className="w-7 h-7 text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">
            마법사 모드
          </h3>
          <p className="text-neutral-600 mb-4 leading-relaxed">
            단계별 안내에 따라 쉽게 프로필 카드를 만들 수 있습니다. 
            선수 검색, 사진 업로드, 템플릿 선택까지 한 번에!
          </p>
          <div className="flex items-center gap-1 text-sm font-bold text-primary-600 group-hover:gap-2 transition-all">
            시작하기
            <ChevronLeftIcon className="w-4 h-4 rotate-180" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 bg-primary-50 text-primary-600 text-xs font-medium rounded-full">
              초보자 추천
            </span>
            <span className="px-2.5 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
              단계별 안내
            </span>
          </div>
        </button>

        {/* 모듈러 빌더 */}
        <button
          onClick={() => onSelect('modular')}
          className="group bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-neutral-100 text-left"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Squares2X2Icon className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">
            모듈러 빌더
          </h3>
          <p className="text-neutral-600 mb-4 leading-relaxed">
            프리셋과 토글 옵션으로 자유롭게 커스터마이징할 수 있습니다.
            세밀한 조정이 가능한 고급 모드입니다.
          </p>
          <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 group-hover:gap-2 transition-all">
            시작하기
            <ChevronLeftIcon className="w-4 h-4 rotate-180" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">
              고급 사용자
            </span>
            <span className="px-2.5 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
              자유 커스터마이징
            </span>
          </div>
        </button>
      </div>

      {/* 도움말 */}
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-5">
          <h4 className="font-bold text-primary-800 mb-2 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            프로필 카드란?
          </h4>
          <p className="text-sm text-primary-700 leading-relaxed">
            공개된 대회 경기 기록을 기반으로 선수 프로필 카드뉴스 이미지를 자동 생성합니다.
            선수 이름으로 기록을 검색하고, 사진을 업로드하면 SNS에 공유할 수 있는 멋진 카드가 완성됩니다.
          </p>
        </div>

        {/* 데이터 출처 안내 */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mt-3">
          <p className="text-xs text-neutral-500 leading-relaxed">
            📌 경기 기록은 {BRAND.name}이 모은 공개 기록을 바탕으로 보여드려요.
            {TRUST_NOTICE.collectedPublic} 정확한 기록은 각 해당 기관의 공식 채널에서 확인해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 빌더 뷰 (iframe) ────────────────────────────────

function BuilderView({
  mode,
  selectedName,
  onBack,
}: {
  mode: 'wizard' | 'modular';
  selectedName: string;
  onBack: () => void;
}) {
  const src = buildBuilderSrc(mode, selectedName);
  const title = mode === 'wizard' ? '마법사 모드' : '모듈러 빌더';

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* 상단 툴바 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>모드 선택으로</span>
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-neutral-900">{title}</span>
          {mode === 'wizard' && (
            <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-xs font-medium rounded-full">
              Wizard
            </span>
          )}
          {mode === 'modular' && (
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">
              Modular
            </span>
          )}
        </div>
        
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          title="새 탭에서 열기"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          <span className="hidden sm:inline">새 탭</span>
        </a>
      </div>

      {/* iframe 영역 */}
      <div className="flex-1 bg-neutral-100">
        <iframe
          src={src}
          title={`프로필 카드 - ${title}`}
          className="w-full h-full border-0"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}

function buildBuilderSrc(mode: 'wizard' | 'modular', selectedName: string): string {
  const path = mode === 'wizard' ? '/profile-card-wizard.html' : '/profile-card-modular.html';
  if (!selectedName) return path;
  const params = new URLSearchParams({ name: selectedName });
  return `${path}?${params.toString()}`;
}
