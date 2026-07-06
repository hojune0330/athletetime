#!/usr/bin/env node

/**
 * KAAF 경기결과 스크래퍼 (실전 구현 v2)
 *
 * result.kaaf.or.kr에서 결승 결과 데이터를 자동으로 수집합니다.
 * Puppeteer로 동적 렌더링 페이지를 파싱하고 form submit을 통해 결과를 추출합니다.
 *
 * 동작 방식:
 *   1. 종목 목록 페이지 (resultInfo.do) 로드
 *   2. 결승(round=4)인 종목만 필터링
 *   3. 각 종목별 go_result() form submit → 결과 페이지 파싱
 *   4. 표준 JSON으로 변환 후 data/raw/에 저장
 *
 * 사용법 (CLI):
 *   node src/scraper.js --url "http://result.kaaf.or.kr/tourInfo/resultInfo.do?..."
 *   node src/scraper.js --url "http://..." --finals-only  # 결승만 (기본)
 *   node src/scraper.js --url "http://..." --all           # 전체 라운드
 *   node src/scraper.js --url "http://..." --max 3         # 최대 3개 종목
 *
 * 사용법 (모듈):
 *   const { scrapeResults } = require('./scraper');
 *   const data = await scrapeResults(url);
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const selectors = require('./selectors.json');
const { assertCollectionUrlAllowed } = require('../lib/crawlPolicy');

// ============================================
// 유틸리티
// ============================================

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/** 종별코드(kind_cd) → 한국어 성별 라벨 */
function genderLabel(kindCd) {
  return selectors['종별코드'][kindCd] || kindCd;
}

/** 라운드코드 → 한국어 */
function roundLabel(roundCd) {
  return selectors['라운드코드'][roundCd] || roundCd;
}

// ============================================
// 1단계: 종목 목록 페이지에서 결승 종목 추출
// ============================================

/**
 * 종목 목록 페이지에서 종목 정보와 메타 데이터를 추출합니다.
 * @param {Object} page - Puppeteer 페이지 객체
 * @returns {{ meta: Object, allEvents: Object[] }}
 */
async function extractEventList(page) {
  return await page.evaluate(() => {
    // ── 대회 메타 정보 ──
    // <h2>대회명</h2>
    const h2 = document.querySelector('h2');
    const competitionName = h2 ? h2.textContent.trim() : '';

    // 기간: <p class="head_date">기간 : 2025-06-05 ~ 2025-06-10</p>
    let period = '';
    const dateParagraph = document.querySelector('.head_date');
    if (dateParagraph) {
      const dateText = dateParagraph.textContent.trim();
      // "기간 : 2025-06-05 ~ 2025-06-10" → "2025-06-05 ~ 2025-06-10"
      const m = dateText.match(/기간\s*[:：]?\s*(.+)/);
      period = m ? m[1].trim() : dateText;
    }

    // 장소: <p class="head_place">장소 : 예천</p>
    let venue = '';
    const placeParagraph = document.querySelector('.head_place');
    if (placeParagraph) {
      const placeText = placeParagraph.textContent.trim();
      // "장소 : 예천" → "예천"
      const m = placeText.match(/장소\s*[:：]?\s*(.+)/);
      venue = m ? m[1].trim() : placeText;
    }

    // ── 종목 테이블 (한국어 = 첫 번째 team_table) ──
    const table = document.querySelector('table.table.table-hover.team_table');
    if (!table) return { meta: { competitionName, period, venue }, allEvents: [] };

    const rows = table.querySelectorAll('tbody tr');
    const allEvents = [];

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) continue;

      // 컬럼: 종목, 종별, 라운드, 상태, 실시간결과(보기)
      const eventName = cells[0].textContent.trim();
      const division = cells[1].textContent.trim();  // "남자부", "여자부"
      const roundText = cells[2].textContent.trim();  // "예선", "결승" 등
      const status = cells[3].textContent.trim();     // "경기완료" 등

      // 보기 버튼에서 go_result 파라미터 추출
      const link = cells[4].querySelector('a.btn_middle');
      if (!link) continue;

      const onclick = link.getAttribute('onclick') || '';
      // go_result('E015110143','2025','10','11','4','','TRM')
      const match = onclick.match(/go_result\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*'([^']+)'\s*\)/);
      if (!match) continue;

      allEvents.push({
        eventName,
        division,
        roundText,
        status,
        params: {
          to_cd: match[1],
          year: match[2],
          kind_cd: match[3],         // 10=남자, 20=여자, 30=통합
          detail_class_cd: match[4], // 종목 세부코드
          round: match[5],           // 1=예선, 3=준결승, 4=결승
          gday: match[6],
          resultType: match[7],
        },
      });
    }

    return { meta: { competitionName, period, venue }, allEvents };
  });
}

