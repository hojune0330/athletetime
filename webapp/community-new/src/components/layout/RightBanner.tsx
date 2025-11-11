export default function RightBanner() {
  // 현재 날짜 기준 대회 정보
  const upcomingEvents = [
    { name: '서울마라톤', dDay: 'D-7', date: '11.03', status: '접수중' },
    { name: '전국체전', dDay: 'D-30', date: '11.26', status: '준비중' },
    { name: '제주마라톤', dDay: 'D-14', date: '11.10', status: '마감' },
  ]

  return (
    <div className="space-y-4 sticky top-20">
      {/* 진행중인 대회 */}
      <div className="bg-dark-700 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
          <span>🏆 대회 일정</span>
          <span className="text-xs text-gray-400 font-normal">더보기</span>
        </h3>
        <div className="space-y-2">
          {upcomingEvents.map((event, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-dark-600 rounded text-xs">
              <div>
                <div className="text-white font-medium">{event.name}</div>
                <div className="text-gray-400">{event.date}</div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${
                  event.dDay.includes('-7') ? 'text-red-400' : 'text-primary-400'
                }`}>
                  {event.dDay}
                </div>
                <div className={`text-[10px] ${
                  event.status === '접수중' ? 'text-green-400' : 
                  event.status === '마감' ? 'text-gray-500' : 'text-yellow-400'
                }`}>
                  {event.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 오늘의 추천 */}
      <div className="bg-dark-700 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">💡 오늘의 추천</h3>
        <div className="space-y-3">
          <div className="text-xs">
            <div className="text-gray-400 mb-1">훈련 팁</div>
            <p className="text-gray-300">
              "인터벌 훈련 전 충분한 워밍업은 필수! 최소 15분 이상 조깅으로 몸을 풀어주세요."
            </p>
          </div>
          <div className="text-xs">
            <div className="text-gray-400 mb-1">추천 아이템</div>
            <div className="p-2 bg-dark-600 rounded">
              <div className="text-white font-medium">나이키 베이퍼플라이 3</div>
              <div className="text-gray-400">서브3 도전 러너에게 추천</div>
            </div>
          </div>
        </div>
      </div>

      {/* 광고 배너 */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg p-4">
        <div className="text-center">
          <div className="text-white font-bold mb-2">광고 영역</div>
          <div className="text-white/80 text-xs">300x250</div>
        </div>
      </div>

      {/* 모바일에서는 숨김 */}
      <div className="hidden lg:block bg-dark-700 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">📈 주간 인기글</h3>
        <div className="space-y-2 text-xs">
          {[
            '서브3 달성 후기',
            '100m 10초대 진입 방법',
            '마라톤 보급 전략',
            '러닝화 수명 늘리기',
            '부상없이 훈련하기'
          ].map((title, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-primary-400 font-bold">{index + 1}</span>
              <span className="text-gray-300 truncate hover:text-white cursor-pointer">{title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}