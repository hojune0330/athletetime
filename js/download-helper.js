// 개선된 다운로드 헬퍼 함수들

// 고품질 이미지 다운로드 (다운로드 전용 뷰 생성)
async function downloadHighQualityImage(contentType) {
  // 로딩 표시
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'download-loading';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 30px;
    border-radius: 10px;
    z-index: 10000;
    font-size: 16px;
  `;
  loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 고품질 이미지 생성 중...';
  document.body.appendChild(loadingDiv);
  
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
    font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif;
  `;
  
  // 헤더 추가
  const headerHtml = `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
      <h1 style="font-size: 36px; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
        페이스 계산기 & 차트
      </h1>
      <p style="color: #6b7280; margin: 10px 0; font-size: 16px;">
        ATHLETE TIME | ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  `;
  
  container.innerHTML = headerHtml;
  
  // 현재 활성 컨텐츠 가져오기
  let contentToCapture;
  
  if (contentType === 'current') {
    // 현재 보이는 탭의 내용
    contentToCapture = document.querySelector('.tab-content:not(.hidden)').cloneNode(true);
  } else if (contentType === 'all') {
    // 모든 차트 포함
    contentToCapture = document.createElement('div');
    
    // 각 차트를 순서대로 추가
    const charts = ['steeplechase-chart', 'lap400-chart', 'pace1000-chart', 'lane-chart'];
    charts.forEach(chartId => {
      const chart = document.getElementById(chartId);
      if (chart) {
        const chartClone = chart.cloneNode(true);
        chartClone.style.marginBottom = '30px';
        chartClone.style.pageBreakInside = 'avoid';
        contentToCapture.appendChild(chartClone);
      }
    });
  }
  
  // 스타일 정리 및 최적화
  if (contentToCapture) {
    // 모든 테이블 스타일 통일
    contentToCapture.querySelectorAll('table').forEach(table => {
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '14px';
      table.style.marginBottom = '20px';
    });
    
    // 테이블 셀 스타일
    contentToCapture.querySelectorAll('td, th').forEach(cell => {
      cell.style.padding = '10px';
      cell.style.border = '1px solid #e5e7eb';
      cell.style.textAlign = 'center';
    });
    
    // 헤더 셀 강조
    contentToCapture.querySelectorAll('th').forEach(th => {
      th.style.background = '#f3f4f6';
      th.style.fontWeight = 'bold';
    });
    
    // 하이라이트 행 처리
    contentToCapture.querySelectorAll('.highlight-row').forEach(row => {
      row.style.background = '#fef3c7';
    });
    
    // 모바일 전용 클래스 제거
    contentToCapture.querySelectorAll('.mobile-table-container').forEach(container => {
      container.style.overflow = 'visible';
      container.style.margin = '0';
      container.style.padding = '0';
    });
    
    // 스크롤 인디케이터 제거
    contentToCapture.querySelectorAll('.scroll-indicator-left, .scroll-indicator-right').forEach(el => {
      el.remove();
    });
    
    // 다운로드 버튼 제거
    contentToCapture.querySelectorAll('.download-group, .no-print').forEach(el => {
      el.remove();
    });
    
    container.appendChild(contentToCapture);
  }
  
  // 푸터 추가
  const footerHtml = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
      <p>© 2024 애슬리트 타임 | 한국 육상인들을 위한 페이스 계산기</p>
      <p style="margin-top: 5px;">Based on Jack Daniels VDOT Training Formula</p>
    </div>
  `;
  
  container.innerHTML += footerHtml;
  document.body.appendChild(container);
  
  try {
    // 고해상도 캡처 (3배 스케일)
    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      windowHeight: container.scrollHeight,
      onclone: (clonedDoc) => {
        // 클론된 문서에서 추가 스타일 조정
        clonedDoc.querySelectorAll('*').forEach(el => {
          if (el.style) {
            el.style.webkitFontSmoothing = 'antialiased';
            el.style.textRendering = 'optimizeLegibility';
          }
        });
      }
    });
    
    // PNG 다운로드
    canvas.toBlob(blob => {
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `pace-chart-${timestamp}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      // URL 정리
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }, 'image/png', 1.0);
    
  } catch (error) {
    console.error('Download failed:', error);
    alert('다운로드 중 오류가 발생했습니다.');
  } finally {
    // 정리
    document.body.removeChild(container);
    document.body.removeChild(loadingDiv);
  }
}

