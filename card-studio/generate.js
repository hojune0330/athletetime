#!/usr/bin/env node

/**
 * 카드뉴스 생성 메인 스크립트
 *
 * JSON 데이터를 읽어 카드뉴스 이미지(PNG)를 생성합니다.
 *
 * 사용법:
 *   node src/generate.js --input data/normalized/result.json # 단일 파일
 *   node src/generate.js --input data/normalized/           # 디렉토리 내 전체 처리
 *   node src/generate.js --output output/                   # 출력 경로 지정
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { buildHtml } = require('./templateEngine');
const { captureScreenshot, closeBrowser } = require('./screenshot');

// ============================================
// CLI 인자 파싱
// ============================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    input: null,
    output: config.dirs.output,
    width: config.cardNews.width,
    height: config.cardNews.height,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input': case '-i':
        opts.input = args[++i];
        break;
      case '--output': case '-o':
        opts.output = args[++i];
        break;
      case '--width': case '-w':
        opts.width = parseInt(args[++i], 10);
        break;
      case '--height':
        opts.height = parseInt(args[++i], 10);
        break;
      case '--help':
        console.log(`
사용법: node src/generate.js [옵션]

옵션:
  --input, -i    입력 JSON 파일 또는 디렉토리 (필수)
  --output, -o   출력 디렉토리 (기본: output/)
  --width, -w    이미지 너비 (기본: 1080)
  --height       이미지 높이 (기본: 1080)
  --help         도움말
        `);
        process.exit(0);
    }
  }

  return opts;
}

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
 * JSON 데이터에서 이벤트 목록을 추출합니다.
 * - { events: [...] } 형태: 다중 이벤트
 * - { competition, event, results } 형태: 단일 이벤트
 */
function extractEvents(data) {
  if (Array.isArray(data.events)) {
    return data.events;
  }
  return [data];
}

/**
 * 파일명 충돌 방지: 동일 파일명이 존재하면 _2, _3 ... 을 붙입니다.
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
 * 단일 이벤트 데이터 → 카드뉴스 PNG 1장 생성
 */
async function generateSingleEvent(eventData, outputDir, options = {}) {
  console.log(`   🎨 ${eventData.competition} - ${eventData.event} (${(eventData.results || []).length}명)`);

  const html = buildHtml(eventData);
  const filename = generateOutputFilename(eventData);
  const outputPath = getUniqueOutputPath(outputDir, filename);

  await captureScreenshot(html, outputPath, {
    width: options.width,
    height: options.height,
  });

  return outputPath;
}

/**
 * JSON 파일로부터 카드뉴스를 생성합니다.
 * 단일 이벤트 또는 다중 이벤트(events 배열) 모두 지원합니다.
 */
async function generateFromFile(inputPath, outputDir, options = {}) {
  console.log(`📂 입력: ${inputPath}`);

  const rawJson = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(rawJson);
  const events = extractEvents(data);

  console.log(`   📋 ${events.length}개 이벤트 발견\n`);

  const generatedPaths = [];
  for (const eventData of events) {
    try {
      const result = await generateSingleEvent(eventData, outputDir, options);
      generatedPaths.push(result);
    } catch (error) {
      console.error(`   ❌ 실패 (${eventData.event || '알 수 없음'}): ${error.message}`);
    }
  }

  return generatedPaths;
}

// ============================================
// 메인 실행
// ============================================

async function main() {
  console.log('');
  console.log('🏃 육상 카드뉴스 생성');
  console.log('');

  const opts = parseArgs();
  if (!opts.input) {
    console.error('❌ 실제 입력 JSON 파일 또는 디렉토리를 --input으로 지정해 주세요.');
    process.exit(1);
  }

  const inputPath = path.resolve(opts.input);
  const outputDir = path.resolve(opts.output);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 입력을 찾을 수 없습니다: ${inputPath}`);
    process.exit(1);
  }

  const stat = fs.statSync(inputPath);
  const generatedFiles = [];

  if (stat.isDirectory()) {
    // 디렉토리: 내부 .json 파일 전체 처리
    const jsonFiles = fs.readdirSync(inputPath).filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.log(`ℹ️  ${inputPath} 에 JSON 파일이 없습니다.`);
      process.exit(0);
    }

    console.log(`📂 ${jsonFiles.length}개 파일 처리\n`);

    for (const file of jsonFiles) {
      try {
        const results = await generateFromFile(path.join(inputPath, file), outputDir, opts);
        generatedFiles.push(...results);
      } catch (error) {
        console.error(`❌ 실패 (${file}): ${error.message}`);
      }
      console.log('');
    }
  } else {
    // 단일 파일 (단일 또는 다중 이벤트)
    const results = await generateFromFile(inputPath, outputDir, opts);
    generatedFiles.push(...results);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`🎉 ${generatedFiles.length}개 카드뉴스 생성 완료!`);
  for (const f of generatedFiles) {
    console.log(`   📁 ${f}`);
  }
  console.log('═══════════════════════════════════════════════');

  // 공유 브라우저 정리
  await closeBrowser();
}

main().catch(error => {
  console.error(`💥 오류: ${error.message}`);
  process.exit(1);
});
