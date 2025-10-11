/**
 * Render 유료 플랜 설정
 * 
 * 중요: 이 프로젝트는 Render 유료 플랜을 사용 중입니다.
 * 무료 플랜이 아닙니다! 데이터 제한이 없습니다!
 * 
 * @author Athletic Time
 * @date 2025-10-11
 * @plan Render Starter ($7/month) 또는 그 이상
 */

const RENDER_PLAN = {
  // 플랜 정보
  plan: {
    type: 'PAID',  // 유료 플랜
    name: 'Render Starter or Higher',
    price: '$7/month+',
    status: 'ACTIVE'
  },

  // 사용 가능한 기능
  features: {
    postgresql: true,          // PostgreSQL 데이터베이스 포함
    persistentStorage: true,   // 영구 저장소
    customDomain: true,       // 커스텀 도메인
    autoDeployment: true,     // GitHub 자동 배포
    webSocket: true,          // WebSocket 지원
    ssl: true,                // SSL 인증서
    logging: true,            // 로그 저장
    monitoring: true,         // 모니터링
    backup: true              // 백업 가능
  },

  // 리소스 제한
  limits: {
    storage: 'UNLIMITED',      // 저장소 제한 없음 (유료)
    bandwidth: 'UNLIMITED',    // 대역폭 제한 없음 (유료)
    requests: 'UNLIMITED',     // 요청 제한 없음 (유료)
    database: {
      connections: 97,         // PostgreSQL 연결 수
      storage: '1GB+',        // 데이터베이스 저장소
      backup: 'DAILY'         // 일일 백업
    }
  },

  // 데이터베이스 설정
  database: {
    type: 'PostgreSQL',
    version: '15',
    persistent: true,          // 영구 저장
    autoBackup: true,         // 자동 백업
    pointInTimeRecovery: true // 시점 복구 가능
  },

  // 서버 설정
  server: {
    region: 'Oregon, USA',
    memory: '512MB+',
    cpu: 'Shared',
    autoscaling: false,       // 스타터는 오토스케일링 없음
    zeroDowntimeDeployment: true
  },

  // 환경 변수 (Render 대시보드에서 설정)
  environment: {
    NODE_ENV: 'production',
    DATABASE_URL: 'AUTO_PROVIDED', // Render가 자동 제공
    PORT: 'AUTO_PROVIDED',         // Render가 자동 제공
    CORS_ORIGIN: 'https://athlete-time.netlify.app'
  },

  // 중요 참고사항
  notes: [
    '⚠️ 이것은 유료 플랜입니다. 무료 플랜이 아닙니다!',
    '✅ 모든 데이터는 PostgreSQL에 영구 저장됩니다',
    '✅ 서버 재시작/재배포해도 데이터가 유지됩니다',
    '✅ WebSocket 채팅 기능을 사용할 수 있습니다',
    '❌ 로컬 파일 시스템이나 메모리 저장소를 사용하지 마세요'
  ]
};

// 플랜 검증 함수
function validateRenderPlan() {
  if (process.env.NODE_ENV === 'production') {
    console.log('🎯 Render 유료 플랜 사용 중');
    console.log('💾 PostgreSQL 데이터베이스 사용');
    console.log('♾️ 데이터 제한 없음');
    
    if (!process.env.DATABASE_URL) {
      console.error('⚠️ DATABASE_URL이 설정되지 않음!');
      console.error('Render 대시보드에서 PostgreSQL이 연결되었는지 확인하세요.');
    }
  }
}

// 설정 내보내기
module.exports = {
  RENDER_PLAN,
  validateRenderPlan,
  
  // 헬퍼 함수들
  isPaidPlan: () => RENDER_PLAN.plan.type === 'PAID',
  hasPostgreSQL: () => RENDER_PLAN.features.postgresql,
  hasPersistentStorage: () => RENDER_PLAN.features.persistentStorage,
  getDatabaseConfig: () => RENDER_PLAN.database,
  getServerConfig: () => RENDER_PLAN.server
};