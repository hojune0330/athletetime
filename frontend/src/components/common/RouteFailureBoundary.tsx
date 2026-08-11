import { Component, type ReactNode } from 'react';

type RouteFailureBoundaryProps = Readonly<{
  children: ReactNode;
}>;

type RouteFailureBoundaryState = Readonly<{
  failed: boolean;
}>;

type RouteFailureFallbackProps = Readonly<{
  onRetry: () => void;
}>;

export function RouteFailureFallback({ onRetry }: RouteFailureFallbackProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-12 text-center">
      <p className="text-sm font-semibold text-teal-700">ATHLETETIME</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-950">화면을 다시 열지 못했어요</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        잠시 후 다시 시도하거나, 기록 찾기에서 원하는 정보를 이어서 확인해 보세요.
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <button type="button" className="min-h-11 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white" onClick={onRetry}>
          다시 시도
        </button>
        <a className="min-h-11 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800" href="/records">
          기록 찾기
        </a>
        <a className="min-h-11 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800" href="/">
          홈으로
        </a>
      </div>
    </main>
  );
}

export class RouteFailureBoundary extends Component<RouteFailureBoundaryProps, RouteFailureBoundaryState> {
  state: RouteFailureBoundaryState = { failed: false };

  static getDerivedStateFromError(): RouteFailureBoundaryState {
    return { failed: true };
  }

  private handleRetry = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.failed) {
      return <RouteFailureFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}
