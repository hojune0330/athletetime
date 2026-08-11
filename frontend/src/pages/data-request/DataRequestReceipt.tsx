import { Button } from '../../components/ui/button';
import { CORRECTION_POLICY } from '../../config/dataPolicy';
import type { DataRequestReceipt as Receipt } from '../../api/dataRequests';

interface DataRequestReceiptProps {
  readonly receipt: Receipt;
  readonly onLookup: (ticketId: string) => void;
  readonly onNewRequest: () => void;
}

export function DataRequestReceipt({ receipt, onLookup, onNewRequest }: DataRequestReceiptProps) {
  return (
    <div className="mx-auto max-w-article px-4 py-10">
      <div className="border border-hair bg-surface">
        <div className="border-b border-hair bg-surface-2 px-5 py-3">
          <span className="text-body-sm font-semibold text-ok">접수 완료</span>
          <h1 className="mt-1 text-h2 font-medium tracking-tighter-2 text-ink">요청이 접수되었습니다</h1>
        </div>
        <div className="space-y-5 px-5 py-6">
          <div>
            <p className="text-caption uppercase tracking-wider-2 text-ink-4">접수 번호</p>
            <p className="mt-1 font-mono text-h2 font-medium text-brand-500">{receipt.ticketId}</p>
            <p className="mt-2 text-body-sm text-ink-3">이 번호로 처리 상태를 확인하실 수 있습니다. 캡처하거나 메모해 두세요.</p>
          </div>
          <div className="border-t border-hair pt-4 text-body-sm text-ink-3">
            <p>{CORRECTION_POLICY.slaNotice} 별도의 개별 회신은 드리지 않을 수 있어요. 진행 상황은 접수 번호 조회로 확인해 주세요.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => onLookup(receipt.ticketId)}>상태 조회로 이동</Button>
            <Button variant="ghost" onClick={onNewRequest}>새 요청 작성</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
