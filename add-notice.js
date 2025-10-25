const fetch = require('node-fetch');

async function addNotice() {
  const notice = {
    category: "공지",
    title: "🎉 Athletic Time 커뮤니티 오픈! (BETA)",
    author: "관리자",
    content: `안녕하세요, 러너 여러분! 🏃‍♂️🏃‍♀️

Athletic Time 커뮤니티가 드디어 오픈했습니다!
이곳은 모든 육상인들이 자유롭게 소통하고 정보를 공유하는 공간입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📢 **BETA 서비스 안내**

현재 Athletic Time은 베타 테스트 중입니다.
다음과 같은 일시적인 현상이 발생할 수 있습니다:

• 간헐적인 서버 연결 오류
• 게시글/댓글 작성 지연
• 데이터 일시적 표시 오류
• 새로고침 시 일부 내용 미표시

⚠️ **중요**: 베타 기간 중 시스템 업데이트로 인해 
일부 게시글이나 댓글이 초기화될 수 있습니다.
중요한 내용은 별도로 백업해 주시기 바랍니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️ **버그 리포트 & 개선 제안**

오류나 버그를 발견하셨나요?
불편한 점이나 개선이 필요한 부분이 있나요?

👉 이 게시판에 자유롭게 남겨주세요!
👉 인스타그램 DM도 환영합니다: @athletic_time

여러분의 소중한 피드백으로 더 나은 서비스를 만들어가겠습니다.
빠른 시일 내에 확인하고 개선하도록 하겠습니다! 💪

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 **커뮤니티 이용 규칙**

1. 서로 존중하고 배려하는 문화
2. 욕설, 비방, 차별적 발언 금지
3. 광고, 스팸, 도배 금지
4. 허위 정보 유포 금지
5. 개인정보 보호 (전화번호, 주소 등 공개 자제)
6. 10명 이상 신고 시 자동 블라인드 처리

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 **Athletic Time 주요 기능**

✅ KAAF 2025 대회 일정 (54개 공식 경기)
✅ 페이스 계산기 & 훈련 계산기
✅ 실시간 채팅방
✅ 익명 커뮤니티 게시판
✅ D-Day 카운터

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **앞으로의 계획**

• 사용자 프로필 기능
• 훈련 일지 작성 기능
• 대회 결과 공유 기능
• 러닝 크루 모집 게시판
• GPS 러닝 트래커

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

함께 만들어가는 Athletic Time!
모든 러너들의 참여를 기다립니다. 🌟

건강한 러닝 라이프 되세요!
Thank you & Keep Running! 🏃‍♂️💨

**Athletic Time Team**
2025.10.10`,
    password: "admin2025",
    isNotice: true,
    isAdmin: true
  };

  try {
    // 로컬 서버에 추가
    const localResponse = await fetch('http://localhost:3005/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notice)
    });
    const localData = await localResponse.json();
    console.log('✅ 로컬 서버에 공지 추가:', localData.success);

    // Render 서버에 추가
    const renderResponse = await fetch('https://athlete-time-backend.onrender.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notice)
    });
    const renderData = await renderResponse.json();
    console.log('✅ Render 서버에 공지 추가:', renderData.success);

    console.log('\n📢 공지사항이 성공적으로 등록되었습니다!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

addNotice();
