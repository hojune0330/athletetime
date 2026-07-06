const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const PORT = String(5200 + Math.floor(Math.random() * 500));
const BASE_URL = `http://127.0.0.1:${PORT}`;

let serverProcess;

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function request(method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${BASE_URL}${requestPath}`,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: raw.length > 0 ? JSON.parse(raw) : null,
          });
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForHealth() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    try {
      const response = await request('GET', '/health');
      if (response.status === 200) return;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('server did not become healthy');
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-athlete-user-ux',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForHealth();
});

test.after(async () => {
  if (!serverProcess || serverProcess.killed) return;

  serverProcess.kill('SIGINT');
  await new Promise((resolve) => {
    serverProcess.once('exit', resolve);
    setTimeout(resolve, 3000);
  });
});

test('home page sends users to their own record search instead of a sample showcase', () => {
  const source = readSource('frontend/src/pages/MainPage.tsx');

  assert.equal(source.includes('AthleteInsightShowcase'), false);
  assert.equal(source.includes('#record-insight'), false);
  assert.equal(source.includes('예시'), false);
  assert.match(source, /내 이름으로 기록 찾기[\s\S]*자기 이름/);
});

test('fake card-news sample data is not kept as a default user path', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'data', 'sample.json')), false);

  const sources = [
    'package.json',
    'src/config.js',
    'src/generate.js',
    'src/pipeline.js',
    'src/services/pipelineService.js',
    'card-studio/config.js',
    'card-studio/generate.js',
    'card-studio/pipeline.js',
    'card-studio/services/pipelineService.js',
    'dashboard/index.html',
    'dashboard/js/controlPanel.js',
  ].map(readSource).join('\n');

  assert.equal(sources.includes('sampleData'), false);
  assert.equal(sources.includes('data/sample.json'), false);
  assert.equal(sources.includes('value="sample"'), false);
});

test('records search gives same-name candidates practical narrowing controls', () => {
  const source = [
    readSource('frontend/src/pages/RecordsPage.tsx'),
    readSource('frontend/src/components/records/RecordSearchResults.tsx'),
  ].join('\n');

  assert.match(source, /후보를 좁혀보세요/);
  assert.match(source, /종목으로 좁히기/);
  assert.match(source, /소속으로 좁히기/);
  assert.match(source, /이 기록 보기/);
});

test('records candidate count is written for Korean athletes instead of debug English', () => {
  const source = readSource('frontend/src/components/records/RecordSearchResults.tsx');

  assert.match(source, /후보 \{filteredAthletes\.length\}\/\{athletes\.length\}명/);
  assert.doesNotMatch(source, /shown/);
});

test('records athlete selection creates a shareable records URL instead of state-only detail', () => {
  const source = readSource('frontend/src/pages/RecordsPage.tsx');

  assert.match(source, /searchParams\.get\('athlete'\)/);
  assert.match(source, /next\.set\('athlete', athleteKey\)/);
  assert.doesNotMatch(source, /mode === 'athlete' && \(profile \|\| profileState !== 'idle' \|\| submittedQuery\.trim\(\)\.length >= 2\)/);
});

test('records athlete detail exposes a plain link share action without official wording', () => {
  const source = readSource('frontend/src/pages/RecordsPage.tsx');

  assert.match(source, /기록 링크 공유/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /공유 링크를 복사하는 중이에요/);
  assert.match(source, /window\.setTimeout\(\(\) => \{\s*void navigator\.clipboard\.writeText/);
  assert.match(source, /공유 링크를 복사했어요/);
  assert.match(source, /공식 기록 서비스는 아니에요/);
  assert.match(source, /shareLinkMessage && \(/);
  assert.match(source, /틀렸거나 빼고 싶다면 이 화면에서 정정·비노출을 요청할 수 있어요/);
  assert.doesNotMatch(source, /<p>\{TRUST_NOTICE\.partial\}<\/p>\s*<p>틀렸거나 빼고 싶다면 정정·비노출을 요청할 수 있어요\.<\/p>/);
  assert.doesNotMatch(source, /내 기록 인증|공식 기록 인증|공식 기록 링크/);
});

test('record share card gives a community follow-up without pretending it writes a post', () => {
  const source = readSource('frontend/src/components/record-insights/ShareCard.tsx');

  assert.match(source, /커뮤니티에서 이야기하기/);
  assert.match(source, /to=\{`\/community\?record=\$\{encodeURIComponent\(athlete\.name\)\}`\}/);
  assert.doesNotMatch(source, /자동 작성|게시글 작성 완료|공식 인증/);
});

test('records shared athlete detail keeps identity and coverage safeguards visible', () => {
  const source = [
    readSource('frontend/src/pages/RecordsPage.tsx'),
    readSource('frontend/src/config/dataPolicy.ts'),
  ].join('\n');

  assert.match(source, /같은 이름의 다른 선수일 수 있어요/);
  assert.match(source, /소속·연도를 함께 확인하세요/);
  assert.match(source, /모든 대회를 담고 있지 않아요/);
  assert.match(source, /빠진 기록이 있을 수 있어요/);
  assert.match(source, /정정·비노출을 요청할 수 있어요/);
  assert.equal(source.includes('to={`/data-request?athlete=${encodeURIComponent(athlete.name)}`}'), true);
  assert.doesNotMatch(source, /확정된 선수|공식 인증|전국 모든 기록|완벽한 기록/);
});

test('records shared athlete detail does not use non-exposure jargon as a standalone action label', () => {
  const source = readSource('frontend/src/pages/RecordsPage.tsx');

  assert.match(source, /기록 고치거나 숨기기/);
  assert.match(source, /틀렸거나 빼고 싶다면 이 화면에서 정정·비노출을 요청할 수 있어요/);
  assert.doesNotMatch(source, /<Button variant="outline">정정·비노출 요청<\/Button>/);
});

test('records broken athlete share links guide users back to search candidates', () => {
  const source = readSource('frontend/src/pages/RecordsPage.tsx');

  assert.match(source, /isSharedLinkFallback/);
  assert.match(source, /링크의 선수를 못 찾았어요/);
  assert.match(source, /검색 결과에서 다시 선택해 주세요/);
  assert.match(source, /검색 결과 보기/);
});

test('records shared athlete URL prioritizes the athlete panel before candidate lists', () => {
  const source = readSource('frontend/src/pages/RecordsPage.tsx');

  assert.match(source, /const shouldPrioritizeAthletePanel = shouldShowAthletePanel && Boolean\(selectedAthleteParam\)/);
  assert.ok(source.indexOf('shouldPrioritizeAthletePanel && (') < source.indexOf('athletes.length > 0 && ('));
  assert.match(source, /shouldShowAthletePanel && !shouldPrioritizeAthletePanel && \(/);
});

test('competition results tab opens the latest available result instead of a blank selector', () => {
  const source = readSource('frontend/src/components/competitions/tabs/ResultsTab.tsx');

  assert.match(source, /const latestResultCompetition = res\.data\[0\]/);
  assert.match(source, /setSelectedComp\(latestResultCompetition\.filename\)/);
  assert.match(source, /setSelectedYear\(latestResultCompetition\.year \|\| ''\)/);
});

test('competition results tab explains current-first ordering without ranking language', () => {
  const source = readSource('frontend/src/components/competitions/tabs/ResultsTab.tsx');

  assert.match(source, /최신 회차 먼저/);
  assert.match(source, /대회는 직접 바꿀 수 있어요/);
  assert.doesNotMatch(source, /최근 결과부터 보여드려요|실시간|최신 보장|공식 결과 순위|전국 전체 랭킹|실시간 공식/);
});

test('competition results tab surfaces provenance as a first-class trust summary', () => {
  const page = readSource('frontend/src/components/competitions/tabs/ResultsTab.tsx');
  const summary = readSource('frontend/src/components/competitions/ResultSourceSummary.tsx');

  assert.match(page, /ResultSourceSummary/);
  assert.match(summary, /자료가 어디서 왔나요/);
  assert.match(summary, /TRUST_NOTICE\.collectedPublic/);
  assert.match(summary, /TRUST_NOTICE\.partial/);
  assert.match(summary, /TRUST_NOTICE\.snapshot/);
  assert.match(summary, /resolveProviderLabel/);
  assert.match(summary, /AthleteTime 정리/);
  assert.match(summary, /출처 확인/);
  assert.doesNotMatch(summary, /공식 인증|공식 랭킹|실시간 공식|전국 모든 기록|완벽한 기록/);
});

test('competition search keeps dense result scope compact and repeats same-name caution', () => {
  const source = readSource('frontend/src/components/competitions/tabs/SearchTab.tsx');

  assert.match(source, /formatCompetitionScope/);
  assert.match(source, /외 \$\{hiddenCount\}개 대회/);
  assert.match(source, /같은 이름의 다른 선수일 수 있어요/);
  assert.match(source, /소속·대회·연도를 함께 확인하세요/);
  assert.doesNotMatch(source, /searchResult\.competitions\.join\(', '\)/);
});

test('competition results route blocks direct access to public-index-excluded files', () => {
  const source = readSource('card-studio/routes/publicRoutes.js');

  assert.match(source, /resultsStore\.isPublicResultFilename\(filename\)/);
  assert.match(source, /status\(404\)/);
});

test('competition mobile rows prioritize record value over decorative metadata', () => {
  const results = readSource('frontend/src/components/competitions/tabs/ResultEventAccordion.tsx');
  const search = readSource('frontend/src/components/competitions/tabs/SearchResultSection.tsx');
  const shared = readSource('frontend/src/components/competitions/tabs/shared.tsx');

  assert.match(results, /grid-cols-\[2rem_minmax\(0,1fr\)_auto\]/);
  assert.match(results, /text-base font-mono font-black/);
  assert.match(search, /grid-cols-\[2rem_minmax\(0,1fr\)_auto\]/);
  assert.match(search, /text-base font-mono font-black/);
  assert.doesNotMatch(results, /💨|📅|🏃|🤸|🏃‍♂️/);
  assert.doesNotMatch(search, /💨|📅|🏃|🤸|🏃‍♂️/);
  assert.doesNotMatch(shared, /emoji: '🏃'|emoji: '🤸'|emoji: '🏃‍♂️'|🏃 트랙|🤸 필드|🏃‍♂️ 도로/);
});

test('competition event and gender badges stay neutral instead of implying status', () => {
  const results = readSource('frontend/src/components/competitions/tabs/ResultEventAccordion.tsx');
  const shared = readSource('frontend/src/components/competitions/tabs/shared.tsx');
  const eventTypeInfo = shared.slice(
    shared.indexOf('const EVENT_TYPE_INFO'),
    shared.indexOf('export const EVENT_TYPE_FILTERS'),
  );

  assert.match(shared, /track: \{ bg: 'bg-neutral-100', text: 'text-neutral-700', label: '트랙' \}/);
  assert.match(shared, /field: \{ bg: 'bg-neutral-100', text: 'text-neutral-700', label: '필드' \}/);
  assert.match(shared, /marathon: \{ bg: 'bg-neutral-100', text: 'text-neutral-700', label: '마라톤\/도로' \}/);
  assert.doesNotMatch(eventTypeInfo, /bg-red-50|text-red-700|bg-green-50|text-green-700|bg-teal-50|text-teal-700/);
  assert.doesNotMatch(results, /bg-blue-50|text-blue-700|bg-pink-50|text-pink-700|bg-purple-50|text-purple-700/);
});

test('competition card links keep intentional discovery policy and accessible labels', () => {
  const shared = readSource('frontend/src/components/competitions/tabs/shared.tsx');
  const results = readSource('frontend/src/components/competitions/tabs/ResultEventAccordion.tsx');
  const search = readSource('frontend/src/components/competitions/tabs/SearchResultSection.tsx');

  assert.match(shared, /getProfileCardPath/);
  assert.match(shared, /PROFILE_CARD_NAME_PATTERN/);
  assert.match(results, /const profileCardPath = getProfileCardPath\(result\.name\)/);
  assert.match(search, /const profileCardPath = getProfileCardPath\(result\.name\)/);
  assert.match(results, /aria-label=\{getProfileCardLabel\(result\.name\)\}/);
  assert.match(search, /aria-label=\{getProfileCardLabel\(result\.name\)\}/);
  assert.match(search, /result\.isMatch && profileCardPath/);
  assert.doesNotMatch(results, /profile-card\?name=\$\{encodeURIComponent\(result\.name\)\}/);
  assert.doesNotMatch(search, /profile-card\?name=\$\{encodeURIComponent\(result\.name \|\| ''\)\}/);
});

test('profile card page carries selected athlete name into the builder handoff', () => {
  const source = readSource('frontend/src/pages/ProfileCardPage.tsx');

  assert.match(source, /useSearchParams/);
  assert.match(source, /const selectedName = \(searchParams\.get\('name'\) \|\| ''\)\.trim\(\)/);
  assert.match(source, /buildBuilderSrc/);
  assert.match(source, /new URLSearchParams\(\{ name: selectedName \}\)/);
  assert.match(source, /<BuilderView mode=\{mode\} selectedName=\{selectedName\}/);
  assert.match(source, /records\?q=\$\{encodeURIComponent\(selectedName\)\}/);
});

test('community page avoids unimplemented optional widgets in the main anonymous journey', () => {
  const source = readSource('frontend/src/pages/CommunityPage.tsx');

  assert.equal(source.includes('TrendPulse'), false);
  assert.equal(source.includes('FlashPollSection'), false);
  assert.match(source, /기록 이야기부터 가볍게/);
});

test('marketplace and pace calculator have real first-use empty states', () => {
  const marketplace = readSource('frontend/src/pages/MarketplacePage.tsx');
  const pace = readSource('frontend/src/pages/PaceCalculatorPage/index.tsx');

  assert.match(marketplace, /찾는 장비를 먼저 남겨보세요/);
  assert.match(marketplace, /스파이크/);
  assert.match(pace, /오늘 필요한 계산부터/);
  assert.match(pace, /목표 기록 넣기/);
});

test('optional trend APIs return graceful empty data while features are not ready', async () => {
  const topics = await request('GET', '/api/trending/topics?limit=8');
  const flashPolls = await request('GET', '/api/flash-polls');
  const hotRecords = await request('GET', '/api/trending/hot-records?limit=6');
  const feed = await request('GET', '/api/feed/shortform?limit=10');

  assert.equal(topics.status, 200);
  assert.deepEqual(topics.body.topics, []);
  assert.equal(flashPolls.status, 200);
  assert.deepEqual(flashPolls.body.polls, []);
  assert.equal(hotRecords.status, 200);
  assert.deepEqual(hotRecords.body.records, []);
  assert.equal(feed.status, 200);
  assert.deepEqual(feed.body.items, []);
});
