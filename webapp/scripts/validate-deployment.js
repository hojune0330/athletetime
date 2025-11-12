#!/usr/bin/env node

/**
 * 배포 전 파일 유효성 검증 스크립트
 * 중복 파일 방지 및 필수 파일 존재 여부 확인
 */

const fs = require('fs');
const path = require('path');

// 필수 파일 목록
const requiredFiles = [
  'index.html',
  'training-calculator.html',
  'pace-calculator.html',
  'manifest.json',
  'sw.js'
];

// 금지된 백업 파일 패턴
const forbiddenPatterns = [
  /backup.*\.html$/i,
  /.*-backup.*\.html$/i,
  /.*-old.*\.html$/i,
  /.*-corrupted.*\.html$/i,
  /.*-restored.*\.html$/i
];

// 중복 파일 패턴
const duplicatePatterns = [
  /index.*\.html$/i,
  /training-calculator.*\.html$/i,
  /pace-calculator.*\.html$/i
];

function validateFiles() {
  console.log('🔍 배포 파일 유효성 검증 시작...');
  
  let hasErrors = false;
  
  // 1. 필수 파일 존재 여부 확인
  console.log('\n📋 필수 파일 확인:');
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} 존재`);
    } else {
      console.log(`❌ ${file} 누락`);
      hasErrors = true;
    }
  });
  
  // 2. 루트 디렉토리 금지된 파일 확인
  console.log('\n🚫 금지된 백업 파일 확인:');
  const rootFiles = fs.readdirSync('.');
  
  rootFiles.forEach(file => {
    if (forbiddenPatterns.some(pattern => pattern.test(file))) {
      console.log(`❌ 금지된 백업 파일 발견: ${file}`);
      hasErrors = true;
    }
  });
  
  // 3. 중복 파일 확인
  console.log('\n🔍 중복 파일 확인:');
  const htmlFiles = rootFiles.filter(file => file.endsWith('.html'));
  
  const indexFiles = htmlFiles.filter(file => /index.*\.html$/i.test(file));
  const trainingFiles = htmlFiles.filter(file => /training-calculator.*\.html$/i.test(file));
  const paceFiles = htmlFiles.filter(file => /pace-calculator.*\.html$/i.test(file));
  
  if (indexFiles.length > 1) {
    console.log(`❌ 중복 index 파일 발견: ${indexFiles.join(', ')}`);
    hasErrors = true;
  }
  
  if (trainingFiles.length > 1) {
    console.log(`❌ 중복 training-calculator 파일 발견: ${trainingFiles.join(', ')}`);
    hasErrors = true;
  }
  
  if (paceFiles.length > 1) {
    console.log(`❌ 중복 pace-calculator 파일 발견: ${paceFiles.join(', ')}`);
    hasErrors = true;
  }
  
  // 4. 파일 크기 확인 (최소/최대)
  console.log('\n📏 파일 크기 확인:');
  const minSize = 1000; // 1KB minimum
  const maxSize = 500 * 1024; // 500KB maximum
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const sizeKB = Math.round(stats.size / 1024);
      
      if (stats.size < minSize) {
        console.log(`⚠️  ${file} 크기 너무 작음: ${sizeKB}KB`);
      } else if (stats.size > maxSize) {
        console.log(`⚠️  ${file} 크기 너무 큼: ${sizeKB}KB`);
      } else {
        console.log(`✅ ${file} 크기 적절: ${sizeKB}KB`);
      }
    }
  });
  
  // 5. 결과 출력
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ 유효성 검증 실패 - 배포 중지');
    console.log('위의 오류들을 해결 후 다시 시도하세요.');
    process.exit(1);
  } else {
    console.log('✅ 유효성 검증 통과 - 배포 진행 가능');
    process.exit(0);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  validateFiles();
}

module.exports = { validateFiles };