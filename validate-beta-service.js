const fs = require('fs');
const path = require('path');

console.log('🔍 오픈 베타 서비스 검증 시작...\n');

// 검증 결과 저장
const issues = {
  critical: [],
  major: [],
  minor: [],
  suggestions: []
};

// 핵심 페이지 목록
const corePages = [
  'index.html',
  'pace-calculator.html',
  'training-calculator.html',
  'community.html',
  'chat-real.html'
];

// 1. HTML 구조 검증
function validateHTMLStructure(filename, content) {
  console.log(`📄 검증 중: ${filename}`);
  const pageIssues = [];
  
  // DOCTYPE 체크
  if (!content.includes('<!DOCTYPE html>')) {
    pageIssues.push({ type: 'major', msg: 'DOCTYPE 선언 누락' });
  }
  
  // Meta viewport 체크
  if (!content.includes('viewport')) {
    pageIssues.push({ type: 'critical', msg: '모바일 viewport 메타 태그 누락' });
  }
  
  // 인코딩 체크
  if (!content.includes('charset="UTF-8"') && !content.includes('charset=UTF-8')) {
    pageIssues.push({ type: 'major', msg: 'UTF-8 인코딩 선언 누락' });
  }
  
  // 타이틀 체크
  const titleMatch = content.match(/<title>(.*?)<\/title>/);
  if (!titleMatch) {
    pageIssues.push({ type: 'critical', msg: '페이지 타이틀 누락' });
  } else if (titleMatch[1].length < 10) {
    pageIssues.push({ type: 'minor', msg: `타이틀이 너무 짧음: "${titleMatch[1]}"` });
  }
  
  // 중복 ID 체크
  const idMatches = content.match(/id=["']([^"']+)["']/g) || [];
  const idMap = {};
  idMatches.forEach(match => {
    const id = match.match(/id=["']([^"']+)["']/)[1];
    if (idMap[id]) {
      pageIssues.push({ type: 'major', msg: `중복 ID 발견: "${id}"` });
    }
    idMap[id] = true;
  });
  
  // 이미지 alt 태그 체크
  const imgTags = content.match(/<img[^>]+>/g) || [];
  imgTags.forEach(img => {
    if (!img.includes('alt=')) {
      pageIssues.push({ type: 'minor', msg: '이미지 alt 속성 누락' });
    }
  });
  
  // 링크 체크
  const brokenLinks = [];
  const linkMatches = content.match(/href=["']([^"']+)["']/g) || [];
  linkMatches.forEach(match => {
    const href = match.match(/href=["']([^"']+)["']/)[1];
    if (href.startsWith('#')) return; // 앵커 링크 스킵
    if (href.startsWith('http')) return; // 외부 링크 스킵
    if (href.startsWith('mailto:')) return; // 이메일 스킵
    if (href.startsWith('javascript:')) return; // JS 스킵
    
    if (!href.startsWith('/') && !fs.existsSync(path.join('/home/user/webapp', href))) {
      brokenLinks.push(href);
    }
  });
  
  if (brokenLinks.length > 0) {
    pageIssues.push({ type: 'major', msg: `깨진 링크: ${brokenLinks.join(', ')}` });
  }
  
  // 오탈자 체크 (일반적인 한글 오탈자)
  const typos = [
    { wrong: '됬', correct: '됐' },
    { wrong: '됫', correct: '됐' },
    { wrong: '햇', correct: '했' },
    { wrong: '엤', correct: '었' },
    { wrong: '됀', correct: '된' },
    { wrong: '웬지', correct: '왠지' },
    { wrong: '어떻헤', correct: '어떻게' }
  ];
  
  typos.forEach(typo => {
    if (content.includes(typo.wrong)) {
      pageIssues.push({ type: 'minor', msg: `오탈자: "${typo.wrong}" → "${typo.correct}"` });
    }
  });
  
  // Console.log 체크
  if (content.includes('console.log') && !filename.includes('test')) {
    const logCount = (content.match(/console\.log/g) || []).length;
    pageIssues.push({ type: 'minor', msg: `console.log ${logCount}개 발견 (프로덕션에서 제거 권장)` });
  }
  
  // TODO/FIXME 체크
  if (content.includes('TODO') || content.includes('FIXME')) {
    pageIssues.push({ type: 'minor', msg: 'TODO/FIXME 주석 발견' });
  }
  
  // localhost 하드코딩 체크
  if (content.includes('localhost') && !content.includes('window.location.hostname')) {
    pageIssues.push({ type: 'critical', msg: 'localhost 하드코딩 발견 (동적 URL 사용 필요)' });
  }
  
  // 포트 하드코딩 체크
  const portMatches = content.match(/:(\d{4})/g) || [];
  const hardcodedPorts = portMatches.filter(p => {
    const port = p.substring(1);
    return ['3000', '3001', '3002', '3003', '3004', '8080', '8000'].includes(port);
  });
  
  if (hardcodedPorts.length > 0 && !content.includes('window.location.hostname')) {
    pageIssues.push({ type: 'major', msg: `포트 하드코딩: ${hardcodedPorts.join(', ')}` });
  }
  
  return pageIssues;
}

