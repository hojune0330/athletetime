#!/usr/bin/env node

/**
 * 파이프라인 오케스트레이터
 *
 * 전체 흐름을 한 명령어로 실행합니다.
 *
 * 모드 1 - 로컬 JSON으로 카드뉴스 생성:
 *   node src/pipeline.js --input data/normalized/result.json
 *   node src/pipeline.js --input data/normalized/
 *
 * 모드 2 - URL 스크래핑 → 정규화 → 카드뉴스 생성:
 *   node src/pipeline.js --url "http://result.kaaf.or.kr/..."
 *
 * 모드 3 - data/raw/ 일괄 정규화 → 카드뉴스 생성:
 *   node src/pipeline.js --process-all
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { scrapeResults, saveResults } = require('./scraper');
const { normalizeData, processFile, processAll } = require('./normalizer');
const { buildHtml } = require('./templateEngine');
const { captureScreenshot, closeBrowser } = require('./screenshot');

/**
 * 출력 파일명 생성
 */
function generateOutputFilename(data) {
  const date = (data.date || 'unknown').replace(/\//g, '-');
  const event = (data.event || 'unknown').replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_');
  const competition = (data.competition || 'unknown').replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_');
  return `${date}_${event}_${competition}.png`;
}

/**
 * 파일명 충돌 방지
 */
function getUniqueOutputPath(outputDir, filename) {
  let candidate = path.join(outputDir, filename);
  if (!fs.existsSync(candidate)) return candidate;

  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let counter = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(outputDir, `${base}_${counter}${ext}`);
    counter++;
  }
  return candidate;
}

/**
 * JSON 데이터에서 이벤트 목록 추출
 */
function extractEvents(data) {
  if (Array.isArray(data.events)) return data.events;
  return [data];
}

/**
 * 단일 이벤트 데이터 → 카드뉴스 PNG 생성
 */
async function generateCardNews(data, outputDir) {
  const html = buildHtml(data);
  const filename = generateOutputFilename(data);
  const outputPath = getUniqueOutputPath(outputDir, filename);

  await captureScreenshot(html, outputPath);
  return outputPath;
}

// ============================================
// 파이프라인 모드별 실행
// ============================================

/**
 * 모드 1: 로컬 JSON 파일/디렉토리에서 카드뉴스 생성
 */
async function pipelineFromInput(inputPath, outputDir) {
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    console.error(`❌ 입력을 찾을 수 없습니다: ${resolved}`);
    process.exit(1);
  }

  const stat = fs.statSync(resolved);
  const results = [];

  if (stat.isDirectory()) {
    const files = fs.readdirSync(resolved).filter(f => f.endsWith('.json'));
    console.log(`📂 ${files.length}개 JSON 파일 처리\n`);

    for (const file of files) {
      try {
        const rawData = JSON.parse(fs.readFileSync(path.join(resolved, file), 'utf-8'));
        const events = extractEvents(rawData);
        for (const eventData of events) {
          console.log(`🎨 ${eventData.competition} - ${eventData.event}`);
          const output = await generateCardNews(eventData, outputDir);
          results.push(output);
        }
      } catch (error) {
        console.error(`❌ 실패 (${file}): ${error.message}`);
      }
    }
  } else {
    const rawData = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    const events = extractEvents(rawData);
    for (const eventData of events) {
      console.log(`🎨 ${eventData.competition} - ${eventData.event}`);
      const output = await generateCardNews(eventData, outputDir);
      results.push(output);
    }
  }

  return results;
}

/**
 * 모드 2: URL → 스크래핑 → 정규화 → 카드뉴스 생성
 *
 * scrapeResults 반환값: { meta, events: [...] }
 * 각 event는 { competition, event, date, venue, wind, results } 형태
 */
async function pipelineFromUrl(url, outputDir, scraperOptions = {}) {
  // 1. 스크래핑
  console.log('📡 [1/3] 데이터 수집 중...\n');
  const scraped = await scrapeResults(url, scraperOptions);

  // 스크래핑 결과 저장 (raw JSON)
  if (scraped.events && scraped.events.length > 0) {
    const rawPath = saveResults(scraped);
    console.log(`   💾 Raw 데이터: ${rawPath}`);
  }

  const events = scraped.events || [];
  if (events.length === 0) {
    console.log('⚠️  추출된 데이터가 없습니다.');
    return [];
  }

  console.log(`   📋 ${events.length}개 종목 수집 완료\n`);

  // 2. 정규화
  console.log('📊 [2/3] 데이터 정규화 중...\n');
  const normalizedList = events.map(raw => normalizeData(raw));

  // 3. 카드뉴스 생성
  console.log('\n🎨 [3/3] 카드뉴스 생성 중...\n');
  const results = [];
  for (const data of normalizedList) {
    try {
      console.log(`   ${data.competition} - ${data.event}`);
      const output = await generateCardNews(data, outputDir);
      results.push(output);
    } catch (error) {
      console.error(`   ❌ 실패: ${error.message}`);
    }
  }

  return results;
}

