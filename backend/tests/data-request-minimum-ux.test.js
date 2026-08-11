const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const page = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'DataRequestPage.tsx'), 'utf8');

test('DATA-REQUEST-MINIMUM-UX Given a correction link When the request form opens Then its explicit correction intent is retained', () => {
  assert.match(page, /useSearchParams/);
  assert.match(page, /resolveDataRequestType\(searchParams\.get\('type'\)\)/);
  assert.match(page, /resolvePrefilledAthleteName\(searchParams\.get\('athlete'\)\)/);
  assert.doesNotMatch(page, /useState<DataRequestType>\('deletion'\)/);
});

test('DATA-REQUEST-MINIMUM-UX Given a person describes a request When entering a reason Then the privacy guidance is tied to that input', () => {
  assert.match(page, /aria-describedby="request-sensitive-guidance"/);
  assert.match(page, /id="request-sensitive-guidance"/);
  assert.match(page, /요청 사유에는 주민등록번호·전화번호·이메일을 적을 수 없어요/);
  assert.match(page, /아래 연락처 칸에만 적어 주세요/);
});

test('DATA-REQUEST-MINIMUM-UX Given a public athlete detail When asking to correct a record Then it sends the correction intent explicitly', () => {
  const athletePage = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'AthleteDetailPage.tsx'), 'utf8');
  assert.match(athletePage, /type:\s*'correction'/);
});
