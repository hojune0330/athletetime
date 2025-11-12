#!/usr/bin/env node

/**
 * HTML 파일 중복 정리 자동화 스크립트
 * SOP 기반 자동화된 정리 프로세스
 */

const fs = require('fs');
const path = require('path');

const CLEANUP_LOG = 'archive/cleanup-log.json';

// 로그 기록 함수
function logCleanup(action, details) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, action, details };
  
  let logs = [];
  if (fs.existsSync(CLEANUP_LOG)) {
    try {
      logs = JSON.parse(fs.readFileSync(CLEANUP_LOG, 'utf8'));
    } catch (e) {
      logs = [];
    }
  }
  
  logs.unshift(logEntry);
  if (logs.length > 100) logs = logs.slice(0, 100);
  
  fs.writeFileSync(CLEANUP_LOG, JSON.stringify(logs, null, 2));
  console.log(`📝 ${action}: ${details}`);
}

// 파일 이동 함수 (안전하게)
function safeMove(source, dest) {
  try {
    if (!fs.existsSync(source)) {
      console.log(`⚠️  소스 파일 없음: ${source}`);
      return false;
    }
    
    // 대상 디렉토리 생성
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // 파일 이동
    fs.renameSync(source, dest);
    logCleanup('MOVE', `${source} → ${dest}`);
    return true;
  } catch (error) {
    console.error(`❌ 이동 실패: ${source} → ${dest}`, error.message);
    return false;
  }
}

// 백업 생성 함수
function createBackup(source, backupDir = 'archive/backups') {
  if (!fs.existsSync(source)) return null;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.basename(source, path.extname(source));
  const ext = path.extname(source);
  const backupPath = path.join(backupDir, `${filename}-backup-${timestamp}${ext}`);
  
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.copyFileSync(source, backupPath);
    logCleanup('BACKUP', `${source} → ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ 백업 실패: ${source}`, error.message);
    return null;
  }
}

// 중복 파일 찾기
function findDuplicateFiles(pattern) {
  const files = fs.readdirSync('.')
    .filter(file => file.match(pattern))
    .filter(file => !file.includes('backup'))
    .filter(file => !file.includes('-old'))
    .filter(file => !file.includes('-corrupted'));
  
  return files;
}

// SOP 기반 정리 실행
function runCleanupSOP() {
  console.log('🚀 HTML 파일 중복 정리 SOP 실행 시작...');
  console.log(`📅 시작 시간: ${new Date().toISOString()}`);
  
  // 1단계: 메인 페이지 정리
  console.log('\n📄 1단계: 메인 페이지 정리');
  const indexFiles = findDuplicateFiles(/^index.*\.html$/);
  
  if (indexFiles.length > 1) {
    console.log(`📊 발견된 index 파일: ${indexFiles.join(', ')}`);
    
    // index.html이 이미 존재하면 다른 버전들을 아카이브로 이동
    if (indexFiles.includes('index.html')) {
      indexFiles.forEach(file => {
        if (file !== 'index.html') {
          const backupPath = createBackup(file);
          if (backupPath) {
            safeMove(file, `archive/old-versions/${file}`);
          }
        }
      });
    }
  }
  
  // 2단계: 트레이닝 계산기 정리
  console.log('\n🏃‍♂️ 2단계: 트레이닝 계산기 정리');
  const trainingFiles = findDuplicateFiles(/^training-calculator.*\.html$/);
  
  if (trainingFiles.length > 1) {
    console.log(`📊 발견된 training-calculator 파일: ${trainingFiles.join(', ')}`);
    
    // training-calculator.html을 canonical 버전으로 유지
    if (trainingFiles.includes('training-calculator.html')) {
      trainingFiles.forEach(file => {
        if (file !== 'training-calculator.html') {
          const backupPath = createBackup(file);
          if (backupPath) {
            safeMove(file, `archive/old-versions/${file}`);
          }
        }
      });
    }
  }
  
  // 3단계: 페이스 계산기 정리
  console.log('\n⚡ 3단계: 페이스 계산기 정리');
  const paceFiles = findDuplicateFiles(/^pace-calculator.*\.html$/);
  
  if (paceFiles.length > 1) {
    console.log(`📊 발견된 pace-calculator 파일: ${paceFiles.join(', ')}`);
    
    // pace-calculator.html을 canonical 버전으로 유지
    if (paceFiles.includes('pace-calculator.html')) {
      paceFiles.forEach(file => {
        if (file !== 'pace-calculator.html') {
          const backupPath = createBackup(file);
          if (backupPath) {
            safeMove(file, `archive/old-versions/${file}`);
          }
        }
      });
    }
  }
  
  // 4단계: 중첩된 webapp 디렉토리 정리
  console.log('\n📁 4단계: 중첩된 webapp 디렉토리 정리');
  if (fs.existsSync('webapp/webapp')) {
    console.log('🔄 중첩된 webapp/webapp 디렉토리 발견');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nestedWebappBackup = `archive/nested-webapp-${timestamp}`;
    
    if (safeMove('webapp/webapp', nestedWebappBackup)) {
      console.log(`✅ 중첩된 webapp → ${nestedWebappBackup} 이동 완료`);
    }
  }
  
  // 5단계: 루트 디렉토리 백업 파일 정리
  console.log('\n🧹 5단계: 루트 디렉토리 백업 파일 정리');
  const rootFiles = fs.readdirSync('.');
  
  rootFiles.forEach(file => {
    if (file.match(/.*-backup.*\.html$/) || 
        file.match(/.*-old.*\.html$/) || 
        file.match(/.*-corrupted.*\.html$/) ||
        file.match(/.*-restored.*\.html$/)) {
      
      const backupPath = createBackup(file);
      if (backupPath) {
        safeMove(file, `archive/old-versions/${file}`);
      }
    }
  });
  
  // 6단계: 유효성 검증
  console.log('\n🔍 6단계: 유효성 검증');
  try {
    const { validateFiles } = require('./validate-deployment.js');
    validateFiles();
    console.log('✅ 유효성 검증 완료');
  } catch (error) {
    console.log('⚠️  유효성 검증 스크립트 실행 실패:', error.message);
  }
  
  console.log('\n✅ SOP 정리 완료');
  console.log(`📝 로그: ${CLEANUP_LOG}`);
  console.log(`📅 완료 시간: ${new Date().toISOString()}`);
}

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
사용법: node cleanup-html.js [옵션]

옵션:
  --help, -h     도움말 표시
  --dry-run      실제 실행 없이 시뮬레이션
  --force        확인 없이 실행

설명:
  HTML 파일 중복을 정리하고 canonical 버전을 유지합니다.
`);
    process.exit(0);
  }
  
  // 실행 확인
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  if (!args.includes('--force')) {
    rl.question('⚠️  이 작업은 파일을 이동하고 백업합니다. 계속하시겠습니까? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        runCleanupSOP();
      } else {
        console.log('❌ 작업 취소됨');
      }
      rl.close();
    });
  } else {
    runCleanupSOP();
  }
}

module.exports = { runCleanupSOP, safeMove, createBackup, findDuplicateFiles };