// 시즌별/대회별 이벤트 채팅방 설정
const EVENT_CHAT_ROOMS = [
  {
    id: 'jeonchok-2025',
    name: '🏃 2025 전국체전 (부산)',
    icon: '🏆',
    description: '제106회 전국체육대회 육상 종목',
    startDate: '2025-10-12', // 1주일 전부터 오픈
    endDate: '2025-10-23', // 대회 종료 1일 후까지
    eventDate: '2025년 10월 19일 ~ 22일',
    type: 'competition',
    tags: ['전국체전', '부산', '육상'],
    features: {
      liveScore: true,      // 실시간 경기 결과
      photoShare: true,     // 사진 공유 활성화
      athleteTag: true,     // 선수 태그 기능
      officialNews: true    // 공식 소식 피드
    }
  },
  {
    id: 'jtbc-marathon-2025',
    name: '🏃‍♂️ 2025 JTBC 서울마라톤',
    icon: '🎽',
    description: 'JTBC 서울마라톤 대회',
    startDate: '2025-10-26', // 1주일 전부터
    endDate: '2025-11-03', // 대회 종료 1일 후까지
    eventDate: '2025년 11월 2일',
    type: 'marathon',
    tags: ['마라톤', 'JTBC', '서울'],
    features: {
      paceGroup: true,      // 페이스 그룹별 채팅
      courseInfo: true,     // 코스 정보 공유
      weatherUpdate: true,  // 날씨 업데이트
      finisherCert: true    // 완주 인증
    }
  },
  {
    id: 'spring-track-2025',
    name: '🌸 2025 봄철 육상 시즌',
    icon: '🌷',
    description: '봄철 육상 시즌 종합 채팅',
    startDate: '2025-03-01',
    endDate: '2025-05-31',
    eventDate: '2025년 3월 ~ 5월',
    type: 'season',
    tags: ['봄시즌', '육상', '트랙'],
    features: {
      recordUpdate: true,   // 기록 업데이트
      trainingTips: true,   // 훈련 팁 공유
      meetupSchedule: true  // 모임 일정
    }
  },
  {
    id: 'summer-track-2025',
    name: '☀️ 2025 하계 육상 시즌',
    icon: '🏃',
    description: '여름철 주요 육상 대회 시즌',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    eventDate: '2025년 6월 ~ 8월',
    type: 'season',
    tags: ['여름시즌', '육상', '대회'],
    features: {
      heatManagement: true, // 더위 대처법
      hydrationTips: true,  // 수분 보충 정보
      summerTraining: true  // 여름 훈련법
    }
  },
  {
    id: 'dongamarathon-2025',
    name: '📰 2025 동아마라톤',
    icon: '🏅',
    description: '동아일보 서울국제마라톤',
    startDate: '2025-03-09', // 1주일 전부터
    endDate: '2025-03-17', // 대회 종료 1일 후까지
    eventDate: '2025년 3월 16일',
    type: 'marathon',
    tags: ['마라톤', '동아일보', '서울'],
    features: {
      eliteTracking: true,  // 엘리트 선수 추적
      paceAnalysis: true,   // 페이스 분석
      liveUpdate: true      // 실시간 업데이트
    }
  },
  {
    id: 'middle-distance-2025',
    name: '💨 중장거리 전문방',
    icon: '🎯',
    description: '800m ~ 5000m 중장거리 선수 모임',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    eventDate: '2025년 연중',
    type: 'community',
    tags: ['중거리', '장거리', '훈련'],
    permanent: true, // 연중 상시 운영
    features: {
      workoutShare: true,   // 훈련 공유
      paceCalculator: true, // 페이스 계산
      intervalTimer: true   // 인터벌 타이머
    }
  },
  {
    id: 'sprint-2025',
    name: '⚡ 단거리 스프린터 모임',
    icon: '💪',
    description: '100m ~ 400m 단거리 선수 커뮤니티',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    eventDate: '2025년 연중',
    type: 'community',
    tags: ['단거리', '스프린트', '스피드'],
    permanent: true,
    features: {
      techniqueVideo: true, // 기술 영상 공유
      strengthTraining: true, // 근력 훈련
      startPractice: true   // 스타트 연습
    }
  }
];

// 현재 활성화된 이벤트 룸 가져오기
function getActiveEventRooms() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  return EVENT_CHAT_ROOMS.filter(room => {
    // 상시 운영 방은 항상 활성화
    if (room.permanent) return true;
    
    // 기간 체크
    const startDate = new Date(room.startDate);
    const endDate = new Date(room.endDate);
    return now >= startDate && now <= endDate;
  });
}

// 이벤트 룸 D-Day 계산
function getEventDDay(room) {
  if (room.permanent) return '상시';
  
  const now = new Date();
  const eventStart = new Date(room.eventDate.split(' ')[0]); // 첫 날짜 추출
  const diffTime = eventStart - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    return `D-${diffDays}`;
  } else if (diffDays === 0) {
    return 'D-Day';
  } else {
    return `D+${Math.abs(diffDays)}`;
  }
}

// 이벤트 룸 상태 체크
function getEventRoomStatus(room) {
  const now = new Date();
  const startDate = new Date(room.startDate);
  const endDate = new Date(room.endDate);
  
  if (room.permanent) {
    return { status: 'active', message: '상시 운영' };
  }
  
  if (now < startDate) {
    const daysUntilOpen = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
    return { status: 'upcoming', message: `${daysUntilOpen}일 후 오픈` };
  }
  
  if (now > endDate) {
    return { status: 'ended', message: '종료됨' };
  }
  
  const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  return { status: 'active', message: `${daysUntilEnd}일 남음` };
}

// 이벤트 타입별 스타일
function getEventTypeStyle(type) {
  const styles = {
    competition: {
      background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      badge: '대회'
    },
    marathon: {
      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      badge: '마라톤'
    },
    season: {
      background: 'linear-gradient(135deg, #10b981, #06b6d4)',
      badge: '시즌'
    },
    community: {
      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
      badge: '커뮤니티'
    }
  };
  
  return styles[type] || styles.community;
}

// Export for use in main chat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EVENT_CHAT_ROOMS,
    getActiveEventRooms,
    getEventDDay,
    getEventRoomStatus,
    getEventTypeStyle
  };
}