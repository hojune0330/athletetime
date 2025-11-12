#!/usr/bin/env node

/**
 * HTML Cleanup Script
 * Automatically moves or removes legacy/backup HTML files
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const ARCHIVE_DIR = path.join(ROOT_DIR, 'archive', 'legacy');

// Files to clean up
const CLEANUP_PATTERNS = [
  /.*-backup\.html$/,
  /.*-old\.html$/,
  /.*-corrupted\.html$/,
  /.*-restored\.html$/,
  /test-.*\.html$/,
  /.*-copy\.html$/,
  /.*-temp\.html$/,
  /index-backup\.html$/
];

// Files to never touch
const PROTECTED_FILES = [
  'index.html',
  'training-calculator.html',
  'pace-calculator.html',
  'chat.html',
  'competitions-calendar.html',
  'offline.html',
  'periodization-protocols.html'
];

console.log('🧹 HTML Cleanup Script');
console.log('Mode:', dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN');
console.log('='.repeat(60) + '\n');

// Ensure archive directory exists
if (!dryRun && !fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  console.log(`📁 Created archive directory: ${ARCHIVE_DIR}\n`);
}

// Get all HTML files in root
const rootFiles = fs.readdirSync(ROOT_DIR)
  .filter(f => f.endsWith('.html'));

const filesToClean = [];
const filesToKeep = [];

// Categorize files
rootFiles.forEach(file => {
  if (PROTECTED_FILES.includes(file)) {
    filesToKeep.push(file);
    return;
  }
  
  const needsCleanup = CLEANUP_PATTERNS.some(pattern => pattern.test(file));
  if (needsCleanup) {
    filesToClean.push(file);
  } else {
    filesToKeep.push(file);
  }
});

// Display findings
console.log('📊 Analysis Results:');
console.log(`  • Files to clean: ${filesToClean.length}`);
console.log(`  • Files to keep: ${filesToKeep.length}`);
console.log();

if (filesToClean.length === 0) {
  console.log('✅ No files need cleaning. Root directory is clean!');
  process.exit(0);
}

// Show files to be cleaned
console.log('🗑️  Files to be archived/removed:');
filesToClean.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  const stats = fs.statSync(filePath);
  const sizeKB = Math.round(stats.size / 1024);
  console.log(`  • ${file} (${sizeKB}KB)`);
});
console.log();

// Ask for confirmation if not forced and not dry-run
if (!dryRun && !force) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('⚠️  Proceed with cleanup? (y/N): ', (answer) => {
    rl.close();
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Cleanup cancelled.');
      process.exit(0);
    }
    performCleanup();
  });
} else if (!dryRun) {
  performCleanup();
} else {
  console.log('ℹ️  Dry run complete. Use without --dry-run to perform actual cleanup.');
}

function performCleanup() {
  console.log('\n🔄 Performing cleanup...\n');
  
  let movedCount = 0;
  let errorCount = 0;
  
  filesToClean.forEach(file => {
    const sourcePath = path.join(ROOT_DIR, file);
    const destPath = path.join(ARCHIVE_DIR, file);
    
    try {
      // Check if file already exists in archive
      if (fs.existsSync(destPath)) {
        const timestamp = Date.now();
        const newName = file.replace('.html', `-${timestamp}.html`);
        const newDestPath = path.join(ARCHIVE_DIR, newName);
        fs.renameSync(sourcePath, newDestPath);
        console.log(`  ✅ Moved ${file} → archive/legacy/${newName}`);
      } else {
        fs.renameSync(sourcePath, destPath);
        console.log(`  ✅ Moved ${file} → archive/legacy/${file}`);
      }
      movedCount++;
    } catch (error) {
      console.error(`  ❌ Error moving ${file}: ${error.message}`);
      errorCount++;
    }
  });
  
  // Clean up webapp subdirectory duplicates
  console.log('\n🔄 Checking webapp subdirectory...');
  const webappPath = path.join(ROOT_DIR, 'webapp');
  if (fs.existsSync(webappPath)) {
    const webappFiles = fs.readdirSync(webappPath)
      .filter(f => f.endsWith('.html'));
    
    webappFiles.forEach(file => {
      const rootFilePath = path.join(ROOT_DIR, file);
      const webappFilePath = path.join(webappPath, file);
      
      if (fs.existsSync(rootFilePath) && PROTECTED_FILES.includes(file)) {
        // If canonical version exists in root, remove webapp duplicate
        try {
          fs.unlinkSync(webappFilePath);
          console.log(`  ✅ Removed duplicate: webapp/${file}`);
          movedCount++;
        } catch (error) {
          console.error(`  ❌ Error removing webapp/${file}: ${error.message}`);
          errorCount++;
        }
      }
    });
  }
  
  // Check for nested webapp/webapp
  const nestedWebappPath = path.join(ROOT_DIR, 'webapp', 'webapp');
  if (fs.existsSync(nestedWebappPath)) {
    console.log('\n⚠️  Found nested webapp/webapp directory.');
    console.log('Please manually review and remove this directory.');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`  ✅ Files cleaned: ${movedCount}`);
  if (errorCount > 0) {
    console.log(`  ❌ Errors: ${errorCount}`);
  }
  console.log('\n🎉 Cleanup complete!');
  
  // Create archive README
  const readmePath = path.join(ARCHIVE_DIR, 'README.md');
  const readmeContent = `# Legacy HTML Files Archive

This directory contains archived HTML files that were cleaned up from the root directory.

## Archive Date
${new Date().toISOString()}

## Files Archived
${filesToClean.map(f => `- ${f}`).join('\n')}

## Reason for Archival
These files were identified as backup, old, corrupted, or test versions that should not be in the root directory for production deployment.

## Restoration
If any of these files need to be restored, they can be moved back to the root directory. However, ensure they are renamed appropriately and do not conflict with the canonical versions.
`;
  
  fs.writeFileSync(readmePath, readmeContent);
  console.log('📝 Created archive README.');
}