// ============================================
// 2단계: 개별 결과 페이지 파싱
// ============================================

/**
 * go_result form submit을 실행하고 결과 페이지를 파싱합니다.
 *
 * KAAF 결과 페이지 구조:
 *   - 헤더: .header h2 (대회명), .head_date (기간), .head_place (장소)
 *   - 메타 info_box: 종목명, 종별, 라운드, 일자
 *   - 결과 테이블: table.team_table > tbody > tr
 *
 * 테이블 유형:
 *   [트랙] 1줄 구조 (tr.border_bg)
 *     순위, 레인, 배번, 성명, 소속, 기록, (풍속), 비고, 신기록
 *
 *   [필드] 2줄 구조 (tr.border_bg.twobodr_line + tr.border_dotted)
 *     1행: 순위, 순번, 배번, 성명, [시기별 데이터...], 기록, 비고
 *     2행: 소속, [시기별 풍속...], 신기록
 *     - 높이뛰기/장대: 시기 컬럼에 O/X/- (높이값이 헤더)
 *     - 멀리뛰기/세단뛰기: 시기 컬럼에 거리값, 2행에 풍속
 *     - 투척: 시기 컬럼에 거리값, 풍속 없음
 *
 * @param {Object} page - Puppeteer 페이지 객체
 * @param {Object} params - go_result 파라미터
 * @returns {Object} { meta, results }
 */
