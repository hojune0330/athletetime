// 📱 소셜 공유 컴포넌트 v2.0 - 모던 디자인
import { useState } from 'react'

interface QuickShareProps {
  url: string
  title: string
  isDarkMode?: boolean
}

export const QuickShare = ({ url, title, isDarkMode = false }: QuickShareProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareAnimation, setShareAnimation] = useState(false)

  const handleShare = (platform: string) => {
    setShareAnimation(true)
    setTimeout(() => setShareAnimation(false), 500)
    
    let shareUrl = ''
    
    switch (platform) {
      case 'kakao':
        // 카카오톡 공유 (실제로는 Kakao SDK 필요)
        if (typeof window !== 'undefined' && (window as any).Kakao) {
          (window as any).Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: title,
              description: '한국 육상인들을 위한 통합 플랫폼',
              imageUrl: 'https://athlete-time.pages.dev/og-image.jpg',
              link: {
                mobileWebUrl: url,
                webUrl: url,
              },
            },
            buttons: [
              {
                title: '웹으로 보기',
                link: {
                  mobileWebUrl: url,
                  webUrl: url,
                },
              },
            ],
          })
        } else {
          // 폴백: 카카오톡 웹 공유
          shareUrl = `https://story.kakao.com/share?url=${encodeURIComponent(url)}`
          window.open(shareUrl, '_blank', 'width=500,height=600')
        }
        break
        
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
        window.open(shareUrl, '_blank', 'width=500,height=600')
        break
        
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        window.open(shareUrl, '_blank', 'width=500,height=600')
        break
        
      case 'copy':
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        break
    }
    
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* 공유 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all transform ${
          isOpen ? 'scale-110 rotate-12' : 'hover:scale-105'
        } ${
          isDarkMode 
            ? 'text-purple-400 hover:bg-purple-900/20' 
            : 'text-purple-600 hover:bg-purple-50'
        } ${shareAnimation ? 'animate-bounce' : ''}`}
      >
        <i className="fas fa-share-alt text-lg"></i>
        
        {/* 펄스 애니메이션 */}
        {isOpen && (
          <span className="absolute inset-0 rounded-lg animate-ping bg-purple-500 opacity-25"></span>
        )}
      </button>

      {/* 공유 메뉴 - 팝오버 */}
      {isOpen && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 공유 옵션들 */}
          <div className={`absolute right-0 top-12 z-50 animate-slide-down ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-2xl shadow-2xl border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          } p-2 min-w-48`}>
            {/* 삼각형 포인터 */}
            <div className={`absolute -top-2 right-3 w-4 h-4 transform rotate-45 ${
              isDarkMode ? 'bg-gray-800 border-l border-t border-gray-700' : 'bg-white border-l border-t border-gray-200'
            }`}></div>
            
            {/* 카카오톡 */}
            <button
              onClick={() => handleShare('kakao')}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all hover:scale-105 ${
                isDarkMode 
                  ? 'hover:bg-yellow-500/20 text-yellow-400' 
                  : 'hover:bg-yellow-50 text-yellow-600'
              }`}
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-black" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 3C6.477 3 2 6.477 2 11c0 2.89 1.922 5.43 4.809 6.878l-.895 3.261c-.08.292.063.604.332.726.268.122.588.063.795-.145l3.676-3.676c.413.04.834.06 1.283.06 5.523 0 10-3.477 10-8 0-4.523-4.477-8-10-8z"/>
                </svg>
              </div>
              <span className="font-medium">카카오톡</span>
            </button>
            
            {/* 트위터 */}
            <button
              onClick={() => handleShare('twitter')}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all hover:scale-105 ${
                isDarkMode 
                  ? 'hover:bg-blue-500/20 text-blue-400' 
                  : 'hover:bg-blue-50 text-blue-600'
              }`}
            >
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                <i className="fab fa-twitter text-white"></i>
              </div>
              <span className="font-medium">트위터</span>
            </button>
            
            {/* 페이스북 */}
            <button
              onClick={() => handleShare('facebook')}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all hover:scale-105 ${
                isDarkMode 
                  ? 'hover:bg-blue-600/20 text-blue-500' 
                  : 'hover:bg-blue-100 text-blue-700'
              }`}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <i className="fab fa-facebook-f text-white"></i>
              </div>
              <span className="font-medium">페이스북</span>
            </button>
            
            {/* 구분선 */}
            <div className={`my-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
            
            {/* 링크 복사 */}
            <button
              onClick={() => handleShare('copy')}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all hover:scale-105 ${
                copied 
                  ? isDarkMode 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-green-50 text-green-600'
                  : isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                copied 
                  ? 'bg-green-500' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <i className={`fas ${copied ? 'fa-check' : 'fa-link'} text-white`}></i>
              </div>
              <span className="font-medium">
                {copied ? '복사 완료!' : '링크 복사'}
              </span>
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

// 정적 버전 (SSR용)
export const QuickShareButton = () => {
  return (
    <button
      data-action="share"
      className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition-all hover:scale-105"
    >
      <i className="fas fa-share-alt text-lg"></i>
    </button>
  )
}