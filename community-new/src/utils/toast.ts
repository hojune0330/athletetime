/**
 * 간단한 Toast 알림 유틸리티
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

/**
 * Toast 메시지 표시
 */
export function showToast(message: string, options: ToastOptions = {}) {
  const { type = 'info', duration = 3000 } = options;
  
  // 기존 toast 제거
  const existingToast = document.getElementById('app-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Toast 엘리먼트 생성
  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.className = getToastClassName(type);
  toast.textContent = message;
  
  // Body에 추가
  document.body.appendChild(toast);
  
  // 애니메이션
  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);
  
  // 자동 제거
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

function getToastClassName(type: ToastType): string {
  const baseClass = 'fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-medium text-white transition-all duration-300 opacity-0 translate-y-2';
  
  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  };
  
  return `${baseClass} ${typeClasses[type]}`;
}

// CSS 추가 (한 번만)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .toast-show {
      opacity: 1 !important;
      transform: translateX(-50%) translateY(0) !important;
    }
  `;
  document.head.appendChild(style);
}