async function fetchEventResult(page, params) {
  // go_result 함수 form submit 재현
  await page.evaluate((p) => {
    const frm = document.printForm || document.MoveForm;
    if (!frm) throw new Error('폼을 찾을 수 없습니다 (printForm/MoveForm)');

    frm.to_cd.value = p.to_cd;
    frm.reg_year.value = p.year;
    frm.kind_cd.value = p.kind_cd;
    frm.detail_class_cd.value = p.detail_class_cd;
    frm.round.value = p.round;
    frm.gday.value = p.gday || '';
    frm.resultType.value = p.resultType;
    frm.command.value = 'RESULT_LIST';
    frm.domestic.value = '0';
    frm.gubun.value = 'E';
    frm.tabs_id.value = 'toKor';
    frm.action = '/tourInfo/info_command.do';
    frm.target = '_self';
    frm.submit();
  }, params);

  // 페이지 네비게이션 대기
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.scraper.timeout });
  await new Promise(r => setTimeout(r, config.scraper.renderWait));

  // 결과 페이지에서 데이터 추출
  const result = await page.evaluate(() => {
    // ── 결과 페이지 헤더에서 대회 메타 재확인 ──
    const h2 = document.querySelector('.header h2, h2');
    const competitionName = h2 ? h2.textContent.trim() : '';

    let period = '';
    const dateP = document.querySelector('.head_date');
    if (dateP) {
      const m = dateP.textContent.trim().match(/기간\s*[:：]?\s*(.+)/);
      period = m ? m[1].trim() : dateP.textContent.trim();
    }

    let venue = '';
    const placeP = document.querySelector('.head_place');
    if (placeP) {
      const m = placeP.textContent.trim().match(/장소\s*[:：]?\s*(.+)/);
      venue = m ? m[1].trim() : placeP.textContent.trim();
    }

    // ── info_box에서 종목 메타 정보 추출 ──
    const infoTitles = document.querySelectorAll('.info_line .info_box_title');
    const infoInputs = document.querySelectorAll('.info_line .info_box_content input.input_base');
    const meta = {};
    for (let i = 0; i < infoTitles.length; i++) {
      const label = infoTitles[i].textContent.trim();
      const input = infoInputs[i];
      if (!input) continue;
      const value = input.value.replace(/&nbsp;/g, '').replace(/\u00A0/g, '').trim();

      if (label === '종목명' || label === 'EVENT') meta.eventName = value;
      if (label === '종별' || label === 'DIVISION') meta.division = value;
      if (label === '라운드' || label === 'ROUND') meta.round = value;
      if (label === '일자' || label === 'DATE') meta.date = value;
    }

    meta.competitionName = competitionName;
    meta.period = period;
    meta.venue = venue;

    // ── 결과 테이블 파싱 ──
    const table = document.querySelector('table.table.table-hover.team_table');
    if (!table) return { meta, results: [], hasWindColumn: false, tableType: 'none' };

    const normalizeRelayText = (value) => String(value || '').replace(/\u00A0/g, ' ').trim();
    const isRelayResultTable = () => {
      const headerText = Array.from(table.querySelectorAll('thead th'))
        .map((cell) => normalizeRelayText(cell.textContent))
        .join(' ');
      const metaText = `${meta.competitionName || ''} ${meta.eventName || ''} ${headerText}`;
      return /역전|구간/.test(metaText);
    };
    const parseRelayResultTable = () => {
      const heldResultCount = Array.from(table.querySelectorAll('tbody tr'))
        .filter((row) => row.querySelectorAll('td').length > 0)
        .length;

      return {
        meta,
        results: [],
        hasWindColumn: false,
        tableType: 'relay',
        resultsStatus: 'source_reverify_needed',
        qualityHold: true,
        qualityMessage: '기록 확인 중이에요',
        heldResultCount,
      };
    };

    if (isRelayResultTable()) return parseRelayResultTable();

    // 테이블 유형 판별: 2줄 구조(필드) vs 1줄 구조(트랙)
    // twobodr_line만으로는 부족 — 트랙 종목도 twobodr_line 클래스를 가질 수 있음
    // border_dotted(소속 행)가 존재하면 필드 종목의 2줄 구조
    const hasTwoLineRows = table.querySelector('tbody tr.border_dotted') !== null;

    if (hasTwoLineRows) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 필드 종목: 2줄 구조 파싱
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //
      // 헤더에서 시기 컬럼 수 파악
      // 2번째 헤더행: 순위, 순번, 배번, 성명, [N차시기...], 기록, 비고
      const headerRows = table.querySelectorAll('thead tr');
      let headerTexts = [];
      if (headerRows.length >= 2) {
        headerTexts = Array.from(headerRows[1].querySelectorAll('th')).map(th => th.textContent.trim());
      }

      // "기록" 헤더 위치로 시기 컬럼 수 역산
      const recordHeaderIdx = headerTexts.indexOf('기록');

      // 3번째 헤더행 분석 — 풍속 컬럼 유무 확인
      let hasFieldWind = false;
      if (headerRows.length >= 3) {
        const thirdRowTexts = Array.from(headerRows[2].querySelectorAll('th')).map(th => th.textContent.trim());
        hasFieldWind = thirdRowTexts.includes('풍속');
      }

      // 데이터 행 파싱: 인접 행 페어링 방식
      // KAAF 필드 테이블은 데이터행(border_bg) + 소속행(border_dotted)이 쌍으로 나옴
      // querySelectorAll을 개별로 하면 순서가 어긋날 수 있으므로
      // 모든 tbody tr을 순회하면서 페어링함
      const allRows = Array.from(table.querySelectorAll('tbody tr'));
      const results = [];
      let rowIdx = 0;

      while (rowIdx < allRows.length) {
        const row = allRows[rowIdx];

        // 데이터 행 (border_bg + twobodr_line, NOT border_dotted)
        const isDataRow = row.classList.contains('border_bg') &&
                          row.classList.contains('twobodr_line') &&
                          !row.classList.contains('border_dotted');

        if (!isDataRow) { rowIdx++; continue; }

        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 6) { rowIdx++; continue; }

        const rankText = cells[0].textContent.trim();
        const rank = parseInt(rankText, 10) || null;
        // cells[1] = 순번, cells[2] = 배번 (건너뜀)
        const name = cells[3].textContent.trim();

        // 기록: recordHeaderIdx 위치 또는 끝에서 2번째
        const recordIdx = recordHeaderIdx >= 0 ? recordHeaderIdx : cells.length - 2;
        const record = (recordIdx < cells.length) ? cells[recordIdx].textContent.trim() : '';
        const note = cells[cells.length - 1].textContent.trim();

        // 소속과 신기록: 바로 다음 행이 border_dotted이면 페어링
        let affiliation = '';
        let newRecord = '';
        let wind = null;

        const nextRow = allRows[rowIdx + 1];
        const hasSubRow = nextRow && nextRow.classList.contains('border_dotted');

        if (hasSubRow) {
          const subCells = Array.from(nextRow.querySelectorAll('td'));
          if (subCells.length > 0) {
            affiliation = subCells[0].textContent.trim();
          }
          // 신기록 = 마지막 셀
          if (subCells.length > 1) {
            newRecord = subCells[subCells.length - 1].textContent.trim();
          }
          // 풍속: 멀리뛰기/세단뛰기 — 기록 풍속은 끝에서 2번째
          if (hasFieldWind && subCells.length >= 3) {
            wind = subCells[subCells.length - 2].textContent.trim() || null;
          }
          rowIdx += 2;  // 데이터행 + 소속행 건너뜀
        } else {
          rowIdx++;  // 소속행 없음 (데이터만)
        }

        if (name) {
          results.push({
            rank: rank || (results.length + 1),
            name,
            affiliation,
            record,
            wind,
            note,
            newRecord,
          });
        }
      }

      return { meta, results, hasWindColumn: hasFieldWind, tableType: 'field' };

    } else {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 트랙 종목: 1줄 구조 파싱 (기존 로직)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const headers = Array.from(table.querySelectorAll('thead tr.tb_title_top th'));
      const headerTexts = headers.map(h => h.textContent.trim());
      const hasWindColumn = headerTexts.includes('풍속');

      const rows = table.querySelectorAll('tbody tr.border_bg');
      const results = [];

      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 6) continue;

        const rankText = cells[0].textContent.trim();
        const rank = parseInt(rankText, 10) || null;
        const name = cells[3].textContent.trim();
        const affiliation = cells[4].textContent.trim();
        const record = cells[5].textContent.trim();

        let wind = null;
        let note = '';
        let newRecord = '';

        if (hasWindColumn) {
          if (cells.length >= 7) wind = cells[6].textContent.trim() || null;
          if (cells.length >= 8) note = cells[7].textContent.trim();
          if (cells.length >= 9) newRecord = cells[8].textContent.trim();
        } else {
          if (cells.length >= 7) note = cells[6].textContent.trim();
          if (cells.length >= 8) newRecord = cells[7].textContent.trim();
        }

        if (name) {
          results.push({ rank: rank || (results.length + 1), name, affiliation, record, wind, note, newRecord });
        }
      }

      return { meta, results, hasWindColumn, tableType: 'track' };
    }
  });

  return result;
}

