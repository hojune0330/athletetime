# 모바일 이미지 다운로드 개선 제안

## 현재 문제점
1. **스크린샷처럼 보임** - 전체 탭 컨텐츠를 그대로 캡처
2. **불필요한 요소 포함** - 버튼, 패딩, 배경 등
3. **모바일에서 잘림** - 긴 컨텐츠가 잘려서 저장됨
4. **낮은 품질** - 텍스트가 흐릿하게 보일 수 있음

## 개선 방안

### 1. 📊 차트별 개별 다운로드
- 현재: 전체 탭 다운로드
- 개선: 각 차트/테이블별 다운로드 버튼
- 장점: 원하는 차트만 선택적으로 저장

### 2. 🎨 다운로드 전용 스타일
```javascript
// 다운로드시 임시 스타일 적용
const downloadElement = element.cloneNode(true);
downloadElement.classList.add('download-mode');
```
- 불필요한 패딩/마진 제거
- 깔끔한 배경
- 타이틀과 날짜 추가

### 3. 📱 모바일 최적화 레이아웃
- **테이블 완전 펼치기**: 스크롤 없이 전체 표시
- **고정 헤더 해제**: 다운로드시 sticky 해제
- **적절한 크기 조정**: 모바일 화면에 맞춤

### 4. 🏷️ 헤더/푸터 추가
```javascript
// 다운로드용 헤더 추가
const header = `
  <div class="download-header">
    <h1>페이스 계산기 - ${chartName}</h1>
    <p>생성일: ${new Date().toLocaleDateString()}</p>
    <p>기준: ${baseRecord}</p>
  </div>
`;
```

### 5. 📈 SVG 차트 옵션
- Canvas 대신 SVG로 차트 생성
- 벡터 그래픽으로 고품질 유지
- Chart.js 또는 D3.js 활용

### 6. 🖼️ 포맷 옵션 추가
- **PNG**: 일반 이미지
- **SVG**: 벡터 이미지 (확대해도 깨지지 않음)
- **PDF**: 인쇄용 고품질
- **CSV**: 데이터만 추출

### 7. 📏 크기 옵션
```javascript
const sizeOptions = {
  'mobile': { width: 1080, height: 1920 },  // 인스타그램 스토리
  'square': { width: 1080, height: 1080 },  // 인스타그램 피드
  'a4': { width: 2480, height: 3508 },      // A4 인쇄용
  'custom': { width: custom, height: custom }
};
```

## 구현 예시

### 개선된 다운로드 함수
```javascript
async function downloadChart(chartElement, chartName, format = 'png') {
  // 1. 다운로드용 요소 생성
  const downloadContainer = document.createElement('div');
  downloadContainer.className = 'download-container';
  downloadContainer.style.cssText = `
    background: white;
    padding: 40px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `;
  
  // 2. 헤더 추가
  const header = document.createElement('div');
  header.innerHTML = `
    <h1 style="font-size: 24px; margin-bottom: 10px;">애슬리트 타임 페이스 차트</h1>
    <p style="color: #666; margin-bottom: 20px;">
      ${chartName} | ${new Date().toLocaleDateString('ko-KR')}
    </p>
  `;
  downloadContainer.appendChild(header);
  
  // 3. 차트 복사 (스타일 정리)
  const chartClone = chartElement.cloneNode(true);
  // 스크롤 컨테이너 펼치기
  chartClone.querySelectorAll('.mobile-table-container').forEach(container => {
    container.style.overflow = 'visible';
    container.style.width = 'auto';
  });
  // 고정 열 해제
  chartClone.querySelectorAll('[style*="sticky"]').forEach(el => {
    el.style.position = 'static';
  });
  downloadContainer.appendChild(chartClone);
  
  // 4. 푸터 추가
  const footer = document.createElement('div');
  footer.innerHTML = `
    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      © 2024 Athlete Time | athletetime.com
    </p>
  `;
  downloadContainer.appendChild(footer);
  
  // 5. 임시로 DOM에 추가
  document.body.appendChild(downloadContainer);
  
  // 6. 캡처
  const canvas = await html2canvas(downloadContainer, {
    scale: 3,  // 고해상도
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1200,  // 넓은 뷰포트로 렌더링
    windowHeight: 1600
  });
  
  // 7. 다운로드
  if (format === 'png') {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `athletetime-${chartName}-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });
  }
  
  // 8. 정리
  document.body.removeChild(downloadContainer);
}
```

### 모바일 UI 개선
```html
<!-- 각 차트에 다운로드 버튼 추가 -->
<div class="chart-header">
  <h2>3000m 장애물</h2>
  <button onclick="downloadThisChart()" class="download-btn">
    <i class="fas fa-download"></i>
  </button>
</div>
```

## 추천 우선순위
1. ⭐ **차트별 개별 다운로드** - 가장 효과적
2. ⭐ **다운로드 전용 스타일** - 깔끔한 이미지
3. ⭐ **헤더/푸터 추가** - 전문적인 느낌
4. 테이블 완전 펼치기 - 모든 데이터 표시
5. 크기 옵션 - SNS 공유용