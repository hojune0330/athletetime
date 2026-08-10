import { Card, CardContent } from '../ui/card';

export function CompareErrorNotice({
  title,
  body,
  onClose,
}: {
  readonly title: string;
  readonly body?: string;
  readonly onClose?: () => void;
}) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-sm font-medium text-ink">{title}</p>
        {body ? <p className="mt-1 text-xs text-ink-3">{body}</p> : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 min-h-11 whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-sm text-ink-3 transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            닫기
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CompareInlineNotice({ title, body }: { readonly title: string; readonly body?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-4 py-6 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {body ? <p className="mt-1 text-xs text-ink-3">{body}</p> : null}
    </div>
  );
}
