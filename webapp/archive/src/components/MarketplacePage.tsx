// 🛍️ 중고 거래 페이지 - 육상 용품 거래
import { useState } from 'react'

interface Product {
  id: number
  category: string
  title: string
  price: string
  image: string
  seller: string
  location: string
  time: string
  likes: number
  condition: string
  isHot?: boolean
  isSold?: boolean
}

interface MarketplacePageProps {
  isDarkMode: boolean
  onBack: () => void
}

export const MarketplacePage = ({ isDarkMode, onBack }: MarketplacePageProps) => {
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [showNewItem, setShowNewItem] = useState(false)
  const [products] = useState<Product[]>([
    {
      id: 1,
      category: '스파이크',
      title: '나이키 줌 슈퍼플라이 엘리트2 (260mm)',
      price: '180,000원',
      image: '👟',
      seller: '스프린터A',
      location: '서울 강남구',
      time: '10분 전',
      likes: 23,
      condition: '상태 A급',
      isHot: true
    },
    {
      id: 2,
      category: '유니폼',
      title: '아식스 대표팀 유니폼 상하의 세트 (M)',
      price: '85,000원',
      image: '👕',
      seller: '육상매니아',
      location: '경기 수원시',
      time: '30분 전',
      likes: 15,
      condition: '미개봉 새상품'
    },
    {
      id: 3,
      category: '액세서리',
      title: '가민 포러너 245 뮤직 (박스풀셋)',
      price: '220,000원',
      image: '⌚',
      seller: '러너123',
      location: '부산 해운대구',
      time: '1시간 전',
      likes: 45,
      condition: '사용감 있음',
      isHot: true
    },
    {
      id: 4,
      category: '스파이크',
      title: '아디다스 아디제로 프라임 SP2 (270mm)',
      price: '150,000원',
      image: '👟',
      seller: '점프왕',
      location: '대구 수성구',
      time: '2시간 전',
      likes: 8,
      condition: '상태 B급'
    },
    {
      id: 5,
      category: '운동용품',
      title: '육상 허들 10개 세트 (높이조절 가능)',
      price: '300,000원',
      image: '🏃',
      seller: '코치K',
      location: '인천 남동구',
      time: '3시간 전',
      likes: 12,
      condition: '상태 양호'
    },
    {
      id: 6,
      category: '스파이크',
      title: '뉴발란스 FuelCell SD-X (265mm) 판매완료',
      price: '120,000원',
      image: '👟',
      seller: '달리기왕',
      location: '서울 송파구',
      time: '5시간 전',
      likes: 34,
      condition: '상태 A급',
      isSold: true
    }
  ])

  const categories = ['전체', '스파이크', '유니폼', '액세서리', '운동용품', '기타']

  const filteredProducts = selectedCategory === '전체' 
    ? products 
    : products.filter(product => product.category === selectedCategory)

  return (
    <div className={`min-h-screen transition-all ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* 헤더 */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl ${
        isDarkMode 
          ? 'bg-gray-900/70 border-b border-gray-800' 
          : 'bg-white/70 border-b border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg transition-all hover:scale-110 ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                중고 거래
              </h1>
            </div>
            
            <button
              onClick={() => setShowNewItem(true)}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:scale-105 transition-all"
            >
              <i className="fas fa-plus mr-2"></i>
              판매하기
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 카테고리 필터 */}
        <div className="flex overflow-x-auto space-x-2 mb-6 pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white scale-105'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* 상품 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className={`rounded-2xl overflow-hidden transition-all hover:scale-105 cursor-pointer ${
                isDarkMode 
                  ? 'bg-gray-900/80 border border-gray-800' 
                  : 'bg-white/80 border border-gray-200'
              } ${product.isHot ? 'ring-2 ring-orange-500 ring-opacity-50' : ''}`}
            >
              {/* 이미지 영역 */}
              <div className={`h-48 flex items-center justify-center text-6xl ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              } ${product.isSold ? 'opacity-50' : ''}`}>
                {product.image}
                {product.isSold && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-black/70 text-white px-4 py-2 rounded-lg font-bold text-lg">
                      판매완료
                    </span>
                  </div>
                )}
              </div>

              {/* 정보 영역 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    isDarkMode 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {product.category}
                  </span>
                  {product.isHot && !product.isSold && (
                    <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                      🔥 인기
                    </span>
                  )}
                </div>

                <h3 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'} ${
                  product.isSold ? 'line-through opacity-50' : ''
                }`}>
                  {product.title}
                </h3>

                <div className={`text-2xl font-bold mb-2 ${
                  product.isSold 
                    ? 'text-gray-500' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent'
                }`}>
                  {product.price}
                </div>

                <div className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{product.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-tag"></i>
                    <span>{product.condition}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <i className="fas fa-user text-xs"></i>
                    </div>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {product.seller}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {product.time}
                    </span>
                    <button className={`flex items-center space-x-1 ${
                      isDarkMode ? 'text-red-400' : 'text-red-500'
                    }`}>
                      <i className="fas fa-heart"></i>
                      <span>{product.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 판매 팁 배너 */}
        <div className={`mt-12 p-6 rounded-2xl ${
          isDarkMode 
            ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-700' 
            : 'bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200'
        }`}>
          <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            💡 안전한 거래 TIP
          </h3>
          <ul className={`space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <li>• 직거래 시 공공장소에서 만나세요</li>
            <li>• 제품 상태를 꼼꼼히 확인하세요</li>
            <li>• 정품 인증서나 구매 영수증을 확인하세요</li>
            <li>• 택배 거래 시 안전결제를 이용하세요</li>
          </ul>
        </div>
      </div>

      {/* 판매하기 모달 */}
      {showNewItem && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowNewItem(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-2xl rounded-3xl p-6 ${
              isDarkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                상품 등록하기
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <select className={`p-3 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } border`}>
                  <option>카테고리 선택</option>
                  {categories.filter(c => c !== '전체').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select className={`p-3 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } border`}>
                  <option>상품 상태</option>
                  <option>새상품 (미개봉)</option>
                  <option>상태 A급</option>
                  <option>상태 B급</option>
                  <option>사용감 있음</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="상품명을 입력하세요"
                className={`w-full p-3 rounded-lg mb-4 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } border`}
              />

              <input
                type="text"
                placeholder="가격을 입력하세요 (예: 150,000원)"
                className={`w-full p-3 rounded-lg mb-4 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } border`}
              />

              <textarea
                placeholder="상품 설명을 입력하세요"
                rows={4}
                className={`w-full p-3 rounded-lg mb-4 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } border`}
              />

              <div className={`p-8 rounded-lg border-2 border-dashed mb-4 text-center ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-gray-50 border-gray-300'
              }`}>
                <i className={`fas fa-camera text-4xl mb-2 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}></i>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  사진 추가하기 (최대 10장)
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewItem(false)}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:scale-105 transition-all"
                >
                  등록하기
                </button>
                <button
                  onClick={() => setShowNewItem(false)}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    isDarkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}