/**
 * 모드 3: data/raw/ 일괄 정규화 → 카드뉴스 생성
 * raw JSON이 { meta, events } 구조를 지원합니다.
 */
async function pipelineProcessAll(outputDir) {
  // 1. raw 파일 탐색
  console.log('📊 [1/2] raw 데이터 정규화 중...\n');

  const rawDir = config.dirs.raw;
  if (!fs.existsSync(rawDir)) {
    console.log('ℹ️  data/raw/ 디렉토리가 없습니다.');
    return [];
  }

  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('ℹ️  처리할 데이터가 없습니다.');
    return [];
  }

  // 2. 각 raw 파일에서 이벤트 추출 → 정규화 → 카드뉴스
  console.log(`📂 ${files.length}개 raw 파일 처리\n`);

  const results = [];
  for (const file of files) {
    try {
      const filePath = path.join(rawDir, file);
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // { meta, events } 구조 또는 단일 이벤트 모두 지원
      const events = rawData.events || [rawData];
      console.log(`   📄 ${file}: ${events.length}개 이벤트`);

      for (const event of events) {
        try {
          const normalized = normalizeData(event);
          console.log(`      🎨 ${normalized.competition} - ${normalized.event}`);
          const output = await generateCardNews(normalized, outputDir);
          results.push(output);
        } catch (error) {
          console.error(`      ❌ 실패: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`   ❌ 파일 처리 실패 (${file}): ${error.message}`);
    }
  }

  return results;
}

// ============================================
// CLI
// ============================================

async function main() {
  const args = process.argv.slice(2);
  let url = null;
  let input = null;
  let processAllMode = false;
  let outputDir = config.dirs.output;
  let maxEvents = 0;
  let finalsOnly = true;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': case '-u':
        url = args[++i];
        break;
      case '--input': case '-i':
        input = args[++i];
        break;
      case '--output': case '-o':
        outputDir = args[++i];
        break;
      case '--process-all':
        processAllMode = true;
        break;
      case '--max':
        maxEvents = parseInt(args[++i], 10) || 0;
        break;
      case '--all':
        finalsOnly = false;
        break;
      case '--finals-only':
        finalsOnly = true;
        break;
      case '--help':
        console.log(`
사용법: node src/pipeline.js [모드] [옵션]

모드:
  --input, -i      JSON 파일 또는 디렉토리에서 카드뉴스 생성
  --url, -u        URL 스크래핑 → 정규화 → 카드뉴스 생성
  --process-all    data/raw/ 일괄 정규화 → 카드뉴스 생성

옵션:
  --output, -o     출력 디렉토리 (기본: output/)
  --max N          URL 모드: 최대 N개 종목만 수집 (기본: 전체)
  --finals-only    URL 모드: 결승만 수집 (기본)
  --all            URL 모드: 전체 라운드 수집
  --help           도움말

예시:
  node src/pipeline.js --input data/normalized/result.json
  node src/pipeline.js --input data/normalized/
  node src/pipeline.js --url "http://result.kaaf.or.kr/..." --max 5
  node src/pipeline.js --process-all
        `);
        process.exit(0);
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🏃 육상 카드뉴스 파이프라인             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  const resolvedOutput = path.resolve(outputDir);
  let results = [];

  if (url) {
    results = await pipelineFromUrl(url, resolvedOutput, { maxEvents, finalsOnly });
  } else if (processAllMode) {
    results = await pipelineProcessAll(resolvedOutput);
  } else if (input) {
    results = await pipelineFromInput(input, resolvedOutput);
  } else {
    console.error('❌ 실제 입력을 지정해 주세요: --input, --url, 또는 --process-all');
    process.exit(1);
  }

  // 공유 브라우저 정리
  await closeBrowser();

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`🎉 ${results.length}개 카드뉴스 생성 완료!`);
  for (const f of results) {
    console.log(`   📁 ${f}`);
  }
  console.log('═══════════════════════════════════════════════');
}

main().catch(error => {
  console.error(`💥 파이프라인 오류: ${error.message}`);
  process.exit(1);
});