// 2. JavaScript 기능 검증
function validateJavaScript(filename, content) {
  const jsIssues = [];
  
  // 에러 핸들링 체크
  if (content.includes('fetch(') && !content.includes('.catch')) {
    jsIssues.push({ type: 'major', msg: 'fetch 에러 핸들링 누락' });
  }
  
  // WebSocket 체크
  if (content.includes('WebSocket') && !content.includes('onerror')) {
    jsIssues.push({ type: 'major', msg: 'WebSocket 에러 핸들링 누락' });
  }
  
  // localStorage 체크
  if (content.includes('localStorage') && !content.includes('try')) {
    jsIssues.push({ type: 'minor', msg: 'localStorage 예외 처리 권장' });
  }
  
  return jsIssues;
}

// 3. CSS/스타일 검증
function validateCSS(filename, content) {
  const cssIssues = [];
  
  // 반응형 체크
  if (!content.includes('@media') && !content.includes('tailwind')) {
    cssIssues.push({ type: 'major', msg: '미디어 쿼리 없음 (반응형 디자인 필요)' });
  }
  
  // 스크롤바 스타일
  if (content.includes('overflow') && !content.includes('webkit-scrollbar')) {
    cssIssues.push({ type: 'suggestion', msg: '커스텀 스크롤바 스타일 추가 권장' });
  }
  
  // z-index 체크
  const zIndexMatches = content.match(/z-index:\s*(\d+)/g) || [];
  const highZIndex = zIndexMatches.filter(z => {
    const value = parseInt(z.match(/\d+/)[0]);
    return value > 9999;
  });
  
  if (highZIndex.length > 0) {
    cssIssues.push({ type: 'minor', msg: `과도한 z-index 값: ${highZIndex.join(', ')}` });
  }
  
  return cssIssues;
}

// 4. 접근성 검증
function validateAccessibility(filename, content) {
  const a11yIssues = [];
  
  // 버튼 접근성
  const buttons = content.match(/<button[^>]*>/g) || [];
  buttons.forEach(btn => {
    if (!btn.includes('aria-') && !btn.includes('type=')) {
      a11yIssues.push({ type: 'minor', msg: '버튼에 type 속성 누락' });
    }
  });
  
  // 폼 라벨
  const inputs = content.match(/<input[^>]*>/g) || [];
  inputs.forEach(input => {
    if (!input.includes('hidden') && !input.includes('aria-label')) {
      const id = input.match(/id=["']([^"']+)["']/);
      if (id && !content.includes(`for="${id[1]}"`)) {
        a11yIssues.push({ type: 'minor', msg: '입력 필드 라벨 연결 누락' });
      }
    }
  });
  
  return a11yIssues;
}

// 모든 페이지 검증
console.log('\n========== 페이지별 검증 시작 ==========\n');

corePages.forEach(page => {
  const filePath = path.join('/home/user/webapp', page);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const htmlIssues = validateHTMLStructure(page, content);
    const jsIssues = validateJavaScript(page, content);
    const cssIssues = validateCSS(page, content);
    const a11yIssues = validateAccessibility(page, content);
    
    const allIssues = [...htmlIssues, ...jsIssues, ...cssIssues, ...a11yIssues];
    
    allIssues.forEach(issue => {
      const issueObj = { page, ...issue };
      if (issue.type === 'critical') issues.critical.push(issueObj);
      else if (issue.type === 'major') issues.major.push(issueObj);
      else if (issue.type === 'minor') issues.minor.push(issueObj);
      else if (issue.type === 'suggestion') issues.suggestions.push(issueObj);
    });
    
    console.log(`✅ ${page} 검증 완료`);
  } else {
    console.log(`❌ ${page} 파일 없음`);
  }
});

// 결과 출력
console.log('\n\n========== 검증 결과 요약 ==========\n');

console.log(`🔴 치명적 문제 (Critical): ${issues.critical.length}개`);
issues.critical.forEach(i => {
  console.log(`  - [${i.page}] ${i.msg}`);
});

console.log(`\n🟠 주요 문제 (Major): ${issues.major.length}개`);
issues.major.forEach(i => {
  console.log(`  - [${i.page}] ${i.msg}`);
});

console.log(`\n🟡 경미한 문제 (Minor): ${issues.minor.length}개`);
issues.minor.slice(0, 10).forEach(i => {
  console.log(`  - [${i.page}] ${i.msg}`);
});
if (issues.minor.length > 10) {
  console.log(`  ... 외 ${issues.minor.length - 10}개`);
}

console.log(`\n💡 개선 제안 (Suggestions): ${issues.suggestions.length}개`);
issues.suggestions.forEach(i => {
  console.log(`  - [${i.page}] ${i.msg}`);
});

// 전체 점수 계산
const score = Math.max(0, 100 - (issues.critical.length * 20) - (issues.major.length * 10) - (issues.minor.length * 2));
console.log(`\n📊 전체 품질 점수: ${score}/100`);

if (score >= 90) {
  console.log('✅ 오픈 베타 서비스 출시 가능');
} else if (score >= 70) {
  console.log('⚠️ 주요 문제 해결 후 출시 권장');
} else {
  console.log('❌ 추가 개발 필요');
}

console.log('\n검증 완료!');