#!/usr/bin/env node

/**
 * 종합 검증 스크립트 - 다음 단계 전 최종 확인
 * HTML 파일 중복 정리의 완전성 검증
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔍 종합 검증 시작 - 다음 단계 준비 확인');
console.log('='.repeat(60));

let validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function logResult(status, message, details = '') {
  const statusIcon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${statusIcon} ${message}`);
  if (details) console.log(`   ${details}`);
  
  if (status === 'PASS') validationResults.passed++;
  else if (status === 'WARN') validationResults.warnings++;
  else validationResults.failed++;
  
  validationResults.details.push({ status, message, details });
}

// 1단계: 필수 파일 존재 및 무결성 확인
console.log('\n📋 1단계: 필수 파일 존재 확인');
const requiredFiles = [
  { name: 'index.html', minSize: 10000, maxSize: 50000 },
  { name: 'training-calculator.html', minSize: 50000, maxSize: 200000 },
  { name: 'pace-calculator.html', minSize: 100000, maxSize: 200000 },
  { name: 'manifest.json', minSize: 500, maxSize: 5000 },
  { name: 'sw.js', minSize: 1000, maxSize: 20000 }
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file.name);
  
  if (!fs.existsSync(filePath)) {
    logResult('FAIL', `${file.name} 파일이 존재하지 않음`);
    return;
  }
  
  const stats = fs.statSync(filePath);
  const sizeKB = Math.round(stats.size / 1024);
  
  if (stats.size < file.minSize || stats.size > file.maxSize) {
    logResult('WARN', `${file.name} 크기가 범위를 벗어남`, `현재: ${sizeKB}KB, 범위: ${Math.round(file.minSize/1024)}-${Math.round(file.maxSize/1024)}KB`);
  } else {
    logResult('PASS', `${file.name} 존재 및 크기 적절`, `${sizeKB}KB`);
  }
});

// 2단계: 중복 파일 검사
console.log('\n🔍 2단계: 중복 파일 검사');
const duplicatePatterns = [
  { pattern: /^index.*.html$/i, canonical: 'index.html' },
  { pattern: /^training-calculator.*.html$/i, canonical: 'training-calculator.html' },
  { pattern: /^pace-calculator.*.html$/i, canonical: 'pace-calculator.html' }
];

duplicatePatterns.forEach(({ pattern, canonical }) => {
  const files = fs.readdirSync(path.join(__dirname, '..'))
    .filter(file => file.match(pattern))
    .filter(file => !file.includes('backup'))
    .filter(file => !file.includes('old'))
    .filter(file => !file.includes('corrupted'));
  
  if (files.length > 1) {
    logResult('FAIL', `중복 ${canonical} 파일 발견`, `발견된 파일: ${files.join(', ')}`);
  } else if (files.length === 1 && files[0] !== canonical) {
    logResult('WARN', `Canonical 파일 이름이 다름`, `예상: ${canonical}, 실제: ${files[0]}`);
  } else {
    logResult('PASS', `${canonical} 단일 버전 확인`);
  }
});

// 3단계: 루트 디렉토리 백업 파일 검사
console.log('\n🧹 3단계: 루트 디렉토리 백업 파일 검사');
const backupPatterns = [
  /.*-backup.*\.html$/i,
  /.*-old.*\.html$/i,
  /.*-corrupted.*\.html$/i,
  /.*-restored.*\.html$/i
];

const rootFiles = fs.readdirSync(path.join(__dirname, '..'));
const backupFiles = rootFiles.filter(file => 
  backupPatterns.some(pattern => file.match(pattern))
);

if (backupFiles.length > 0) {
  logResult('FAIL', '루트 디렉토리에 백업 파일 존재', backupFiles.join(', '));
} else {
  logResult('PASS', '루트 디렉토리 깨끗함');
}

// 4단계: 중첩된 webapp 디렉토리 검사
console.log('\n📁 4단계: 중첩된 webapp 디렉토리 검사');
if (fs.existsSync(path.join(__dirname, '..', 'webapp', 'webapp'))) {
  logResult('FAIL', '중첩된 webapp/webapp 디렉토리 존재');
} else {
  logResult('PASS', '중첩된 디렉토리 없음');
}

// 5단계: 파일 내용 무결성 검사
console.log('\n🔐 5단계: 파일 내용 무결성 검사');
try {
  const canonicalFiles = ['index.html', 'training-calculator.html', 'pace-calculator.html'];
  
  canonicalFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 기본적인 HTML 구조 확인
      if (!content.includes('<!DOCTYPE html>') || !content.includes('</html>')) {
        logResult('FAIL', `${file} 올바른 HTML 구조 아님`);
        return;
      }
      
      // 중요한 메타 태그 확인
      if (!content.includes('viewport')) {
        logResult('WARN', `${file} viewport 메타 태그 누락`);
      }
      
      // 파일별 특수 검사
      if (file === 'index.html' && !content.includes('PWA')) {
        logResult('WARN', 'index.html에 PWA 관련 내용 없음');
      }
      
      if (file === 'training-calculator.html' && !content.includes('AI')) {
        logResult('WARN', 'training-calculator.html에 AI 관련 내용 없음');
      }
      
      // 파일 크기 대비 내용 확인
      if (content.length < 100) {
        logResult('FAIL', `${file} 내용이 너무 짧음`);
      } else {
        logResult('PASS', `${file} 내용 무결성 확인`);
      }
    }
  });
} catch (error) {
  logResult('FAIL', '파일 내용 검사 중 오류', error.message);
}

// 6단계: 아카이브 구조 검사
console.log('\n📦 6단계: 아카이브 구조 검사');
const archiveDirs = [
  'archive/cleanup-2025-11-12',
  'archive/old-html',
  'archive/backup-files'
];

archiveDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    logResult('PASS', `${dir} 존재 (${files.length}개 파일)`);
  } else {
    logResult('WARN', `${dir} 디렉토리 없음`);
  }
});

// 7단계: 스크립트 파일 검사
console.log('\n⚙️ 7단계: 스크립트 파일 검사');
const scriptFiles = [
  'scripts/validate-deployment.js',
  'scripts/cleanup-html.js'
];

scriptFiles.forEach(script => {
  const scriptPath = path.join(__dirname, '..', script);
  if (fs.existsSync(scriptPath)) {
    const content = fs.readFileSync(scriptPath, 'utf8');
    if (content.includes('module.exports') || content.includes('exports')) {
      logResult('PASS', `${script} 모듈화 확인`);
    } else {
      logResult('WARN', `${script} 모듈 내보내기 없음`);
    }
  } else {
    logResult('FAIL', `${script} 파일 없음`);
  }
});

// 최종 결과
console.log('\n' + '='.repeat(60));
console.log('📊 최종 검증 결과');
console.log('='.repeat(60));

console.log(`✅ 통과: ${validationResults.passed}개`);
console.log(`⚠️  경고: ${validationResults.warnings}개`);
console.log(`❌ 실패: ${validationResults.failed}개`);

if (validationResults.failed === 0) {
  console.log('\n🎉 모든 검증 통과! 다음 단계 진행 가능');
  process.exit(0);
} else {
  console.log('\n❌ 검증 실패. 문제 해결 후 다시 시도');
  console.log('\n상세한 실패 내용:');
  validationResults.details
    .filter(item => item.status === 'FAIL')
    .forEach(item => console.log(`  - ${item.message}`));
  process.exit(1);
}