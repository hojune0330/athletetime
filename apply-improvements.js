const fs = require('fs');
const path = require('path');

console.log('🔧 개선사항 적용 시작...\n');

const coreFiles = [
  'index.html',
  'pace-calculator.html', 
  'training-calculator.html',
  'community.html',
  'chat-real.html'
];

let improvements = {
  buttons: 0,
  images: 0,
  inputs: 0,
  errorHandling: 0,
  scrollbar: 0
};

// 커스텀 스크롤바 스타일
const scrollbarStyle = `
  <style>
    /* 커스텀 스크롤바 스타일 */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 10px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 10px;
      transition: all 0.3s;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, #764ba2, #667eea);
    }
    
    /* Firefox */
    * {
      scrollbar-width: thin;
      scrollbar-color: #667eea rgba(0, 0, 0, 0.1);
    }
  </style>
`;

coreFiles.forEach(file => {
  const filePath = path.join('/home/user/webapp', file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 1. 버튼 type 속성 추가
    const buttonRegex = /<button([^>]*?)>/g;
    content = content.replace(buttonRegex, (match, attrs) => {
      if (!attrs.includes('type=')) {
        improvements.buttons++;
        modified = true;
        return `<button type="button"${attrs}>`;
      }
      return match;
    });
    
    // 2. 이미지 alt 속성 추가 (아이콘 제외)
    const imgRegex = /<img([^>]*?)>/g;
    content = content.replace(imgRegex, (match, attrs) => {
      if (!attrs.includes('alt=') && !attrs.includes('icon')) {
        improvements.images++;
        modified = true;
        // src에서 파일명 추출하여 alt로 사용
        const srcMatch = attrs.match(/src=["']([^"']*?)["']/);
        if (srcMatch) {
          const filename = srcMatch[1].split('/').pop().split('.')[0];
          return `<img${attrs} alt="${filename}">`;
        }
        return `<img${attrs} alt="이미지">`;
      }
      return match;
    });
    
    // 3. 입력 필드 라벨 연결 
    const inputRegex = /<input([^>]*?)id=["']([^"']+)["']([^>]*?)>/g;
    const inputs = content.match(inputRegex) || [];
    inputs.forEach(input => {
      const idMatch = input.match(/id=["']([^"']+)["']/);
      if (idMatch && !input.includes('type="hidden"') && !input.includes('type="checkbox"')) {
        const id = idMatch[1];
        // 라벨이 없으면 aria-label 추가
        if (!content.includes(`for="${id}"`) && !input.includes('aria-label')) {
          const newInput = input.replace('>', ` aria-label="${id}에 입력">`);
          content = content.replace(input, newInput);
          improvements.inputs++;
          modified = true;
        }
      }
    });
    
    // 4. fetch 에러 핸들링 강화
    const fetchRegex = /fetch\(([^)]+)\)([^}]*?)\.then/g;
    content = content.replace(fetchRegex, (match, url, middle) => {
      if (!middle.includes('.catch')) {
        improvements.errorHandling++;
        modified = true;
        return match + `\n        .catch(error => {
          console.error('네트워크 오류:', error);
          // 사용자에게 오류 알림
          if (typeof alert !== 'undefined') {
            // alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
          }
        })`;
      }
      return match;
    });
    
    // 5. localStorage try-catch 래핑
    const localStorageRegex = /localStorage\.(getItem|setItem|removeItem)\([^)]+\)/g;
    content = content.replace(localStorageRegex, (match) => {
      if (!content.includes('try {' + match)) {
        improvements.errorHandling++;
        modified = true;
        return `(function() { try { return ${match}; } catch(e) { console.error('Storage error:', e); return null; } })()`;
      }
      return match;
    });
    
    // 6. 커스텀 스크롤바 스타일 추가
    if (!content.includes('::-webkit-scrollbar')) {
      content = content.replace('</head>', scrollbarStyle + '\n</head>');
      improvements.scrollbar++;
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${file} 개선 완료`);
    } else {
      console.log(`⏭️  ${file} 개선사항 없음`);
    }
  }
});

console.log('\n📊 개선 통계:');
console.log(`  - 버튼 type 속성 추가: ${improvements.buttons}개`);
console.log(`  - 이미지 alt 속성 추가: ${improvements.images}개`);
console.log(`  - 입력 필드 접근성 개선: ${improvements.inputs}개`);
console.log(`  - 에러 핸들링 강화: ${improvements.errorHandling}개`);
console.log(`  - 커스텀 스크롤바 추가: ${improvements.scrollbar}개`);
console.log('\n✨ 모든 개선사항 적용 완료!');