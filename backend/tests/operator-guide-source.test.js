const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertNotIncludes(source, terms, label) {
  for (const term of terms) {
    assert.equal(source.includes(term), false, `${label} must not include "${term}"`);
  }
}

test('operator guide route is nested under admin route and linked only from admin chrome', () => {
  const app = read('frontend/src/App.tsx');
  const adminLayout = read('frontend/src/components/layout/AdminLayout.tsx');
  const dashboard = read('frontend/src/pages/admin/AdminDashboardPage.tsx');

  assert.match(app, /path="\/admin" element=\{<AdminRoute \/>}/);
  assert.match(app, /path="operator-guide" element=\{(?:<AdminOperatorGuidePage \/>|lazyPage\(<AdminOperatorGuidePage \/>\))}/);
  assert.match(adminLayout, /운영 가이드/);
  assert.match(adminLayout, /\/admin\/operator-guide/);
  assert.match(dashboard, /\/admin\/operator-guide/);

  const publicSurfaces = [
    'frontend/src/components/layout/Header.tsx',
    'frontend/src/components/layout/Footer.tsx',
    'frontend/src/pages/MainPage.tsx',
    'frontend/src/pages/AboutDataPage.tsx',
  ]
    .map(read)
    .join('\n');

  assert.equal(publicSurfaces.includes('/admin/operator-guide'), false);
  assert.equal(publicSurfaces.includes('운영 가이드'), false);
});

test('public about-data FAQ exists without internal runbook details', () => {
  const aboutData = read('frontend/src/pages/AboutDataPage.tsx');

  assert.match(aboutData, /정정·비노출은 어떻게 요청하나요\?/);
  assert.match(aboutData, /공식 기록 서비스인가요\?/);
  assert.match(aboutData, /내부 운영 기준은 왜 모두 공개하지 않나요\?/);
  assert.match(aboutData, /\/data-request/);

  assertNotIncludes(
    aboutData,
    [
      '법적 통지',
      '보안 사고 등급',
      '공격 대응',
      '관리자 계정',
      '증거 보존 체크리스트',
      '침해 의심',
      'source_legal_complaint',
      'breach_suspicion',
    ],
    'public about-data FAQ',
  );
});

test('frontend source does not embed internal operator scenario content', () => {
  const frontendFiles = [];
  const queue = [path.join(ROOT, 'frontend/src')];

  while (queue.length > 0) {
    const current = queue.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolute);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        frontendFiles.push(absolute);
      }
    }
  }

  const source = frontendFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  assertNotIncludes(
    source,
    [
      'athlete_guardian_request',
      'same_name_identity_complaint',
      'full_deletion_demand',
      'source_owner_complaint',
      'legal_notice',
      'media_inquiry',
      'community_harassment',
      'security_abuse',
      'source_legal_complaint',
      'breach_suspicion',
      '보안 사고 등급',
      '증거 보존 체크리스트',
      '관리자 계정 이상',
    ],
    'frontend source bundle input',
  );
});
