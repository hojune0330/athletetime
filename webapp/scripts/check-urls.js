#!/usr/bin/env node

/**
 * 🔍 URL 일관성 체크 스크립트
 * 
 * 프로젝트 전체에서 잘못된 URL 패턴을 찾아냅니다.
 * 
 * 실행:
 * node scripts/check-urls.js
 */

const fs = require('fs');
const path = require('path');

// ============================================
// 설정
// ============================================

const CORRECT_URLS = {
  frontend: 'athlete-time.netlify.app',
  backend: 'athletetime-backend.onrender.com',
  database: 'athletetime-db',
};

const WRONG_PATTERNS = [
  'athlete-time-backend',  // ❌ 잘못된 패턴
  'athletetime.netlify',   // ❌ 잘못된 패턴
];

const SEARCH_DIRS = [
  'community-new/src',
  'server.js',
  '.env',
  '.env.production',
  'netlify.toml',
];

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
];

// ============================================
// 파일 검색
// ============================================

function searchInFile(filePath, content) {
  const issues = [];
  
  WRONG_PATTERNS.forEach(pattern => {
    if (content.includes(pattern)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // 주석이나 문서에서 "주의:" 또는 "절대로" 같은 경고 문구와 함께 나오는 경우는 무시
        const isWarning = /주의|절대로|❌|WARNING|CAUTION|주의사항/i.test(line);
        
        if (line.includes(pattern) && !isWarning) {
          issues.push({
            file: filePath,
            line: index + 1,
            pattern,
            content: line.trim(),
          });
        }
      });
    }
  });
  
  return issues;
}

function searchInDirectory(dir, issues = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // 무시할 디렉토리/파일 체크
      if (IGNORE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        searchInDirectory(fullPath, issues);
      } else if (entry.isFile()) {
        // 텍스트 파일만 검색
        const ext = path.extname(entry.name);
        if (['.js', '.ts', '.tsx', '.jsx', '.json', '.env', '.toml', '.md'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const fileIssues = searchInFile(fullPath, content);
            issues.push(...fileIssues);
          } catch (err) {
            // 읽기 실패 무시
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return issues;
}

// ============================================
// 메인 실행
// ============================================

console.log('🔍 Athlete Time - URL 일관성 체크\n');
console.log('올바른 URL:');
console.log(`  ✅ Frontend:  ${CORRECT_URLS.frontend}`);
console.log(`  ✅ Backend:   ${CORRECT_URLS.backend}`);
console.log(`  ✅ Database:  ${CORRECT_URLS.database}`);
console.log('\n잘못된 패턴 검색 중...\n');

const allIssues = [];

// 루트 파일 검색
['server.js', '.env', 'netlify.toml'].forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const issues = searchInFile(file, content);
      allIssues.push(...issues);
    } catch (err) {
      // 읽기 실패 무시
    }
  }
});

// 디렉토리 검색
if (fs.existsSync('community-new/src')) {
  searchInDirectory('community-new/src', allIssues);
}

// 결과 출력
if (allIssues.length === 0) {
  console.log('✅ 모든 URL이 올바릅니다!\n');
  process.exit(0);
} else {
  console.log(`❌ ${allIssues.length}개의 잘못된 URL 패턴을 발견했습니다:\n`);
  
  allIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.file}:${issue.line}`);
    console.log(`   패턴: ${issue.pattern}`);
    console.log(`   내용: ${issue.content}`);
    console.log('');
  });
  
  console.log('⚠️ 위의 파일들을 수정해주세요!\n');
  console.log('올바른 패턴:');
  console.log('  - athlete-time.netlify.app (프론트엔드)');
  console.log('  - athletetime-backend.onrender.com (백엔드)');
  console.log('  - athletetime-db (데이터베이스)\n');
  
  process.exit(1);
}
