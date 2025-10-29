// 애슬리트 타임 PWA 아이콘 생성기
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, 'public', 'icons');

// SVG 아이콘 디자인 (치지직 스타일)
const iconSVG = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00ffa3;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge> 
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/> 
      </feMerge>
    </filter>
  </defs>
  
  <!-- 배경 -->
  <rect width="512" height="512" rx="112" fill="#0f0f0f"/>
  
  <!-- 러너 실루엣 -->
  <g filter="url(#shadow)" transform="translate(256, 256)">
    <!-- 몸통 -->
    <ellipse cx="0" cy="-20" rx="40" ry="60" fill="url(#gradient)"/>
    
    <!-- 머리 -->
    <circle cx="0" cy="-100" r="35" fill="url(#gradient)"/>
    
    <!-- 왼쪽 팔 (앞으로) -->
    <path d="M -30 -40 Q -60 -20 -70 20" stroke="url(#gradient)" stroke-width="18" fill="none" stroke-linecap="round"/>
    
    <!-- 오른쪽 팔 (뒤로) -->
    <path d="M 30 -40 Q 60 -20 70 -80" stroke="url(#gradient)" stroke-width="18" fill="none" stroke-linecap="round"/>
    
    <!-- 왼쪽 다리 (뒤로) -->
    <path d="M -15 20 Q -20 60 -30 100" stroke="url(#gradient)" stroke-width="20" fill="none" stroke-linecap="round"/>
    
    <!-- 오른쪽 다리 (앞으로, 들어올림) -->
    <path d="M 15 20 Q 40 50 50 80 Q 55 95 60 110" stroke="url(#gradient)" stroke-width="20" fill="none" stroke-linecap="round"/>
  </g>
  
  <!-- 속도 라인 효과 -->
  <g opacity="0.4">
    <line x1="100" y1="200" x2="50" y2="200" stroke="#00ffa3" stroke-width="4" stroke-linecap="round"/>
    <line x1="110" y1="240" x2="60" y2="240" stroke="#00ffa3" stroke-width="3" stroke-linecap="round"/>
    <line x1="105" y1="280" x2="55" y2="280" stroke="#00ffa3" stroke-width="3" stroke-linecap="round"/>
  </g>
  
  <!-- AT 텍스트 (하단) -->
  <text x="256" y="440" font-family="Arial, sans-serif" font-size="60" font-weight="bold" 
        fill="url(#gradient)" text-anchor="middle">AT</text>
</svg>
`;

async function generateIcons() {
  console.log('🎨 애슬리트 타임 PWA 아이콘 생성 시작...\n');

  // SVG 파일 저장
  const svgPath = path.join(OUTPUT_DIR, 'icon.svg');
  fs.writeFileSync(svgPath, iconSVG);
  console.log('✅ SVG 원본 생성 완료');

  // 모든 크기의 PNG 생성
  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    
    await sharp(Buffer.from(iconSVG))
      .resize(size, size, {
        fit: 'contain',
        background: { r: 15, g: 15, b: 15, alpha: 1 }
      })
      .png({ quality: 100 })
      .toFile(outputPath);
    
    console.log(`✅ ${size}x${size} 아이콘 생성 완료`);
  }

  // Apple Touch Icon (180x180)
  const appleTouchIconPath = path.join(OUTPUT_DIR, 'apple-touch-icon.png');
  await sharp(Buffer.from(iconSVG))
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 15, g: 15, b: 15, alpha: 1 }
    })
    .png({ quality: 100 })
    .toFile(appleTouchIconPath);
  console.log('✅ Apple Touch Icon (180x180) 생성 완료');

  // Favicon (32x32, 16x16)
  for (const size of [32, 16]) {
    const faviconPath = path.join(OUTPUT_DIR, `favicon-${size}x${size}.png`);
    await sharp(Buffer.from(iconSVG))
      .resize(size, size, {
        fit: 'contain',
        background: { r: 15, g: 15, b: 15, alpha: 1 }
      })
      .png({ quality: 100 })
      .toFile(faviconPath);
    console.log(`✅ Favicon ${size}x${size} 생성 완료`);
  }

  // 특수 아이콘들 (채팅, 페이스, 커뮤니티)
  await generateSpecialIcons();

  console.log('\n🎉 모든 아이콘 생성 완료!');
  console.log(`📁 저장 위치: ${OUTPUT_DIR}`);
}

async function generateSpecialIcons() {
  // 채팅 아이콘
  const chatIconSVG = `
  <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00ffa3;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="192" height="192" rx="42" fill="#0f0f0f"/>
    <path d="M 50 60 L 142 60 L 142 110 L 96 110 L 70 130 L 70 110 L 50 110 Z" 
          fill="url(#gradient)" stroke="url(#gradient)" stroke-width="4"/>
    <circle cx="75" cy="85" r="8" fill="#0f0f0f"/>
    <circle cx="96" cy="85" r="8" fill="#0f0f0f"/>
    <circle cx="117" cy="85" r="8" fill="#0f0f0f"/>
  </svg>`;
  
  await sharp(Buffer.from(chatIconSVG))
    .resize(192, 192)
    .png()
    .toFile(path.join(OUTPUT_DIR, 'chat-icon.png'));
  console.log('✅ 채팅 특수 아이콘 생성 완료');

  // 페이스 아이콘
  const paceIconSVG = `
  <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00ffa3;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="192" height="192" rx="42" fill="#0f0f0f"/>
    <circle cx="96" cy="96" r="50" fill="none" stroke="url(#gradient)" stroke-width="6"/>
    <line x1="96" y1="96" x2="96" y2="60" stroke="url(#gradient)" stroke-width="4" stroke-linecap="round"/>
    <line x1="96" y1="96" x2="120" y2="96" stroke="url(#gradient)" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
  
  await sharp(Buffer.from(paceIconSVG))
    .resize(192, 192)
    .png()
    .toFile(path.join(OUTPUT_DIR, 'pace-icon.png'));
  console.log('✅ 페이스 특수 아이콘 생성 완료');

  // 커뮤니티 아이콘
  const communityIconSVG = `
  <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#00ffa3;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="192" height="192" rx="42" fill="#0f0f0f"/>
    <circle cx="96" cy="80" r="18" fill="url(#gradient)"/>
    <circle cx="60" cy="100" r="15" fill="url(#gradient)" opacity="0.7"/>
    <circle cx="132" cy="100" r="15" fill="url(#gradient)" opacity="0.7"/>
    <path d="M 96 100 Q 96 130 96 140" stroke="url(#gradient)" stroke-width="6" stroke-linecap="round"/>
    <path d="M 60 115 Q 60 135 60 145" stroke="url(#gradient)" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
    <path d="M 132 115 Q 132 135 132 145" stroke="url(#gradient)" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
  </svg>`;
  
  await sharp(Buffer.from(communityIconSVG))
    .resize(192, 192)
    .png()
    .toFile(path.join(OUTPUT_DIR, 'community-icon.png'));
  console.log('✅ 커뮤니티 특수 아이콘 생성 완료');
}

// 실행
generateIcons().catch(console.error);