// 개선된 PDF 다운로드
async function downloadHighQualityPDF(contentType) {
  const { jsPDF } = window.jspdf;
  
  // A4 가로 방향
  const pdf = new jsPDF('l', 'mm', 'a4');
  
  // 제목 추가
  pdf.setFontSize(24);
  pdf.text('페이스 계산기 & 차트', pdf.internal.pageSize.width / 2, 20, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setTextColor(100);
  pdf.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, pdf.internal.pageSize.width / 2, 30, { align: 'center' });
  
  // 현재 활성 탭의 테이블 데이터 추출
  const activeContent = document.querySelector('.tab-content:not(.hidden)');
  const tables = activeContent.querySelectorAll('table');
  
  let yPosition = 40;
  
  tables.forEach((table, index) => {
    if (yPosition > 150) {
      pdf.addPage();
      yPosition = 20;
    }
    
    // 테이블 제목 찾기
    const title = table.closest('div').querySelector('h2, h3')?.textContent || `차트 ${index + 1}`;
    pdf.setFontSize(14);
    pdf.setTextColor(0);
    pdf.text(title, 15, yPosition);
    yPosition += 10;
    
    // 테이블 데이터 추출
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
      Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
    );
    
    // autoTable 플러그인이 없으면 간단한 테이블 그리기
    const cellWidth = (pdf.internal.pageSize.width - 30) / headers.length;
    const cellHeight = 8;
    
    // 헤더 그리기
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, yPosition, pdf.internal.pageSize.width - 30, cellHeight, 'F');
    pdf.setFontSize(10);
    headers.forEach((header, i) => {
      pdf.text(header, 15 + i * cellWidth + cellWidth / 2, yPosition + 5, { align: 'center' });
    });
    
    yPosition += cellHeight;
    
    // 데이터 행 그리기
    rows.forEach((row, rowIndex) => {
      if (yPosition > 180) {
        pdf.addPage();
        yPosition = 20;
      }
      
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(15, yPosition, pdf.internal.pageSize.width - 30, cellHeight, 'F');
      }
      
      row.forEach((cell, i) => {
        pdf.text(cell, 15 + i * cellWidth + cellWidth / 2, yPosition + 5, { align: 'center' });
      });
      
      yPosition += cellHeight;
    });
    
    yPosition += 10;
  });
  
  // 푸터
  pdf.setFontSize(10);
  pdf.setTextColor(150);
  pdf.text('© 2024 애슬리트 타임', pdf.internal.pageSize.width / 2, pdf.internal.pageSize.height - 10, { align: 'center' });
  
  // 다운로드
  const timestamp = new Date().toISOString().slice(0, 10);
  pdf.save(`pace-chart-${timestamp}.pdf`);
}

// 공유 기능 (Web Share API)
async function shareChart() {
  if (!navigator.share) {
    alert('이 브라우저는 공유 기능을 지원하지 않습니다.');
    return;
  }
  
  try {
    // 이미지 생성
    const canvas = await generateCanvasForShare();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'pace-chart.png', { type: 'image/png' });
    
    // 공유
    await navigator.share({
      files: [file],
      title: '페이스 차트',
      text: '내 훈련 페이스 차트를 확인해보세요!'
    });
  } catch (error) {
    console.error('Share failed:', error);
  }
}

// 간단한 캔버스 생성 (공유용)
async function generateCanvasForShare() {
  const activeContent = document.querySelector('.tab-content:not(.hidden)').cloneNode(true);
  
  const tempDiv = document.createElement('div');
  tempDiv.style.cssText = 'position: fixed; left: -10000px; width: 800px; padding: 20px; background: white;';
  tempDiv.appendChild(activeContent);
  document.body.appendChild(tempDiv);
  
  const canvas = await html2canvas(tempDiv, {
    scale: 2,
    backgroundColor: '#ffffff'
  });
  
  document.body.removeChild(tempDiv);
  return canvas;
}