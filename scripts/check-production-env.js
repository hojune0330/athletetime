#!/usr/bin/env node
/**
 * AthleTime 배포 전 production 환경변수 점검 스크립트
 *
 * 목적:
 *   Render에서 "Exited with status 1 while running your code" 배포 실패를
 *   사전에 방지하기 위해, production 기동 시 반드시 필요한 환경변수가 모두
 *   설정되어 있는지 확인한다.
 *
 * 배경:
 *   src/server.js:51  → assertRecoveryCodeEnvironment()
 *     - AUTH_CODE_PEPPER (32자 이상) 없으면 즉시 throw → exit 1
 *   backend/utils/db.js:28
 *     - DATABASE_URL 없으면 production에서 즉시 throw → exit 1
 *   backend/utils/jwt.js:22
 *     - JWT_SECRET 없으면 production에서 즉시 throw → exit 1
 *   src/middleware/auth.js (requireAdmin)
 *     - ADMIN_TOKEN 없으면 production에서 관리자 요청 503 (기동은 성공, 권장)
 *
 * 사용법:
 *   NODE_ENV=production node scripts/check-production-env.js
 *   # 배포 환경변수를 파일로 점검:
 *   node scripts/check-production-env.js --env .env.production
 *
 * 실행 결과:
 *   0 = 통과 (배포 가능) / 1 = 실패 (배포 전 반드시 수정)
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * PostgreSQL 연결 문자열 형식 검증
 * postgres://user:pass@host:port/db (또는 postgresql://) 형태.
 * Render의 내부/외부 URL 모두 이 형식을 따른다.
 */
function isValidPostgresUrl(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  try {
    const url = new URL(value.trim());
    const okScheme = url.protocol === 'postgres:' || url.protocol === 'postgresql:';
    const okHost = !!url.hostname;
    return okScheme && okHost;
  } catch {
    return false;
  }
}

const REQUIRED_ENV = [
  {
    key: 'AUTH_CODE_PEPPER',
    validate: (v) => typeof v === 'string' && v.trim().length >= 32,
    message: 'AUTH_CODE_PEPPER (복구 코드 HMAC pepper) — 32자 이상 필수. 미설정 시 src/server.js:51에서 즉시 exit 1.',
  },
  {
    key: 'DATABASE_URL',
    validate: isValidPostgresUrl,
    message: 'DATABASE_URL (PostgreSQL 연결 문자열, 예: postgres://user:pass@host:5432/db) — 미설정/형식 오류 시 backend/utils/db.js:28에서 즉시 exit 1.',
  },
  {
    key: 'JWT_SECRET',
    validate: (v) => typeof v === 'string' && v.trim().length >= 32,
    message: 'JWT_SECRET (토큰 서명용, 32자 이상 권장) — 미설정 시 backend/utils/jwt.js:22에서 즉시 exit 1.',
  },
];

const RECOMMENDED_ENV = [
  {
    key: 'ADMIN_TOKEN',
    validate: (v) => typeof v === 'string' && v.trim().length > 0,
    message: 'ADMIN_TOKEN (관리자 인증) — 미설정 시 production에서 관리자 API가 503으로 차단됩니다.',
  },
  {
    key: 'RESEND_API_KEY',
    validate: (v) => typeof v === 'string' && v.trim().length > 0,
    message: 'RESEND_API_KEY (이메일 발송) — 미설정 시 이메일 기능이 비활성화됩니다.',
  },
];

function loadEnvFile(envFile) {
  const filePath = path.resolve(envFile);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 환경변수 파일이 없습니다: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const loaded = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    loaded[key] = value;
  }
  return loaded;
}

function main() {
  const argv = process.argv.slice(2);
  let env = { ...process.env };

  const envIdx = argv.indexOf('--env');
  if (envIdx !== -1 && argv[envIdx + 1]) {
    env = { ...loadEnvFile(argv[envIdx + 1]) };
    console.log(`📄 환경변수 파일에서 점검: ${argv[envIdx + 1]}`);
  } else {
    console.log('📄 환경변수(process.env)에서 점검');
  }

  console.log('');
  console.log('🚀 AthleTime production 배포 전 환경변수 점검');
  console.log('──────────────────────────────────────────────');

  let failed = false;

  for (const item of REQUIRED_ENV) {
    const value = env[item.key];
    const ok = item.validate(value);
    if (ok) {
      console.log(`  ✅ [필수] ${item.key} — 설정됨`);
    } else {
      failed = true;
      console.log(`  ❌ [필수] ${item.key} — ${item.message}`);
    }
  }

  console.log('');
  for (const item of RECOMMENDED_ENV) {
    const value = env[item.key];
    const ok = item.validate(value);
    if (ok) {
      console.log(`  ✅ [권장] ${item.key} — 설정됨`);
    } else {
      console.log(`  ⚠️  [권장] ${item.key} — ${item.message}`);
    }
  }

  // Render PostgreSQL TLS 연결 옵션 검증
  // - DATABASE_CA_CERT_BASE64가 있으면 CA 검증 모드 (rejectUnauthorized: true)
  // - 없으면 Render는 RENDER=true + DATABASE_TLS_ALLOW_SELF_SIGNED=true 조합으로 자체서명 허용 (c6c8982)
  //   두 조건 모두 없으면 DB TLS 연결은 기본값 rejectUnauthorized:true (Render 내부 DB는 이걸로 커넥션 실패 가능)
  const hasDbCa = typeof env.DATABASE_CA_CERT_BASE64 === 'string' && env.DATABASE_CA_CERT_BASE64.trim().length > 0;
  const renderTlsOk = env.RENDER === 'true' && env.DATABASE_TLS_ALLOW_SELF_SIGNED === 'true';
  const tlsWarned = (!hasDbCa && !renderTlsOk) && !!env.DATABASE_URL;
  if (hasDbCa) {
    console.log('  ✅ [TLS] DATABASE_CA_CERT_BASE64 — CA 검증 모드 (rejectUnauthorized: true)');
  } else if (renderTlsOk) {
    console.log('  ✅ [TLS] RENDER + DATABASE_TLS_ALLOW_SELF_SIGNED — Render 내부 DB 자체서명 허용');
  } else if (tlsWarned) {
    console.log('  ⚠️  [TLS] DATABASE_CA_CERT_BASE64 없음 + (RENDER=true & DATABASE_TLS_ALLOW_SELF_SIGNED=true) 아님');
    console.log('        → postgres-ssl.js가 rejectUnauthorized:true 기본값을 사용해');
    console.log('          Render 내부(private) DB 주소면 TLS 핸드셰이크 실패로 연결이 막힐 수 있습니다.');
    console.log('          해결: 대시보드 DB 탭의 CA 인증서를 DATABASE_CA_CERT_BASE64로 넣거나,');
    console.log('          RENDER=true 와 DATABASE_TLS_ALLOW_SELF_SIGNED=true 를 함께 설정하세요.');
  }

  console.log('──────────────────────────────────────────────');
  if (failed) {
    console.log('❌ 필수 환경변수가 누락되었습니다. Render 대시보드 → Environment에 설정 후 재배포하세요.');
    console.log('   (Render에서 production 배포 실패 시 "Exited with status 1"로 표시되고,');
    console.log('    직전 성공 배포로 롤백되어 예전 버전이 계속 서빙됩니다.)');
    process.exit(1);
  }

  console.log('✅ 모든 필수 환경변수가 설정되었습니다. 배포 가능합니다.');
  process.exit(0);
}

main();
