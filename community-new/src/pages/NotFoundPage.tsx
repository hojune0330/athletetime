import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <span className="text-8xl">😵</span>
        </div>
        <h1 className="text-6xl font-bold text-teal-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          요청하신 페이지가 존재하지 않거나 삭제되었을 수 있습니다.
          URL을 다시 확인해주세요.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors"
          >
            홈으로 가기
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-dark-700 text-white rounded-lg font-medium hover:bg-dark-600 transition-colors"
          >
            이전 페이지로
          </button>
        </div>
      </div>
    </div>
  )
}