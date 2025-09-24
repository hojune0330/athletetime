// 로그인 모달 컴포넌트
import { oauthProviders, generateOAuthUrl } from '../auth/providers'
import { SessionManager, createSessionToken, createAnonymousSession } from '../auth/session'

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  if (!isOpen) return null;

  const handleSocialLogin = (providerId: string) => {
    const provider = oauthProviders.find(p => p.id === providerId);
    if (!provider) return;

    // 실제 OAuth 플로우 (데모 버전)
    const redirectUri = `${window.location.origin}/auth/callback`;
    const authUrl = generateOAuthUrl(provider, redirectUri);
    
    // 실제로는 팝업이나 리다이렉트로 OAuth 처리
    // 지금은 데모용 로그인 처리
    const demoUser = {
      email: `user@${provider.id}.com`,
      name: `${provider.id} 사용자`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider.id}`,
      provider: provider.id,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    // 세션 생성 및 저장
    const token = createSessionToken(demoUser);
    SessionManager.setSession(token);
    
    // 페이지 새로고침으로 로그인 상태 반영
    window.location.reload();

    console.log(`${provider.name} 로그인 시뮬레이션`);
    alert(`${provider.name} 로그인이 완료되었습니다! (데모)`);
    onClose();
  };

  const handleAnonymousLogin = () => {
    // 익명 로그인
    const token = createAnonymousSession();
    SessionManager.setSession(token);
    alert('익명 로그인이 완료되었습니다!');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">로그인</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <i className="fas fa-times text-gray-500"></i>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            애슬리트 타임에서 소통해보세요!
          </p>
        </div>

        {/* 소셜 로그인 버튼들 */}
        <div className="p-6 space-y-3">
          {oauthProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSocialLogin(provider.id)}
              className={`w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl font-medium transition-colors ${provider.color}`}
            >
              <i className={`${provider.icon} text-lg`}></i>
              <span>{provider.name}</span>
            </button>
          ))}

          {/* 구분선 */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">또는</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* 익명 로그인 */}
          <button
            onClick={handleAnonymousLogin}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <i className="fas fa-user-secret text-lg"></i>
            <span>익명으로 둘러보기</span>
          </button>

          {/* 안내 텍스트 */}
          <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
            로그인 시 <span className="text-blue-500">서비스 약관</span> 및 
            <span className="text-blue-500"> 개인정보처리방침</span>에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};