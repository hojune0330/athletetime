const fs = require('fs');
const path = require('path');

console.log('🧹 Console.log 제거 시작...\n');

// 핵심 HTML 파일 목록
const coreFiles = [
  'index.html',
  'pace-calculator.html',
  'training-calculator.html',
  'community.html',
  'chat-real.html'
];

let totalRemoved = 0;

coreFiles.forEach(file => {
  const filePath = path.join('/home/user/webapp', file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // console.log 문장 제거 (디버깅 주석으로 변경)
    const consoleLogs = content.match(/console\.log\([^)]*\);?/g) || [];
    const logCount = consoleLogs.length;
    
    // 중요한 로그는 유지 (에러 관련)
    content = content.replace(/console\.log\((['"`][^'"`]*['"`])\);?/g, (match, msg) => {
      if (msg.includes('오류') || msg.includes('error') || msg.includes('Error')) {
        return match; // 에러 로그는 유지
      }
      return `// ${match} // Production: removed`;
    });
    
    // console.error와 console.warn은 유지
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ ${file}: ${logCount}개 처리`);
    totalRemoved += logCount;
  }
});

console.log(`\n🎉 총 ${totalRemoved}개의 console.log 처리 완료!`);