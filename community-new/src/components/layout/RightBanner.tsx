/**
 * 우측 배너 컴포넌트 (v4.1.0 - Light Mode & Real Environment)
 * 
 * 더미 데이터 제거 - 실제 환경에서 API 연동 필요
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// 타입 정의
interface UpcomingEvent {
  id: number;
  name: string;
  date: string;
  dDay: string;
  status: '접수중' | '준비중' | '마감' | '진행중';
  link?: string;
}

interface PopularPost {
  id: number;
  title: string;
  views: number;
  likes: number;
}

// 훈련 팁 목록 (정적 데이터로 유지)
const TRAINING_TIPS = [
  "인터벌 훈련 전 충분한 워밍업은 필수! 최소 15분 이상 조깅으로 몸을 풀어주세요.",
  "장거리 훈련 후에는 적절한 휴식과 스트레칭을 잊지 마세요.",
  "수분 섭취는 훈련 전, 중, 후 모두 중요합니다. 특히 여름철에는 더욱 신경 쓰세요.",
  "점진적 과부하 원칙을 따르세요. 주간 훈련량은 10% 이상 늘리지 마세요.",
  "기록 향상을 위해서는 충분한 수면이 필수입니다. 7-8시간 수면을 권장합니다.",
  "템포 런은 젖산역치를 높이는 데 효과적입니다. 주 1회 추천!",
  "러닝화는 500km마다 교체를 권장합니다. 쿠셔닝 성능 저하에 주의하세요.",
];

// 외부 링크 클릭 핸들러 (React Router 우회)
const handleExternalLink = (e: React.MouseEvent, path: string) => {
  e.preventDefault();
  window.location.href = `/${path}`;
};

export default function RightBanner() {
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [todayTip, setTodayTip] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 오늘의 팁 설정 (날짜 기반 랜덤)
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    setTodayTip(TRAINING_TIPS[dayOfYear % TRAINING_TIPS.length]);

    // 실제 환경에서는 API 호출로 대체
    // 현재는 빈 상태로 유지하거나 실제 API 연동 시 활성화
    const fetchData = async () => {
      try {
        // TODO: 실제 API 연동
        // const eventsResponse = await fetch('/api/events/upcoming');
        // const postsResponse = await fetch('/api/posts/popular');
        // setUpcomingEvents(await eventsResponse.json());
        // setPopularPosts(await postsResponse.json());
        
        // 로딩 완료 후 빈 상태 유지
        setIsLoading(false);
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-4 sticky top-20">
      {/* 대회 일정 - API 연동 준비 완료 */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              대회 일정
            </span>
            <Link to="/events" className="text-xs text-primary-500 font-medium hover:text-primary-600 transition-colors">
              더보기
            </Link>
          </h3>
          
          {isLoading ? (
            // 로딩 스켈레톤
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 rounded-lg" />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <Link 
                  key={event.id}
                  to={event.link || `/events/${event.id}`}
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg text-xs hover:bg-neutral-100 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-neutral-800">{event.name}</div>
                    <div className="text-neutral-500">{event.date}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      event.dDay.includes('-7') || event.dDay.includes('-6') || 
                      event.dDay.includes('-5') || event.dDay.includes('-4') ||
                      event.dDay.includes('-3') || event.dDay.includes('-2') ||
                      event.dDay.includes('-1') || event.dDay === 'D-Day'
                        ? 'text-danger-500' 
                        : 'text-primary-500'
                    }`}>
                      {event.dDay}
                    </div>
                    <div className={`text-[10px] font-medium ${
                      event.status === '접수중' ? 'text-success-500' : 
                      event.status === '마감' ? 'text-neutral-400' : 
                      event.status === '진행중' ? 'text-accent-500' : 'text-warning-500'
                    }`}>
                      {event.status}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            // 빈 상태
            <div className="text-center py-6 text-neutral-400 text-sm">
              <div className="text-2xl mb-2">📅</div>
              <p>등록된 대회가 없습니다</p>
              <p className="text-xs mt-1">곧 업데이트됩니다!</p>
            </div>
          )}
        </div>
      </div>

      {/* 오늘의 훈련 팁 */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <span className="text-lg">💡</span>
            오늘의 훈련 팁
          </h3>
          <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
            <p className="text-sm text-neutral-700 leading-relaxed">
              "{todayTip}"
            </p>
          </div>
          <div className="mt-3 text-center">
            <a 
              href="/training-calculator.html"
              onClick={(e) => handleExternalLink(e, 'training-calculator.html')}
              className="text-xs text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              훈련 페이스 계산기 →
            </a>
          </div>
        </div>
      </div>

      {/* 커뮤니티 소개 */}
      <div className="card bg-gradient-to-br from-primary-500 to-primary-600 border-0 shadow-glow-primary">
        <div className="card-body text-center">
          <div className="text-3xl mb-2">🏃‍♂️</div>
          <div className="text-white font-bold mb-1">애슬리트 타임</div>
          <div className="text-white/80 text-xs">육상인들의 익명 커뮤니티</div>
          <Link 
            to="/write" 
            className="mt-3 inline-block px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors"
          >
            글 작성하기
          </Link>
        </div>
      </div>

      {/* 주간 인기글 - API 연동 준비 완료 */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <span className="text-lg">📈</span>
            주간 인기글
          </h3>
          
          {isLoading ? (
            // 로딩 스켈레톤
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-5 h-5 rounded-full" />
                  <div className="skeleton h-4 flex-1 rounded" />
                </div>
              ))}
            </div>
          ) : popularPosts.length > 0 ? (
            <div className="space-y-2.5">
              {popularPosts.slice(0, 5).map((post, index) => (
                <Link 
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="flex items-center gap-3 group"
                >
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                    index < 3 ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-sm text-neutral-700 truncate group-hover:text-primary-600 transition-colors">
                    {post.title}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            // 빈 상태
            <div className="text-center py-6 text-neutral-400 text-sm">
              <div className="text-2xl mb-2">📝</div>
              <p>아직 인기글이 없습니다</p>
              <p className="text-xs mt-1">첫 번째 인기 작성자가 되어보세요!</p>
            </div>
          )}
        </div>
      </div>

      {/* 빠른 링크 */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <span className="text-lg">🔗</span>
            빠른 링크
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <a 
              href="/pace-calculator.html"
              onClick={(e) => handleExternalLink(e, 'pace-calculator.html')}
              className="p-3 bg-neutral-50 rounded-lg text-center hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              <div className="text-lg mb-1">⏱️</div>
              <div className="text-xs font-medium text-neutral-700">페이스 계산기</div>
            </a>
            <a 
              href="/training-calculator.html"
              onClick={(e) => handleExternalLink(e, 'training-calculator.html')}
              className="p-3 bg-neutral-50 rounded-lg text-center hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              <div className="text-lg mb-1">📊</div>
              <div className="text-xs font-medium text-neutral-700">훈련 계산기</div>
            </a>
            <a 
              href="/chat.html"
              onClick={(e) => handleExternalLink(e, 'chat.html')}
              className="p-3 bg-neutral-50 rounded-lg text-center hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              <div className="text-lg mb-1">💬</div>
              <div className="text-xs font-medium text-neutral-700">실시간 채팅</div>
            </a>
            <a 
              href="/index.html"
              onClick={(e) => handleExternalLink(e, 'index.html')}
              className="p-3 bg-neutral-50 rounded-lg text-center hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              <div className="text-lg mb-1">🏠</div>
              <div className="text-xs font-medium text-neutral-700">메인 페이지</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
