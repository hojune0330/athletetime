// 🏆 경기 결과 페이지 - 실시간 결과 및 기록
import { useState } from 'react'

interface Result {
  id: number
  competition: string
  event: string
  category: string
  rank: number
  name: string
  team: string
  record: string
  wind?: string
  isNewRecord?: boolean
  isPB?: boolean
}

interface ResultsPageProps {
  isDarkMode: boolean
  onBack: () => void
}

export const ResultsPage = ({ isDarkMode, onBack }: ResultsPageProps) => {
  const [selectedCompetition, setSelectedCompetition] = useState('2025 춘계 중고연맹전')
  const [selectedEvent, setSelectedEvent] = useState('전체')
  const [results] = useState<Result[]>([
    {
      id: 1,
      competition: '2025 춘계 중고연맹전',
      event: '남고 100m',
      category: '결승',
      rank: 1,
      name: '김형식',
      team: '서울고',
      record: '10.23',
      wind: '+1.2',
      isNewRecord: true,
      isPB: true
    },
    {
      id: 2,
      competition: '2025 춘계 중고연맹전',
      event: '남고 100m',
      category: '결승',
      rank: 2,
      name: '이준호',
      team: '부산고',
      record: '10.45',
      wind: '+1.2'
    },
    {
      id: 3,
      competition: '2025 춘계 중고연맹전',
      event: '남고 100m',
      category: '결승',
      rank: 3,
      name: '박성민',
      team: '대구고',
      record: '10.52',
      wind: '+1.2'
    },
    {
      id: 4,
      competition: '2025 춘계 중고연맹전',
      event: '여중 1500m',
      category: '결승',
      rank: 1,
      name: '최서연',
      team: '서울여중',
      record: '4:45.12',
      isPB: true
    },
    {
      id: 5,
      competition: '2025 춘계 중고연맹전',
      event: '여중 1500m',
      category: '결승',
      rank: 2,
      name: '김민지',
      team: '인천여중',
      record: '4:48.34'
    },
    {
      id: 6,
      competition: '2025 춘계 중고연맹전',
      event: '남고 높이뛰기',
      category: '결승',
      rank: 1,
      name: '정우성',
      team: '광주일고',
      record: '2.05m',
      isNewRecord: true
    },
    {
      id: 7,
      competition: '2025 춘계 중고연맹전',
      event: '여고 400m',
      category: '예선 1조',
      rank: 1,
      name: '한소희',
      team: '서울체고',
      record: '56.78',
      isPB: true
    }
  ])

  const competitions = ['2025 춘계 중고연맹전', '전국체전 예선', '추계 대학대회']
  const events = ['전체', '100m', '200m', '400m', '800m', '1500m', '높이뛰기', '멀리뛰기', '창던지기']

  const filteredResults = results.filter(result => {
    const matchCompetition = result.competition === selectedCompetition
    const matchEvent = selectedEvent === '전체' || result.event.includes(selectedEvent)
    return matchCompetition && matchEvent
  })

  // 이벤트별로 그룹화
  const groupedResults = filteredResults.reduce((acc, result) => {
    const key = `${result.event} ${result.category}`
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(result)
    return acc
  }, {} as Record<string, Result[]>)

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
                경기 결과
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                <i className="fas fa-circle text-xs mr-1"></i>
                LIVE
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 대회 선택 */}
        <div className="mb-6">
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className={`w-full md:w-auto px-4 py-2 rounded-lg font-medium ${
              isDarkMode 
                ? 'bg-gray-800 text-white border-gray-700' 
                : 'bg-white text-gray-900 border-gray-300'
            } border`}
          >
            {competitions.map(comp => (
              <option key={comp} value={comp}>{comp}</option>
            ))}
          </select>
        </div>

        {/* 종목 필터 */}
        <div className="flex overflow-x-auto space-x-2 mb-6 pb-2">
          {events.map(event => (
            <button
              key={event}
              onClick={() => setSelectedEvent(event)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedEvent === event
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white scale-105'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {event}
            </button>
          ))}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-2xl text-center ${
            isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'
          }`}>
            <div className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              3
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              대회신기록
            </div>
          </div>
          <div className={`p-4 rounded-2xl text-center ${
            isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'
          }`}>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              12
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              개인최고기록
            </div>
          </div>
          <div className={`p-4 rounded-2xl text-center ${
            isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'
          }`}>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
              24
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              경기 완료
            </div>
          </div>
          <div className={`p-4 rounded-2xl text-center ${
            isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'
          }`}>
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent">
              8
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              진행 중
            </div>
          </div>
        </div>

        {/* 결과 테이블 */}
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([eventName, eventResults]) => (
            <div key={eventName} className={`rounded-2xl overflow-hidden ${
              isDarkMode 
                ? 'bg-gray-900/80 border border-gray-800' 
                : 'bg-white/80 border border-gray-200'
            }`}>
              <div className={`px-6 py-4 ${
                isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'
              }`}>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {eventName}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-200'}>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>순위</th>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>이름</th>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>소속</th>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>기록</th>
                      {eventResults[0]?.wind && (
                        <th className={`px-4 py-3 text-left text-sm font-medium ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>바람</th>
                      )}
                      <th className={`px-4 py-3 text-left text-sm font-medium ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventResults.map((result, index) => (
                      <tr key={result.id} className={
                        index !== eventResults.length - 1 
                          ? isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-100'
                          : ''
                      }>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            result.rank === 1 
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                              : result.rank === 2
                                ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white'
                                : result.rank === 3
                                  ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                                  : isDarkMode 
                                    ? 'bg-gray-800 text-gray-300'
                                    : 'bg-gray-100 text-gray-700'
                          }`}>
                            {result.rank}
                          </div>
                        </td>
                        <td className={`px-4 py-3 font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {result.name}
                        </td>
                        <td className={`px-4 py-3 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {result.team}
                        </td>
                        <td className={`px-4 py-3 font-mono font-bold text-lg ${
                          result.rank === 1
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent'
                            : isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {result.record}
                        </td>
                        {result.wind && (
                          <td className={`px-4 py-3 font-mono ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {result.wind}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex space-x-1">
                            {result.isNewRecord && (
                              <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full animate-pulse">
                                대회신
                              </span>
                            )}
                            {result.isPB && (
                              <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full">
                                PB
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* 메달 순위 */}
        <div className={`mt-8 p-6 rounded-2xl ${
          isDarkMode 
            ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700' 
            : 'bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300'
        }`}>
          <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            🏅 학교별 메달 순위
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                1. 서울고
              </span>
              <div className="flex space-x-2">
                <span className="text-yellow-500">🥇 5</span>
                <span className="text-gray-400">🥈 3</span>
                <span className="text-orange-600">🥉 2</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                2. 부산고
              </span>
              <div className="flex space-x-2">
                <span className="text-yellow-500">🥇 3</span>
                <span className="text-gray-400">🥈 4</span>
                <span className="text-orange-600">🥉 3</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                3. 서울체고
              </span>
              <div className="flex space-x-2">
                <span className="text-yellow-500">🥇 3</span>
                <span className="text-gray-400">🥈 2</span>
                <span className="text-orange-600">🥉 4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}