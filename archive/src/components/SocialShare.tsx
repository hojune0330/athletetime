// SNS 공유 컴포넌트
interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  className?: string;
}

export const SocialShare = ({ 
  url, 
  title, 
  description = '', 
  imageUrl,
  className = '' 
}: SocialShareProps) => {
  
  // URL 인코딩
  const encodeURL = (str: string) => encodeURIComponent(str);
  
  // 공유 URL 생성
  const shareUrls = {
    kakao: () => {
      // 카카오톡 JavaScript SDK 사용 (실제로는 더 복잡한 설정 필요)
      if (typeof window !== 'undefined' && (window as any).Kakao) {
        (window as any).Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: title,
            description: description,
            imageUrl: imageUrl || 'https://athlete-time.pages.dev/static/logo.png',
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
        });
      } else {
        // Fallback: 카카오톡 웹 공유
        window.open(`https://sharer.kakao.com/talk/friends/?url=${encodeURL(url)}&title=${encodeURL(title)}`);
      }
    },
    
    instagram: () => {
      // 인스타그램은 직접 URL 공유 불가, 클립보드 복사로 대체
      navigator.clipboard.writeText(`${title}\n${url}`);
      alert('링크가 클립보드에 복사되었습니다!\n인스타그램 스토리에 붙여넣어 보세요 📸');
    },
    
    facebook: () => {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURL(url)}&t=${encodeURL(title)}`;
      window.open(fbUrl, '_blank', 'width=600,height=400');
    },
    
    twitter: () => {
      const text = description ? `${title}\n${description}` : title;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURL(text)}&url=${encodeURL(url)}`;
      window.open(twitterUrl, '_blank', 'width=600,height=400');
    },
    
    line: () => {
      const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURL(url)}&text=${encodeURL(title)}`;
      window.open(lineUrl, '_blank', 'width=600,height=400');
    },
    
    copy: () => {
      navigator.clipboard.writeText(url);
      alert('링크가 클립보드에 복사되었습니다! 📋');
    }
  };

  const shareButtons = [
    {
      id: 'kakao',
      name: '카톡',
      icon: 'fas fa-comment',
      color: 'bg-yellow-400 text-black',
      action: shareUrls.kakao
    },
    {
      id: 'instagram',
      name: '인스타',
      icon: 'fab fa-instagram',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      action: shareUrls.instagram
    },
    {
      id: 'facebook',
      name: '페북',
      icon: 'fab fa-facebook-f',
      color: 'bg-blue-600 text-white',
      action: shareUrls.facebook
    },
    {
      id: 'twitter',
      name: '트위터',
      icon: 'fab fa-twitter',
      color: 'bg-sky-500 text-white',
      action: shareUrls.twitter
    },
    {
      id: 'line',
      name: '라인',
      icon: 'fab fa-line',
      color: 'bg-green-500 text-white',
      action: shareUrls.line
    },
    {
      id: 'copy',
      name: '링크복사',
      icon: 'fas fa-link',
      color: 'bg-gray-500 text-white',
      action: shareUrls.copy
    }
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {shareButtons.map((button) => (
        <button
          key={button.id}
          onClick={button.action}
          className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-transform active:scale-95 ${button.color}`}
        >
          <i className={button.icon}></i>
          <span>{button.name}</span>
        </button>
      ))}
    </div>
  );
};

// 빠른 공유 버튼 (단일 버튼)
interface QuickShareProps {
  url: string;
  title: string;
  type?: 'kakao' | 'instagram' | 'copy';
  size?: 'sm' | 'md' | 'lg';
}

export const QuickShare = ({ 
  url, 
  title, 
  type = 'kakao',
  size = 'md' 
}: QuickShareProps) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm', 
    lg: 'w-12 h-12 text-base'
  };

  const handleShare = () => {
    const shareUrls = {
      kakao: () => {
        if (typeof window !== 'undefined' && (window as any).Kakao) {
          (window as any).Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: title,
              imageUrl: 'https://athlete-time.pages.dev/static/logo.png',
              link: { mobileWebUrl: url, webUrl: url },
            },
          });
        } else {
          window.open(`https://sharer.kakao.com/talk/friends/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`);
        }
      },
      instagram: () => {
        navigator.clipboard.writeText(`${title}\n${url}`);
        alert('링크가 복사되었습니다! 인스타그램에 공유하세요 📸');
      },
      copy: () => {
        navigator.clipboard.writeText(url);
        alert('링크가 복사되었습니다! 📋');
      }
    };

    shareUrls[type]();
  };

  const icons = {
    kakao: 'fas fa-comment',
    instagram: 'fab fa-instagram',
    copy: 'fas fa-share-alt'
  };

  const colors = {
    kakao: 'bg-yellow-400 text-black',
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    copy: 'bg-gray-500 text-white'
  };

  return (
    <button
      onClick={handleShare}
      className={`${sizes[size]} ${colors[type]} rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105`}
    >
      <i className={icons[type]}></i>
    </button>
  );
};