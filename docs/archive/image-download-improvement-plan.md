# 모바일 이미지 다운로드 개선 제안서

## 현재 문제점
1. **스크린샷 방식**: html2canvas가 화면에 보이는 대로만 캡처
2. **해상도 문제**: 모바일 화면 크기에 제한되어 저해상도
3. **잘림 현상**: 스크롤 영역이 포함되지 않음
4. **품질 저하**: 텍스트가 흐릿하거나 깨짐

## 개선 방안

### 방안 1: 전용 다운로드 뷰 생성 ⭐️ (추천)
```javascript
// 다운로드용 숨겨진 컨테이너 생성
function createDownloadView() {
  const downloadContainer = document.createElement('div');
  downloadContainer.style.cssText = `
    position: absolute;
    left: -9999px;
    width: 1200px;  // 고정 너비
    background: white;
  `;
  
  // 현재 데이터로 깔끔한 레이아웃 생성
  downloadContainer.innerHTML = generateCleanLayout(currentData);
  document.body.appendChild(downloadContainer);
  
  // html2canvas로 캡처
  html2canvas(downloadContainer, {
    scale: 2,
    width: 1200,
    height: downloadContainer.scrollHeight
  }).then(canvas => {
    // 다운로드 처리
    document.body.removeChild(downloadContainer);
  });
}
```

### 방안 2: 서버사이드 렌더링 (Puppeteer/Playwright)
```javascript
// 서버에서 고품질 이미지 생성
async function serverSideCapture(data) {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  const blob = await response.blob();
  downloadBlob(blob, 'pace-chart.png');
}
```

### 방안 3: Canvas 직접 그리기 ⭐️
```javascript
// 순수 Canvas API로 차트 그리기
function drawPaceChart(data) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // A4 크기 설정
  canvas.width = 2480;  // A4 300dpi
  canvas.height = 3508;
  
  // 고품질 차트 그리기
  drawHeader(ctx);
  drawTable(ctx, data);
  drawFooter(ctx);
  
  // 다운로드
  canvas.toBlob(blob => {
    saveAs(blob, 'pace-chart.png');
  });
}
```

### 방안 4: SVG 생성 후 변환
```javascript
// SVG로 벡터 그래픽 생성
function createSVGChart(data) {
  const svg = `
    <svg width="1200" height="1600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      ${generateSVGTable(data)}
    </svg>
  `;
  
  // SVG를 이미지로 변환
  const blob = new Blob([svg], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob(blob => {
      saveAs(blob, 'pace-chart.png');
    });
  };
  img.src = url;
}
```

### 방안 5: 모바일 전용 최적화
```javascript
// 모바일 특화 개선
function mobileOptimizedDownload() {
  // 1. 뷰포트 임시 변경
  const originalViewport = document.querySelector('meta[name=viewport]').content;
  document.querySelector('meta[name=viewport]').content = 'width=1200';
  
  // 2. 전체 페이지 캡처
  html2canvas(document.body, {
    scrollY: -window.scrollY,
    windowWidth: 1200,
    windowHeight: document.body.scrollHeight
  }).then(canvas => {
    // 3. 뷰포트 복원
    document.querySelector('meta[name=viewport]').content = originalViewport;
  });
}
```

## 추천 구현 순서

### 1단계: 즉시 적용 가능 (방안 1)
- 다운로드 전용 레이아웃 생성
- 고정 크기로 렌더링
- 모든 데이터 포함

### 2단계: 품질 개선 (방안 3)
- Canvas API로 직접 그리기
- 커스텀 폰트 적용
- 고해상도 출력

### 3단계: 고급 기능 (방안 4)
- SVG 벡터 그래픽
- 확대해도 깨지지 않음
- 파일 크기 작음

## 구현 예시: 다운로드 전용 뷰

```javascript
async function downloadHighQualityImage() {
  // 로딩 표시
  showLoading('고품질 이미지 생성 중...');
  
  // 다운로드용 컨테이너 생성
  const container = document.createElement('div');
  container.className = 'download-container';
  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: 1200px;
    padding: 40px;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `;
  
  // 헤더
  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 32px; margin: 0;">페이스 계산기 차트</h1>
      <p style="color: #666; margin: 10px 0;">생성일: ${new Date().toLocaleDateString()}</p>
    </div>
  `;
  
  // 현재 활성 탭의 데이터 추가
  const activeContent = document.querySelector('.tab-content:not(.hidden)').cloneNode(true);
  
  // 스타일 정리
  activeContent.querySelectorAll('*').forEach(el => {
    el.style.fontSize = '14px';
    if (el.tagName === 'TABLE') {
      el.style.width = '100%';
      el.style.borderCollapse = 'collapse';
    }
    if (el.tagName === 'TD' || el.tagName === 'TH') {
      el.style.padding = '8px';
      el.style.border = '1px solid #ddd';
    }
  });
  
  container.appendChild(activeContent);
  document.body.appendChild(container);
  
  try {
    // 고해상도 캡처
    const canvas = await html2canvas(container, {
      scale: 3, // 3배 해상도
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      windowHeight: container.scrollHeight
    });
    
    // 다운로드
    canvas.toBlob(blob => {
      const link = document.createElement('a');
      link.download = `pace-chart-${Date.now()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }, 'image/png', 1.0);
    
  } catch (error) {
    console.error('Download failed:', error);
    alert('다운로드 중 오류가 발생했습니다.');
  } finally {
    document.body.removeChild(container);
    hideLoading();
  }
}
```

## 추가 개선사항

### PDF 다운로드 개선
```javascript
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // 커스텀 폰트 추가
  pdf.addFont('NotoSansKR', 'normal');
  pdf.setFont('NotoSansKR');
  
  // 테이블 플러그인 사용
  pdf.autoTable({
    head: [headers],
    body: tableData,
    styles: { font: 'NotoSansKR' },
    headStyles: { fillColor: [102, 126, 234] }
  });
  
  pdf.save('pace-chart.pdf');
}
```

### 공유 기능 추가
```javascript
async function shareImage() {
  const blob = await generateImageBlob();
  
  if (navigator.share) {
    const file = new File([blob], 'pace-chart.png', { type: 'image/png' });
    await navigator.share({
      files: [file],
      title: '페이스 차트',
      text: '내 훈련 페이스 차트'
    });
  }
}
```

## 결론

**즉시 적용 추천**: 방안 1 (다운로드 전용 뷰)
- 구현 난이도: 낮음
- 품질 향상: 높음
- 호환성: 모든 브라우저

**장기적 추천**: 방안 3 (Canvas 직접 그리기)
- 최고 품질
- 완전한 제어
- 파일 크기 최적화