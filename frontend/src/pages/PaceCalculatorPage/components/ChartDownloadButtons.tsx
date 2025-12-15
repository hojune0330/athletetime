import React, { useCallback } from 'react';

interface ChartDownloadButtonsProps {
  chartId: string;
  filename: string;
}

export const ChartDownloadButtons: React.FC<ChartDownloadButtonsProps> = ({ 
  chartId, 
  filename 
}) => {
  const downloadChart = useCallback(async (format: 'png' | 'pdf') => {
    const element = document.getElementById(chartId);
    if (!element) return;
    
    try {
      // html2canvas 동적 import
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (format === 'pdf') {
        // jsPDF 동적 import
        const { jsPDF } = await import('jspdf');
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${filename}.pdf`);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  }, [chartId, filename]);
  
  const printChart = useCallback(() => {
    const element = document.getElementById(chartId);
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${filename}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { padding: 20px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }, [chartId, filename]);

  return (
    <div className="download-btn no-print flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => downloadChart('png')}
        className="btn btn-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
      >
        <i className="fas fa-image mr-1"></i>
        <span className="hidden md:inline">PNG</span>
      </button>
      <button
        type="button"
        onClick={() => downloadChart('pdf')}
        className="btn btn-sm bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
      >
        <i className="fas fa-file-pdf mr-1"></i>
        <span className="hidden md:inline">PDF</span>
      </button>
      <button
        type="button"
        onClick={printChart}
        className="btn btn-sm bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700"
      >
        <i className="fas fa-print mr-1"></i>
        <span className="hidden md:inline">인쇄</span>
      </button>
    </div>
  );
};

export default ChartDownloadButtons;