// ============================================
// 3단계: 전체 스크래핑 파이프라인
// ============================================

/**
 * KAAF 종목 목록 URL에서 결승 결과를 자동 수집합니다.
 *
 * @param {string} url - 종목 목록 페이지 URL (resultInfo.do)
 * @param {Object} [options] - 옵션
 * @param {boolean} [options.finalsOnly=true] - 결승만 수집
 * @param {number} [options.maxEvents=0] - 최대 종목 수 (0 = 전체)
 * @returns {Promise<Object>} { meta, events: [...] }
 */
async function scrapeResults(url, options = {}) {
  assertCollectionUrlAllowed(url, 'KAAF result scraper');

  const { finalsOnly = true, maxEvents = 0 } = options;

  let browser = null;

  try {
    console.log(`📡 KAAF 경기결과 수집 시작`);
    console.log(`   URL: ${url}`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--lang=ko-KR',
      ],
    });

    const page = await browser.newPage();

    // ── 1. 종목 목록 페이지 로드 ──
    console.log('\n⏳ [1/3] 종목 목록 페이지 로드 중...');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: config.scraper.timeout });
    await new Promise(r => setTimeout(r, config.scraper.renderWait));

    // ── 2. 종목 목록 + 메타 추출 ──
    const { meta, allEvents } = await extractEventList(page);
    console.log(`   📋 대회: ${meta.competitionName || '(추출 실패)'}`);
    console.log(`   📅 기간: ${meta.period || '(추출 실패)'}`);
    console.log(`   📍 장소: ${meta.venue || '(추출 실패)'}`);
    console.log(`   🏃 전체 종목·라운드: ${allEvents.length}개`);

    // 결승만 필터링 (round === '4')
    let targetEvents = allEvents;
    if (finalsOnly) {
      targetEvents = allEvents.filter(e => e.params.round === '4');
      console.log(`   🏅 결승 종목: ${targetEvents.length}개`);
    }

    if (maxEvents > 0) {
      targetEvents = targetEvents.slice(0, maxEvents);
      console.log(`   ⚠️  최대 ${maxEvents}개 제한 적용`);
    }

    if (targetEvents.length === 0) {
      console.log('\n⚠️  수집할 결승 종목이 없습니다.');
      return {
        meta: { ...meta, source_url: url, crawled_at: new Date().toISOString() },
        events: [],
      };
    }

    // ── 3. 각 결승 종목별 결과 수집 ──
    console.log(`\n📊 [2/3] 결승 결과 수집 중...\n`);

    const events = [];
    for (let i = 0; i < targetEvents.length; i++) {
      const event = targetEvents[i];

      // 성별 판별: kind_cd (10=남자, 20=여자, 30=통합)
      const gender = genderLabel(event.params.kind_cd);

      // 이벤트 라벨 구성: "남자 100m 결승"
      // (eventName은 테이블 셀에서 가져온 종목명, division은 이미 table의 종별 텍스트)
      const eventLabel = `${gender} ${event.eventName} ${event.roundText}`;

      try {
        console.log(`   [${i + 1}/${targetEvents.length}] ${eventLabel}...`);

        // 종목 목록 페이지로 복귀 (두 번째 종목부터)
        if (i > 0) {
          await page.goto(url, { waitUntil: 'networkidle0', timeout: config.scraper.timeout });
          await new Promise(r => setTimeout(r, config.scraper.renderWait));
        }

        // 결과 페이지 로드 (form submit)
        const result = await fetchEventResult(page, event.params);

        if (result.results.length === 0) {
          console.log(`      ⚠️  결과 데이터 없음 (건너뜀)`);
          continue;
        }

        // 풍속 추출: 결과 행에서 (트랙 단거리만 풍속 컬럼이 존재)
        // 모든 선수의 풍속이 동일하면 이벤트 레벨 wind로 설정
        const windValues = result.results.map(r => r.wind).filter(w => w !== null && w !== '');
        let eventWind = null;
        if (windValues.length > 0) {
          // 대부분 동일 값 (같은 조)
          eventWind = windValues[0];
        }

        // 대회명: 종목 목록 페이지 메타 우선, 결과 페이지 보완
        const competitionName = meta.competitionName || result.meta.competitionName || '';
        const eventVenue = meta.venue || result.meta.venue || '';
        const eventDate = result.meta.date || '';

        events.push({
          competition: competitionName,
          event: eventLabel,
          division: event.division || '',   // 종별 (일반부, 고등부, 대학부 등)
          date: eventDate,
          venue: eventVenue,
          wind: eventWind,
          results: result.results.map(r => ({
            rank: r.rank,
            name: r.name,
            affiliation: r.affiliation,
            record: r.record,
            personal_best: '',  // KAAF에서는 PB 미제공
            note: r.note || '',
            newRecord: r.newRecord || '',
          })),
        });

        console.log(`      ✅ ${result.results.length}명 결과 수집 완료`);
      } catch (error) {
        console.error(`      ❌ 실패: ${error.message}`);
      }
    }

    console.log(`\n🎯 [3/3] 수집 완료: ${events.length}개 종목`);

    return {
      meta: {
        competition_name: meta.competitionName,
        year: meta.period ? meta.period.substring(0, 4) : String(new Date().getFullYear()),
        period: meta.period,
        venue: meta.venue,
        source_url: url,
        crawled_at: new Date().toISOString(),
      },
      events,
    };

  } catch (error) {
    console.error(`❌ 스크래핑 실패: ${error.message}`);
    throw error;

  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 브라우저 종료');
    }
  }
}

