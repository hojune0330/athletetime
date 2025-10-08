const fs = require('fs');
const path = require('path');

console.log('🎨 다크/라이트 모드 토글 추가 중...\n');

const coreFiles = [
  'index.html',
  'pace-calculator.html',
  'training-calculator.html', 
  'community.html',
  'chat-real.html'
];

const themeScript = '\n  <script src="theme-toggle.js"></script>\n';

let addedCount = 0;

coreFiles.forEach(file => {
  const filePath = path.join('/home/user/webapp', file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 이미 추가되어 있는지 확인
    if (!content.includes('theme-toggle.js')) {
      // </body> 태그 직전에 스크립트 추가
      content = content.replace('</body>', themeScript + '</body>');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${file}: 테마 토글 추가 완료`);
      addedCount++;
    } else {
      console.log(`⏭️  ${file}: 이미 테마 토글 있음`);
    }
  }
});

console.log(`\n🌓 총 ${addedCount}개 페이지에 다크/라이트 모드 추가 완료!`);