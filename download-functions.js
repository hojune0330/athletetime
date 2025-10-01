    // 차트 다운로드 기능 (완전 개선)
    async function downloadChart(elementId, filename, format = 'png') {
      try {
        const downloadBtn = document.querySelector(`#${elementId} .download-btn`);
        if (downloadBtn) downloadBtn.style.display = 'none';
        
        const element = document.getElementById(elementId);
        const timestamp = new Date().toISOString().slice(0,10);
        const credit = 'AthleteTime_장호준코치제작';
        const fullFilename = `${credit}_${filename}_${timestamp}`;
        
        if (format === 'pdf') {
          await downloadPDF(element, fullFilename);
        } else {
          await downloadPNG(element, fullFilename);
        }
        
        if (downloadBtn) downloadBtn.style.display = 'flex';
        
      } catch (error) {
        console.error('차트 다운로드 실패:', error);
        alert('차트 다운로드에 실패했습니다. 다시 시도해주세요.');
        const downloadBtn = document.querySelector(`#${elementId} .download-btn`);
        if (downloadBtn) downloadBtn.style.display = 'flex';
      }
    }
    
    // PNG 다운로드 함수
    async function downloadPNG(element, filename) {
      const watermarks = element.querySelectorAll('.watermark-text');
      watermarks.forEach(wm => {
        wm.style.setProperty('color', 'rgba(0,0,0,0.35)', 'important');
      });
      
      const scale = 2;
      const dataUrl = await domtoimage.toPng(element, {
        width: element.offsetWidth * scale,
        height: element.offsetHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        },
        filter: (node) => {
          return !node.classList || !node.classList.contains('download-btn');
        }
      });
      
      watermarks.forEach(wm => {
        wm.style.setProperty('color', 'rgba(0,0,0,0.25)', 'important');
      });
      
      const link = document.createElement('a');
      link.download = filename + '.png';
      link.href = dataUrl;
      link.click();
    }
    
    // PDF 다운로드 함수
    async function downloadPDF(element, filename) {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const watermarks = element.querySelectorAll('.watermark-text');
      watermarks.forEach(wm => {
        wm.style.setProperty('color', 'rgba(0,0,0,0.35)', 'important');
      });
      
      const dataUrl = await domtoimage.toPng(element, {
        width: element.offsetWidth * 2,
        height: element.offsetHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left'
        },
        filter: (node) => {
          return !node.classList || !node.classList.contains('download-btn');
        }
      });
      
      watermarks.forEach(wm => {
        wm.style.setProperty('color', 'rgba(0,0,0,0.25)', 'important');
      });
      
      const imgWidth = 277;
      const imgHeight = (element.offsetHeight * imgWidth) / element.offsetWidth;
      
      let finalWidth = imgWidth;
      let finalHeight = imgHeight;
      
      if (imgHeight > 190) {
        finalHeight = 190;
        finalWidth = (element.offsetWidth * finalHeight) / element.offsetHeight;
      }
      
      const x = (297 - finalWidth) / 2;
      const y = 10;
      
      pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
      
      pdf.setProperties({
        title: filename,
        subject: 'Running Pace Chart',
        author: '장호준 코치',
        keywords: 'running, pace, athlete time',
        creator: 'ATHLETE TIME'
      });
      
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text('© ATHLETE TIME · 제작: 장호준 코치', 148.5, 200, { align: 'center' });
      
      pdf.save(filename + '.pdf');
    }
    
    // 차트 인쇄 함수
    function printChart(elementId) {
      const element = document.getElementById(elementId);
      const printWindow = window.open('', 'PRINT', 'width=1200,height=800');
      
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>애슬리트 타임 - 페이스 차트</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 15mm;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif;
                margin: 0;
                padding: 20px;
              }
              .download-btn { display: none !important; }
              .watermark-text { color: rgba(0,0,0,0.12) !important; }
              table {
                border-collapse: collapse;
                width: 100%;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 6px;
                text-align: center;
              }
              th {
                background-color: #f3f4f6;
                font-weight: bold;
              }
              .highlight-row { background-color: #fef3c7; }
              .sub-highlight { background-color: #dbeafe; }
              @media print {
                body { 
                  print-color-adjust: exact; 
                  -webkit-print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            ${element.innerHTML}
            <div style="text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd;">
              © ATHLETE TIME · 제작: 장호준 코치 · ${new Date().toLocaleDateString('ko-KR')}
            </div>
          </body>
        </html>
      `;
      
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
