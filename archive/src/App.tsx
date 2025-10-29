// 통합 앱 파일 - SSR과 CSR 모두 지원
import { FC } from 'react'
import { InteractiveAppV2 } from './components/InteractiveAppV2'

export const App: FC = () => {
  // 클라이언트 사이드에서만 인터랙티브 앱 실행
  if (typeof window !== 'undefined') {
    return <InteractiveAppV2 />
  }
  
  // 서버 사이드에서는 정적 버전 렌더링
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
            애슬리트 타임
          </h1>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    </div>
  )
}