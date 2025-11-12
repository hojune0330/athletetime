#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Ensures no backup/legacy HTML files in root and validates required files
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const MAX_HTML_SIZE = 200 * 1024; // 200KB max for HTML files

// Forbidden patterns in root directory
const FORBIDDEN_PATTERNS = [
  /.*-backup\.html$/,
  /.*-old\.html$/,
  /.*-corrupted\.html$/,
  /.*-restored\.html$/,
  /test-.*\.html$/,
  /.*-copy\.html$/,
  /.*-temp\.html$/
];

// Required files in root
const REQUIRED_FILES = [
  'index.html',
  'training-calculator.html',
  'pace-calculator.html',
  'manifest.json',
  'sw.js'
];

// Validation results
const results = {
  errors: [],
  warnings: [],
  passed: []
};

console.log('🔍 Starting deployment validation...\n');

// Check for forbidden files
console.log('📋 Checking for forbidden backup/legacy files...');
const rootFiles = fs.readdirSync(ROOT_DIR);
const htmlFiles = rootFiles.filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  const isForbidden = FORBIDDEN_PATTERNS.some(pattern => pattern.test(file));
  if (isForbidden) {
    results.errors.push(`❌ Forbidden file found: ${file}`);
  }
});

// Check for required files
console.log('📋 Checking for required files...');
REQUIRED_FILES.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    results.errors.push(`❌ Required file missing: ${file}`);
  } else {
    results.passed.push(`✅ Required file exists: ${file}`);
  }
});

// Check file sizes
console.log('📋 Checking HTML file sizes...');
htmlFiles.forEach(file => {
  if (FORBIDDEN_PATTERNS.some(pattern => pattern.test(file))) return;
  
  const filePath = path.join(ROOT_DIR, file);
  const stats = fs.statSync(filePath);
  const sizeKB = Math.round(stats.size / 1024);
  
  if (stats.size > MAX_HTML_SIZE) {
    results.warnings.push(`⚠️  Large HTML file: ${file} (${sizeKB}KB)`);
  } else {
    results.passed.push(`✅ File size OK: ${file} (${sizeKB}KB)`);
  }
});

// Check for duplicate webapp directory
console.log('📋 Checking for nested webapp directory...');
const nestedWebappPath = path.join(ROOT_DIR, 'webapp', 'webapp');
if (fs.existsSync(nestedWebappPath)) {
  results.errors.push('❌ Nested webapp/webapp directory exists - should be removed');
}

// Check for duplicate files in webapp subdirectory
console.log('📋 Checking for duplicate files in webapp/...');
const webappPath = path.join(ROOT_DIR, 'webapp');
if (fs.existsSync(webappPath)) {
  const webappFiles = fs.readdirSync(webappPath)
    .filter(f => f.endsWith('.html'));
  
  webappFiles.forEach(file => {
    if (htmlFiles.includes(file)) {
      results.warnings.push(`⚠️  Duplicate file: /${file} and /webapp/${file}`);
    }
  });
}

// Display results
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION RESULTS');
console.log('='.repeat(60) + '\n');

if (results.passed.length > 0) {
  console.log('✅ Passed Checks:');
  results.passed.forEach(msg => console.log('  ' + msg));
  console.log();
}

if (results.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  results.warnings.forEach(msg => console.log('  ' + msg));
  console.log();
}

if (results.errors.length > 0) {
  console.log('❌ Errors:');
  results.errors.forEach(msg => console.log('  ' + msg));
  console.log();
}

// Summary
const totalIssues = results.errors.length + results.warnings.length;
if (results.errors.length === 0) {
  if (results.warnings.length === 0) {
    console.log('🎉 All validation checks passed! Ready for deployment.');
  } else {
    console.log(`✅ No critical errors found, but ${results.warnings.length} warning(s) need attention.`);
  }
  process.exit(0);
} else {
  console.log(`❌ Validation failed with ${results.errors.length} error(s) and ${results.warnings.length} warning(s).`);
  console.log('Please fix these issues before deployment.');
  process.exit(1);
}