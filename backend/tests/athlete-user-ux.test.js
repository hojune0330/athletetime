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

test('home page sends users to public record search instead of a sample showcase', () => {
  const source = readSource('frontend/src/pages/MainPage.tsx');

  assert.equal(source.includes('AthleteInsightShowcase'), false);
  assert.equal(source.includes('#record-insight'), false);
  assert.equal(source.includes('예시'), false);
  assert.match(source, /내 기록, 이름만 알면 찾아요/);
  assert.match(source, /동명이인이면 소속을 보고 직접 고를 수 있어요/);
  assert.match(source, /이름 또는 소속\(학교·팀\)을 입력하세요/);
});

test('home only advertises destinations that are available at launch', () => {
  const source = readSource('frontend/src/pages/MainPage.tsx');

  assert.doesNotMatch(source, /자유롭게 올릴 수 있어요|커뮤니티 보기/);
  assert.doesNotMatch(source, /to: '\/community'|to="\/community"/);
  assert.match(source, /자료 수집 방식/);
  assert.match(source, /to: '\/about-data'|to="\/about-data"/);
});

test('shared layouts give keyboard users one main destination without nesting landmarks', () => {
  const layout = readSource('frontend/src/components/layout/Layout.tsx');
  const home = readSource('frontend/src/pages/MainPage.tsx');

  assert.equal((layout.match(/href=\"#main-content\"/g) || []).length, 2);
  assert.equal((layout.match(/<main id=\"main-content\">/g) || []).length, 2);
  assert.doesNotMatch(home, /<main\b/);
});

test('home and footer keep launch navigation and record language truthful', () => {
  const home = readSource('frontend/src/pages/MainPage.tsx');
  const footer = readSource('frontend/src/components/layout/Footer.tsx');

  assert.match(home, /공개 경기 기록을 이름으로 찾는 곳/);
  assert.doesNotMatch(home, /공식 순위|전국 랭킹/);
  assert.doesNotMatch(footer, /to: '\/community'|label: '커뮤니티'/);
  assert.match(footer, /자료 수집 방식/);
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
    readSource('frontend/src/components/records/RecordSearchFilterChips.tsx'),
    readSource('frontend/src/components/records/RecordSearchResultCard.tsx'),
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

test('records collection candidates expose an unselected control and reveal a check only after explicit selection', () => {
  const source = readSource('frontend/src/components/records/RecordsMineCandidateStep.tsx');

  assert.match(source, /selected=\{selectedKeys\.includes\(athlete\.athleteKey\)\}/);
  assert.match(source, /aria-pressed=\{selected\}/);
  const indicators = source.match(
    /\{selected \? \(\s*([\s\S]*?)\s*\) : \(\s*([\s\S]*?)\s*\)\s*\}\s*<\/button>/,
  );
  assert.ok(indicators, 'candidate control must render distinct selected and unselected indicators');
  const [, selectedIndicator, unselectedIndicator] = indicators;
  assert.match(selectedIndicator, /✓/);
  assert.match(selectedIndicator, /aria-hidden/);
  assert.match(unselectedIndicator, /aria-hidden/);
  assert.doesNotMatch(unselectedIndicator, /✓|aria-label=|aria-pressed=|role=/);
  assert.doesNotMatch(source, /text-transparent/);
});

test('records collection completion labels the existing athlete detail destination honestly', () => {
  const source = readSource('frontend/src/components/records/RecordsMineDoneStep.tsx');

  assert.match(source, />기록 보기</);
  assert.match(source, /\/records\/athletes\//);
  assert.doesNotMatch(source, /\/records\?athlete=/);
  assert.doesNotMatch(source, /기록 카드 공유/);
});

test('record collection calls its selected unit an athlete, not an owned record', () => {
  const source = [
    'frontend/src/components/records/RecordSearchResults.tsx',
    'frontend/src/components/records/RecordSearchResultCard.tsx',
    'frontend/src/components/records/RecordsMineConfirmStep.tsx',
    'frontend/src/components/record-insights/EstimatedSameAthleteCard.tsx',
    'frontend/src/components/record-insights/MyRecordsCard.tsx',
    'frontend/src/pages/RecordsPage.tsx',
  ].map(readSource).join('\n');

  assert.match(source, /이 선수 담기/);
  assert.match(source, /선택한 선수 담기/);
  assert.match(source, /기록 모음/);
  assert.doesNotMatch(source, /이 기록 담기|선택한 기록 담기|내가 모아 보는 기록/);
});

test('legacy collection entry copy still avoids claiming a visitor owns a public record', () => {
  const source = [
    'frontend/src/components/records/RecordsHub.tsx',
    'frontend/src/features/record-workspace/components/RecordContextBadge.tsx',
  ].map(readSource).join('\n');

  assert.match(source, /찾는 선수 기록을 이름과 소속으로 확인한 뒤/);
  assert.match(source, /이 기기에서 선택한 선수 후보/);
  assert.doesNotMatch(source, /내 기록이든|이 기기에서 선택한 기록/);
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

test('record share card is not exposed while the sharing policy is disabled', () => {
  const source = readSource('frontend/src/components/record-insights/ShareCard.tsx');
  const policy = readSource('frontend/src/config/dataPolicy.ts');

  assert.match(policy, /status: 'disabled'/);
  assert.match(source, /커뮤니티에서 이야기하기/);
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

test('records coverage notice does not imply continuous year coverage', () => {
  const source = readSource('frontend/src/pages/RecordsPage.tsx');

  assert.match(source, /자료가 있는 대회 기록만 보여드려요/);
  assert.match(source, /연도와 대회별로 빠진 기록이 있을 수 있어요/);
  assert.doesNotMatch(source, /2015-2017 일부 기록과 2018년 이후 기록/);
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
  assert.match(source, /shouldShowRecordsSurface && !isTeamBrowse && mode === 'athlete' && athletes\.length > 0 && !selectedAthleteParam && \(/);
  assert.ok(source.indexOf('shouldPrioritizeAthletePanel && (') < source.indexOf('<RecordCandidatesSurface'));
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
  const source = readSource('card-studio/routes/publicRoutes.js') + readSource('card-studio/routes/resultEventsRoute.js');

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

test('profile card studio carries selected athlete name into the editor prefill', () => {
  const source = readSource('frontend/src/pages/ProfileCardStudio/index.tsx');

  assert.match(source, /useSearchParams/);
  assert.match(source, /const initialName = \(searchParams\.get\('name'\) \|\| ''\)\.trim\(\)/);
  assert.match(source, /createEmptyCard\(initialName\)/);
});

test('community page gives a clear prepared state instead of offering anonymous publishing', () => {
  const source = readSource('frontend/src/pages/CommunityPage.tsx');

  assert.match(source, /FeaturePreparingPage/);
  assert.match(source, /커뮤니티는 준비 중이에요/);
  assert.doesNotMatch(source, /CommunityQuickPostForm|usePosts|글쓰기/);
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
