// 🗨️ 커뮤니티 페이지 - 익명 게시판
import { useState } from 'react'

interface Post {
  id: number
  category: string
  title: string
  content: string
  author: string
  likes: number
  comments: number
  time: string
  isHot?: boolean
}

interface CommunityPageProps {
  isDarkMode: boolean
  onBack: () => void
}

export const CommunityPage = ({ isDarkMode, onBack }: CommunityPageProps) => {
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      category: '고등부',
      title: '서울고 800m 김형식 선배 여자친구 있나요?',
      content: '진짜 궁금해서 그러는데... 대회 때마다 보는데 너무 멋있어요 ㅠㅠ',
      author: '익명의 육상인',
      likes: 127,
      comments: 45,
      time: '5분 전',
      isHot: true
    },
    {
      id: 2,
      category: '대학부',
      title: '한체대 vs 국민대 육상부 어디가 더 좋나요?',
      content: '고3인데 대학 고민중입니다. 선배님들 조언 부탁드려요!',
      author: '미래의 스프린터',
      likes: 89,
      comments: 23,
      time: '23분 전'
    },
    {
      id: 3,
      category: '실업부',
      title: '실업팀 연봉 현실적으로 얼마나 되나요?',
      content: '대학 졸업하고 실업팀 가려는데 현실적인 조언 부탁드립니다.',
      author: '꿈나무',
      likes: 234,
      comments: 67,
      time: '1시간 전',
      isHot: true
    },
    {
      id: 4,
      category: '중등부',
      title: '중학생인데 100m 12초 벽 깨는 법',
      content: '현재 12.3인데 어떻게 하면 11초대 갈 수 있을까요?',
      author: '러너123',
      likes: 45,
      comments: 12,
      time: '2시간 전'
    },
    {
      id: 5,
      category: '마스터즈',
      title: '40대에 다시 시작하는 육상, 늦었을까요?',
      content: '학창시절 육상했었는데 다시 시작하고 싶습니다.',
      author: '돌아온 선수',
      likes: 156,
      comments: 34,
      time: '3시간 전'
    }
  ])
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostCategory, setNewPostCategory] = useState('자유게시판')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')

  const categories = ['전체', '초등부', '중등부', '고등부', '대학부', '실업부', '마스터즈', '자유게시판']

  const filteredPosts = selectedCategory === '전체' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory)

  const handleNewPost = () => {
    if (newPostTitle && newPostContent) {
      const newPost: Post = {
        id: posts.length + 1,
        category: newPostCategory,
        title: newPostTitle,
        content: newPostContent,
        author: '방금 작성한 사람',
        likes: 0,
        comments: 0,
        time: '방금 전'
      }
      setPosts([newPost, ...posts])
      setNewPostTitle('')
      setNewPostContent('')
      setShowNewPost(false)
    }
  }

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
                커뮤니티
              </h1>
            </div>
            
            <button
              onClick={() => setShowNewPost(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-lg hover:scale-105 transition-all"
            >
              <i className="fas fa-pen mr-2"></i>
              글쓰기
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
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white scale-105'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* 게시글 목록 */}
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <div
              key={post.id}
              className={`rounded-2xl p-6 transition-all hover:scale-[1.02] cursor-pointer ${
                isDarkMode 
                  ? 'bg-gray-900/80 border border-gray-800' 
                  : 'bg-white/80 border border-gray-200'
              } ${post.isHot ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isDarkMode 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {post.category}
                  </span>
                  {post.isHot && (
                    <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                      🔥 HOT
                    </span>
                  )}
                </div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {post.time}
                </span>
              </div>

              <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {post.title}
              </h3>
              <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {post.content}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    <i className="fas fa-user-secret text-sm"></i>
                  </div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {post.author}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <button className={`flex items-center space-x-1 transition-all hover:scale-110 ${
                    isDarkMode ? 'text-red-400' : 'text-red-500'
                  }`}>
                    <i className="fas fa-heart"></i>
                    <span className="text-sm font-semibold">{post.likes}</span>
                  </button>
                  <button className={`flex items-center space-x-1 transition-all hover:scale-110 ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-500'
                  }`}>
                    <i className="fas fa-comment"></i>
                    <span className="text-sm font-semibold">{post.comments}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 글쓰기 모달 */}
      {showNewPost && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowNewPost(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-2xl rounded-3xl p-6 ${
              isDarkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                새 글 작성
              </h2>
              
              <select
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
                className={`w-full p-3 rounded-lg mb-4 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } border`}
              >
                {categories.filter(c => c !== '전체').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="제목을 입력하세요"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className={`w-full p-3 rounded-lg mb-4 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } border`}
              />

              <textarea
                placeholder="내용을 입력하세요"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={6}
                className={`w-full p-3 rounded-lg mb-4 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } border`}
              />

              <div className="flex space-x-3">
                <button
                  onClick={handleNewPost}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-lg hover:scale-105 transition-all"
                >
                  작성하기
                </button>
                <button
                  onClick={() => setShowNewPost(false)}
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