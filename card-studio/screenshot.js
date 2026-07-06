/**
 * Puppeteer 스크린샷 모듈
 *
 * 렌더링된 HTML을 Puppeteer로 열어 PNG 이미지로 캡처합니다.
 * - 뷰포트: 1080x1080 (인스타그램 피드 사이즈)
 * - deviceScaleFactor: 2 (고해상도 출력, 실제 2160x2160)
 * - CSS를 인라인으로 포함하여 로딩 문제 방지
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const config = require('./config');

// 브라우저 재사용 풀 – 다수 카드뉴스 생성 시 반복적인 브라우저 열기/닫기 방지
let _sharedBrowser = null;
let _fontsChecked = false;

/**
 * 한글 폰트 사용 가능 여부를 검사합니다.
 * 배포 환경에서 폰트 누락으로 인한 렌더링 문제를 사전에 감지합니다.
 * scripts/setup-fonts.sh를 실행하여 폰트를 설치할 수 있습니다.
 */
function checkKoreanFonts() {
  if (_fontsChecked) return;
  _fontsChecked = true;
  
  try {
    const result = execSync('fc-list :lang=ko 2>/dev/null | wc -l', { encoding: 'utf-8' }).trim();
    const fontCount = parseInt(result) || 0;
    
    if (fontCount === 0) {
      console.warn('⚠️ [폰트 경고] 한글 폰트가 설치되어 있지 않습니다!');
      console.warn('   카드뉴스/프로필카드의 한글 텍스트가 깨질 수 있습니다.');
      console.warn('   해결: scripts/setup-fonts.sh 실행 또는 fonts/ 디렉토리에 .ttf/.otf 파일 추가');
    } else {
      console.log(`✅ 한글 폰트 ${fontCount}개 감지됨`);
    }
  } catch {
    // fc-list가 없는 환경 (Windows 등) – 경고만 출력
    console.warn('⚠️ [폰트 경고] fc-list를 사용할 수 없습니다. 한글 폰트 확인을 건너뜁니다.');
  }
}

/**
 * HTML에 CSS를 인라인으로 삽입합니다.
 *
 * @param {string} htmlContent - 원본 HTML
 * @returns {string} CSS가 인라인된 HTML
 */
function inlineCSS(htmlContent) {
  const stylesPath = config.files.styles;

  if (!fs.existsSync(stylesPath)) {
    console.warn('⚠️ styles.css 파일을 찾을 수 없습니다. 기본 스타일로 진행합니다.');
    return htmlContent;
  }

  const cssContent = fs.readFileSync(stylesPath, 'utf-8');

  // @import 문 제거 (setContent에서 동작하지 않을 수 있음)
  const processedCSS = cssContent.replace(/@import url\([^)]+\);?/g, '');

  // 외부 CSS link 태그를 인라인 style로 교체
  const inlinedHtml = htmlContent.replace(
    /<link[^>]*href="styles\.css"[^>]*\/?>/,
    `<style>${processedCSS}</style>`
  );

  return inlinedHtml;
}

/**
 * HTML 문자열을 PNG 이미지로 캡처합니다.
 *
 * @param {string} htmlContent - 완성된 HTML 문자열
 * @param {string} outputPath - 저장할 PNG 파일 경로
 * @param {Object} [options] - 추가 옵션
 * @returns {Promise<string>} 저장된 파일 경로
 */
/**
 * 공유 브라우저 인스턴스를 가져옵니다.
 * 첫 호출 시 브라우저를 시작하고, 이후에는 재사용합니다.
 */
async function getSharedBrowser() {
  if (!_sharedBrowser || !_sharedBrowser.connected) {
    checkKoreanFonts();
    console.log('🚀 브라우저를 시작합니다...');
    _sharedBrowser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
        '--lang=ko-KR',
        '--allow-file-access-from-files',
      ],
    });
  }
  return _sharedBrowser;
}

/**
 * 공유 브라우저를 종료합니다. 파이프라인 완료 후 반드시 호출하세요.
 */
async function closeBrowser() {
  if (_sharedBrowser) {
    await _sharedBrowser.close();
    _sharedBrowser = null;
    console.log('🔒 브라우저를 종료했습니다.');
  }
}

async function captureScreenshot(htmlContent, outputPath, options = {}) {
  const {
    width = config.cardNews.width,
    height = config.cardNews.height,
    deviceScaleFactor = config.cardNews.deviceScaleFactor,
  } = options;

  const browser = await getSharedBrowser();

  try {
    const page = await browser.newPage();

    try {
      await page.setViewport({ width, height, deviceScaleFactor });

      // CSS 인라인 삽입
      const processedHtml = inlineCSS(htmlContent);

      await page.setContent(processedHtml, { waitUntil: 'networkidle0' });

      // 폰트 로딩 완료 대기
      await page.evaluate(() => document.fonts.ready);

      // 렌더링 안정화 대기
      await new Promise(resolve => setTimeout(resolve, 800));

      // 출력 디렉토리 생성
      const outputDir = require('path').dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 카드 컨테이너만 캡처
      const cardElement = await page.$('.card-container');
      if (!cardElement) {
        throw new Error('.card-container 요소를 찾을 수 없습니다. 템플릿을 확인하세요.');
      }

      await cardElement.screenshot({ path: outputPath, type: 'png' });

      console.log(`✅ 카드뉴스 생성 완료: ${outputPath}`);
      return outputPath;

    } finally {
      await page.close();
    }

  } catch (error) {
    console.error(`❌ 스크린샷 캡처 중 오류: ${error.message}`);
    throw error;
  }
}

module.exports = { captureScreenshot, closeBrowser };
