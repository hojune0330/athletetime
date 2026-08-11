import React, { useCallback, useState } from 'react';
import { log } from '@/lib/log';

type ExportFormat = 'png' | 'pdf';

interface ChartDownloadButtonsProps {
  readonly chartId: string;
  readonly filename: string;
}

export const ChartDownloadButtons: React.FC<ChartDownloadButtonsProps> = ({ chartId, filename }) => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState('');

  const downloadChart = useCallback(async (format: ExportFormat) => {
    const element = document.getElementById(chartId);
    if (!element) {
      setError('표를 찾지 못해 파일을 만들 수 없어요. 화면을 새로고침한 뒤 다시 시도해 주세요.');
      return;
    }

    setError('');
    setActiveFormat(format);
    try {
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
        return;
      }

      const { jsPDF } = await import('jspdf');
      const image = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(image, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${filename}.pdf`);
    } catch (caughtError) {
      log.error('Chart download failed:', caughtError);
      setError('파일을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setActiveFormat(null);
    }
  }, [chartId, filename]);

  const printChart = useCallback(() => {
    const element = document.getElementById(chartId);
    if (!element) {
      setError('표를 찾지 못해 인쇄할 수 없어요. 화면을 새로고침한 뒤 다시 시도해 주세요.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('인쇄 창을 열지 못했어요. 브라우저의 팝업 차단을 확인해 주세요.');
      return;
    }

    setError('');
    printWindow.document.write(`
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { padding: 20px; color: #111827; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 6px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${element.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }, [chartId, filename]);

  return (
    <div className="no-print">
      <div className="flex flex-wrap gap-2">
        <ExportButton label="PNG 저장" onClick={() => downloadChart('png')} disabled={activeFormat !== null} />
        <ExportButton label="PDF 저장" onClick={() => downloadChart('pdf')} disabled={activeFormat !== null} />
        <ExportButton label="인쇄" onClick={printChart} disabled={activeFormat !== null} />
      </div>
      {activeFormat && <p className="mt-2 text-caption text-ink-3">{activeFormat.toUpperCase()} 파일을 준비하고 있어요.</p>}
      {error && <p role="alert" className="mt-2 text-body-sm text-err">{error}</p>}
    </div>
  );
};

function ExportButton({ label, onClick, disabled }: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-9 border border-line bg-surface px-3 font-mono text-[10px] font-medium tracking-widest-1 text-ink transition-colors hover:bg-surface-2 disabled:cursor-wait disabled:text-ink-4"
    >
      {label}
    </button>
  );
}

export default ChartDownloadButtons;
