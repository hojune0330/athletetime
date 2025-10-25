#!/usr/bin/env node
// 샘플 게시글 추가 스크립트

const fetch = require('node-fetch');

const API_URL = process.env.PROD 
  ? 'https://athlete-time-backend.onrender.com' 
  : 'http://localhost:3000';

console.log(`🎯 타겟 서버: ${API_URL}\n`);

const samplePosts = [
  {
    category: '정보',
    title: '🏃 러닝 초보자를 위한 기초 가이드',
    author: '러닝코치',
    content: `러닝을 처음 시작하시는 분들을 위한 기초 가이드입니다!

1. 준비운동은 필수
- 5-10분 정도 가벼운 스트레칭
- 관절 운동으로 부상 예방

2. 올바른 자세
- 시선은 전방 10-20m 앞을 보기
- 팔은 90도로 자연스럽게 흔들기
- 발은 뒤꿈치부터 착지

3. 호흡법
- 코로 들이마시고 입으로 내쉬기
- 일정한 리듬 유지하기

4. 페이스 조절
- 처음엔 천천히, 대화 가능한 속도로
- 주 3-4회, 30분씩 시작

화이팅! 💪`,
    password: 'run123',
    images: [],
    poll: null
  },
  {
    category: '질문',
    title: '마라톤 대회 추천해주세요!',
    author: '초보러너',
    content: `안녕하세요! 러닝 시작한 지 6개월 된 초보입니다.

10km는 완주해봤는데 하프마라톤 도전해보고 싶어요.
초보자도 참여하기 좋은 대회 추천 부탁드려요!

서울/경기 지역이면 좋겠습니다.`,
    password: 'qna456',
    images: [],
    poll: null
  },
  {
    category: '자유',
    title: '오늘 한강 러닝 완료! 🌅',
    author: '한강러너',
    content: `새벽 6시 한강 러닝 다녀왔습니다!

날씨도 선선하고 일출도 예쁘고 최고였어요 ㅎㅎ
아침 러닝 진짜 추천합니다!

오늘 10km 52분 기록
조금씩 빨라지고 있어서 뿌듯하네요 😊`,
    password: 'free789',
    images: [],
    poll: null
  },
  {
    category: '모임',
    title: '🏃‍♀️ 주말 러닝 크루 모집합니다!',
    author: '크루장',
    content: `[서울 러닝 크루 모집]

📍 장소: 잠실 한강공원
📅 일시: 매주 토요일 오전 7시
🏃 거리: 5-10km (개인 페이스)

✅ 초보자 환영
✅ 페이스 그룹별 운영
✅ 운동 후 간단한 스트레칭
✅ 월 1회 번개 회식

관심 있으신 분들 댓글 남겨주세요!`,
    password: 'crew321',
    images: [],
    poll: null
  },
  {
    category: '대회',
    title: '2024 서울마라톤 후기',
    author: '마라토너',
    content: `드디어 첫 풀코스 완주했습니다! 🎉

기록: 4시간 32분

준비 기간: 6개월
주간 러닝: 40-60km

힘들었지만 완주하니 정말 뿌듯하네요.
응원해주신 모든 분들 감사합니다!

다음 목표는 서브4입니다 💪`,
    password: 'race111',
    images: [],
    poll: null
  }
];

async function addSamplePosts() {
  console.log('📝 샘플 게시글 추가 시작...\n');
  
  let success = 0;
  let failed = 0;
  
  for (const post of samplePosts) {
    try {
      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ "${post.title}" 추가 완료`);
        success++;
      } else {
        console.log(`❌ "${post.title}" 추가 실패:`, result.message);
        failed++;
      }
    } catch (error) {
      console.log(`❌ "${post.title}" 추가 중 오류:`, error.message);
      failed++;
    }
    
    // 서버 부하 방지를 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 결과: 성공 ${success}개, 실패 ${failed}개`);
  
  // 전체 게시글 확인
  try {
    const response = await fetch(`${API_URL}/api/posts`);
    const data = await response.json();
    console.log(`\n📚 현재 총 게시글 수: ${data.posts.length}개`);
  } catch (error) {
    console.error('게시글 수 확인 실패:', error.message);
  }
}

// 실행
addSamplePosts();