/**
 * 스크래핑 결과를 data/raw/에 JSON으로 저장합니다.
 * @param {Object} data - { meta, events }
 * @returns {string} 저장된 파일 경로
 */
function saveResults(data) {
  ensureDir(config.dirs.raw);

  const ts = timestamp();
  const safeCompName = (data.meta.competition_name || 'unknown').replace(/[/\\:*?"<>|\s]+/g, '_');
  const filename = `${ts}_${safeCompName}_raw.json`;
  const filePath = path.join(config.dirs.raw, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Raw 데이터 저장: ${filePath}`);

  return filePath;
}

// ============================================
// CLI
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  let url = null;
  let finalsOnly = true;
  let maxEvents = 0;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': case '-u':
        url = args[++i];
        break;
      case '--all':
        finalsOnly = false;
        break;
      case '--finals-only':
        finalsOnly = true;
        break;
      case '--max':
        maxEvents = parseInt(args[++i], 10) || 0;
        break;
      case '--help':
        console.log(`
사용법: node src/scraper.js --url "http://result.kaaf.or.kr/..." [옵션]

옵션:
  --url, -u       종목 목록 페이지 URL (필수)
  --finals-only   결승만 수집 (기본값)
  --all           전체 라운드 수집
  --max N         최대 N개 종목만 수집
  --help          도움말

예시:
  node src/scraper.js --url "http://result.kaaf.or.kr/tourInfo/resultInfo.do?reg_year=2025&to_cd=E015110143&gubun=E&domestic=0&resultType=TRM&kind_cd=&tabs_id=toKor" --max 3
        `);
        process.exit(0);
    }
  }

  if (!url) {
    console.error('❌ URL을 지정해주세요.');
    console.log('   사용법: node src/scraper.js --url "http://result.kaaf.or.kr/..."');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   📡 KAAF 경기결과 스크래퍼 v2              ║');
  console.log('╚══════════════════════════════════════════════╝');

  (async () => {
    const data = await scrapeResults(url, { finalsOnly, maxEvents });

    if (data.events.length > 0) {
      const filePath = saveResults(data);
      const totalAthletes = data.events.reduce((sum, e) => sum + e.results.length, 0);
      console.log(`\n🎉 수집 완료: ${data.events.length}개 종목, ${totalAthletes}명 선수`);
      console.log(`   📁 ${filePath}`);
    } else {
      console.log('\n⚠️  수집된 결승 종목이 없습니다.');
    }
  })().catch(err => {
    console.error('💥 스크래퍼 오류:', err.message);
    process.exit(1);
  });
}

module.exports = { scrapeResults, saveResults };
