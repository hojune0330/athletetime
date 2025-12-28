/**
 * 공통 페이지 헤더 컴포넌트
 * 서브페이지들의 타이틀 디자인 통일을 위한 컴포넌트
 */

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface PageHeaderProps {
  /** 페이지 제목 */
  title: string;
  /** 페이지 설명 (선택) */
  description?: string;
  /** 뒤로가기 경로 (없으면 뒤로가기 버튼 숨김) */
  backTo?: string;
  /** 뒤로가기 버튼 텍스트 */
  backText?: string;
  /** 우측 액션 버튼 영역 */
  actions?: ReactNode;
  /** 추가 배지/태그 (제목 옆) */
  badge?: ReactNode;
  /** 아이콘 (제목 왼쪽) */
  icon?: ReactNode;
  /** 그라데이션 배경 사용 여부 */
  gradient?: boolean;
  /** 하위 콘텐츠 (대회 정보 등) */
  children?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  backTo,
  backText = '뒤로가기',
  actions,
  badge,
  icon,
  gradient = false,
  children,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="mb-6">
      {/* 뒤로가기 버튼 */}
      {backTo && (
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="font-medium">{backText}</span>
        </button>
      )}

      {/* 메인 헤더 */}
      <div
        className={`rounded-xl ${
          gradient
            ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white p-6'
            : 'bg-white border border-neutral-200 p-5'
        }`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* 제목 영역 */}
            <div className="flex items-center gap-3 flex-wrap">
              {icon && (
                <span className={`text-2xl ${gradient ? '' : 'text-primary-500'}`}>
                  {icon}
                </span>
              )}
              <h1
                className={`text-2xl font-bold truncate ${
                  gradient ? 'text-white' : 'text-neutral-900'
                }`}
              >
                {title}
              </h1>
              {badge && badge}
            </div>

            {/* 설명 */}
            {description && (
              <p
                className={`mt-2 text-sm ${
                  gradient ? 'text-white/80' : 'text-neutral-500'
                }`}
              >
                {description}
              </p>
            )}

            {/* 추가 콘텐츠 */}
            {children && <div className="mt-3">{children}</div>}
          </div>

          {/* 액션 버튼 영역 */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}
