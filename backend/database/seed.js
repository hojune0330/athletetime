/**
 * 데이터베이스 시드 스크립트
 * 초기 공지사항 및 테스트 데이터 추가
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 데이터베이스 시드 시작...');
    
    await client.query('BEGIN');
    
    // 1. 관리자 사용자 생성
    const adminResult = await client.query(`
      INSERT INTO users (anonymous_id, username)
      VALUES ('admin_system', '관리자')
      RETURNING id
    `);
    const adminId = adminResult.rows[0].id;
    console.log('✅ 관리자 사용자 생성');
    
    // 2. 카테고리 확인 (이미 schema.sql에서 생성됨)
    const categoriesResult = await client.query('SELECT * FROM categories ORDER BY sort_order');
    console.log(`✅ 카테고리 ${categoriesResult.rows.length}개 확인`);
    
    // 3. 공지사항 게시글 생성
    // 공지글 수정용 비밀번호: 추측 가능한 'admin' 대신 환경변수 또는 무작위 값 사용
    const crypto = require('crypto');
    const noticePassword = process.env.NOTICE_POST_PASSWORD || crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(noticePassword, 10);
    
    // 공지사항 1: 커뮤니티 규칙
    await client.query(`
      INSERT INTO posts (
        category_id, user_id, title, content, author, password_hash,
        is_notice, is_admin, is_pinned
      ) VALUES (
        (SELECT id FROM categories WHERE name = '공지'),
        $1,
        '📋 커뮤니티 이용 규칙',
        $2,
        '관리자',
        $3,
        TRUE, TRUE, TRUE
      )
    `, [
      adminId,
      `🏃 애슬리트 타임 커뮤니티에 오신 것을 환영합니다!

건전하고 활발한 육상 커뮤니티를 위해 아래 규칙을 준수해 주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. 게시글 작성 규칙

✅ **허용되는 컨텐츠**
- 육상 관련 질문, 정보, 후기
- 훈련 방법 및 팁 공유
- 대회 정보 및 결과
- 장비 리뷰 및 추천
- 건설적인 토론

❌ **금지되는 컨텐츠**
- 욕설, 비방, 인신공격
- 정치, 종교 논쟁
- 광고, 홍보 (사전 승인 없이)
- 저작권 침해 자료
- 개인정보 노출

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. 이미지 업로드

✅ **이미지 정책**
- 최대 5장 / 게시글
- 최대 5MB / 이미지
- 자동 최적화 및 CDN 제공
- 저작권 위반 이미지 금지

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. 댓글 작성

✅ **댓글 규칙**
- 최대 500자
- 악플, 인신공격 금지
- 건설적인 토론 문화
- 대댓글 지원 (곧 추가 예정)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. 신고 시스템

⚠️ **자동 블라인드 정책**
- 신고 10건 이상 → 게시글 블라인드
- 신고 5건 이상 → 댓글 블라인드
- 비추천 20개 이상 → 자동 블라인드

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. 새로운 기능들! 🚀

✨ **최근 추가된 기능**
- 🔍 전체 검색 (게시글 + 댓글)
- 🏷️ 카테고리별 필터링
- 📸 Cloudinary 이미지 CDN
- 🔔 실시간 알림 (WebSocket)
- 💾 PostgreSQL 데이터베이스
- ⚡ 성능 최적화

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 💡 권장 게시글

📝 **이런 게시글을 작성해주세요!**
- 훈련 방법 및 팁
- 대회 후기 및 정보
- 장비 리뷰
- 부상 예방 및 관리
- 기록 향상 노하우
- 육상 관련 질문

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📞 문의 및 건의

- 부적절한 게시글 발견 시 신고 기능 이용
- 기타 문의사항은 관리자에게 연락
- GitHub Issues: [문제 제기](https://github.com/hojune0330/athletetime/issues)

모두 함께 건전한 육상 커뮤니티를 만들어가요! 🏃‍♂️🏃‍♀️

**Every Second Counts!** ⏱️`,
      passwordHash,
    ]);
    console.log('✅ 공지사항 1 생성: 커뮤니티 규칙');
    
    // 공지사항 2: 환영 메시지
    await client.query(`
      INSERT INTO posts (
        category_id, user_id, title, content, author, password_hash,
        is_notice, is_admin, is_pinned
      ) VALUES (
        (SELECT id FROM categories WHERE name = '공지'),
        $1,
        '🎉 애슬리트 타임 2.0 업그레이드 완료!',
        $2,
        '관리자',
        $3,
        TRUE, TRUE, FALSE
      )
    `, [
      adminId,
      `안녕하세요, 육상인 여러분! 👋

**애슬리트 타임이 대대적으로 업그레이드되었습니다!** 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🆕 새로운 기능

### 1. 🔍 전체 검색
- 게시글 + 댓글 통합 검색
- Full-text search로 빠른 검색
- 검색어 하이라이트
- 검색 순위 알고리즘

### 2. 📸 이미지 업로드 2.0
- **Cloudinary CDN** 사용
- 자동 최적화 (용량 50% 감소)
- 빠른 로딩 속도
- 썸네일 자동 생성
- WebP 포맷 자동 변환

### 3. 🔔 실시간 알림
- WebSocket 실시간 통신
- 댓글 작성 시 즉시 알림
- 좋아요 알림
- 멘션(@username) 알림
- 시스템 알림

### 4. 💾 PostgreSQL 데이터베이스
- JSON 파일 → PostgreSQL 전환
- 10배 빠른 쿼리 속도
- 데이터 무결성 보장
- 동시 접속 지원 (1000명+)
- 자동 백업

### 5. 🏷️ 카테고리 시스템
- 카테고리별 필터링
- 카테고리별 게시글 수 표시
- 아이콘 + 색상 구분
- 정렬 우선순위

### 6. ⚡ 성능 최적화
- 페이지 로딩 속도 3배 향상
- 인덱싱으로 검색 속도 10배 향상
- 캐싱으로 응답 속도 향상
- 이미지 CDN으로 로딩 속도 향상

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🎯 곧 추가될 기능

- [ ] 대댓글 (답글) 기능
- [ ] 멘션(@username) 기능
- [ ] 게시글 북마크
- [ ] 사용자 프로필 페이지
- [ ] 랭킹 시스템
- [ ] 뱃지/업적 시스템
- [ ] 다크/라이트 테마
- [ ] 모바일 앱 (PWA)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📊 통계

- 데이터베이스: PostgreSQL ✅
- 이미지 저장: Cloudinary CDN ✅
- 실시간 통신: WebSocket ✅
- 검색 엔진: Full-text search ✅
- 보안: bcrypt + Rate Limiting ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🙏 감사합니다

업그레이드 과정에서 불편을 드려 죄송합니다.
더 나은 서비스로 보답하겠습니다!

**모든 순간이 중요합니다! Every Second Counts!** ⏱️

화이팅! 💪🔥`,
      passwordHash,
    ]);
    console.log('✅ 공지사항 2 생성: 업그레이드 안내');
    
    // 공지사항 3: FAQ
    await client.query(`
      INSERT INTO posts (
        category_id, user_id, title, content, author, password_hash,
        is_notice, is_admin, is_pinned
      ) VALUES (
        (SELECT id FROM categories WHERE name = '공지'),
        $1,
        '❓ 자주 묻는 질문 (FAQ)',
        $2,
        '관리자',
        $3,
        TRUE, TRUE, FALSE
      )
    `, [
      adminId,
      `📚 애슬리트 타임 자주 묻는 질문

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q1. 회원가입이 필요한가요?

**A.** 아니요! 익명으로 자유롭게 이용 가능합니다.
브라우저에 고유 ID가 저장되어 본인 게시글/댓글 관리 가능합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q2. 게시글 수정/삭제는 어떻게 하나요?

**A.** 작성 시 설정한 비밀번호로 수정/삭제 가능합니다.
비밀번호를 잊으셨다면 관리자에게 문의해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q3. 이미지는 몇 장까지 올릴 수 있나요?

**A.** 게시글당 **최대 5장**, **5MB 이하**입니다.
자동 최적화되어 용량이 줄어듭니다!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q4. 게시글은 얼마나 보관되나요?

**A.** **90일** 이후 자동 삭제됩니다.
단, 공지사항은 영구 보관됩니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q5. 부적절한 게시글은 어떻게 신고하나요?

**A.** 게시글 하단의 **신고** 버튼을 눌러주세요.
- 신고 10건 이상 → 자동 블라인드
- 비추천 20개 이상 → 자동 블라인드

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q6. 검색은 어떻게 하나요?

**A.** 상단 검색창에서 키워드를 입력하세요!
- 게시글 제목/내용 검색
- 댓글 내용 검색
- 작성자 검색
- Full-text search 지원

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q7. 알림은 어떻게 받나요?

**A.** 우측 상단 🔔 아이콘을 확인하세요!
- 내 게시글에 댓글이 달리면 알림
- 내 댓글에 답글이 달리면 알림
- 실시간 WebSocket 알림

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q8. 페이스 계산기는 어디에 있나요?

**A.** 상단 메뉴의 **⏱️ 페이스** 버튼을 클릭하세요!
- 400m 기준 페이스 계산
- VDOT 기반 훈련 계산
- 대회 일정 캘린더
- 트랙 레인 계산기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q9. 모바일에서도 잘 되나요?

**A.** 네! 완벽하게 최적화되어 있습니다.
- PWA (앱처럼 설치 가능)
- 반응형 디자인
- 모바일 키보드 최적화
- 빠른 로딩 속도

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q10. 문의는 어디로 하나요?

**A.** 다음 방법으로 문의해주세요:
- GitHub Issues
- 이메일: support@athletetime.com
- 커뮤니티 질문 게시판

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

더 궁금한 점이 있으시면 자유롭게 질문해주세요! 🙋`,
      passwordHash,
    ]);
    console.log('✅ 공지사항 3 생성: FAQ');
    
    // 4. 테스트 사용자 및 게시글 생성 (선택사항)
    if (process.env.NODE_ENV === 'development') {
      // 테스트 사용자 생성
      const testUserResult = await client.query(`
        INSERT INTO users (anonymous_id, username)
        VALUES ('test_user_1', '테스트러너')
        RETURNING id
      `);
      const testUserId = testUserResult.rows[0].id;
      
      // 테스트 게시글
      await client.query(`
        INSERT INTO posts (
          category_id, user_id, title, content, author, password_hash
        ) VALUES (
          (SELECT id FROM categories WHERE name = '자유'),
          $1,
          '첫 게시글입니다! 🎉',
          '안녕하세요! 애슬리트 타임에서 첫 게시글을 작성합니다.\n\n정말 편하고 빠르네요!',
          '테스트러너',
          $2
        )
      `, [testUserId, await bcrypt.hash('test123', 10)]);
      
      console.log('✅ 테스트 데이터 생성 (개발 환경)');
    }
    
    await client.query('COMMIT');
    
    console.log('');
    console.log('🎉 시드 완료!');
    console.log('📊 생성된 데이터:');
    console.log('   - 사용자: 1명 (관리자)');
    console.log('   - 카테고리: 6개');
    console.log('   - 공지사항: 3개');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 시드 실패:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 실행
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ 시드 스크립트 실행 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 시드 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { seed };
