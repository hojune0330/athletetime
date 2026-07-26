import { useEffect, useRef, useState } from 'react';
import {
  confirmNewsSource, dismissNewsDiscovery, linkNewsDiscoveryCalendar, listNewsDiscoveries, listNewsDiscoveryRuns,
  runNewsDiscovery, startNewsReview, type ConfirmNewsSourceInput, type NewsDiscovery, type NewsDiscoveryRange,
  type NewsDiscoveryRun, type NewsDiscoveryStatus,
} from '../api/editorialNewsDiscoveries';

type NewsInboxState = { readonly discoveries: readonly NewsDiscovery[]; readonly nextCursor: string | null; readonly lastRun: NewsDiscoveryRun | null; readonly loading: boolean; readonly loadingMore: boolean; readonly busyId: string | null; readonly error: string | null; };
const initialState: NewsInboxState = { discoveries: [], nextCursor: null, lastRun: null, loading: true, loadingMore: false, busyId: null, error: null };

function message(error: unknown): string { return error instanceof Error ? error.message : '소식 요청을 처리하지 못했습니다.'; }

export function useNewsDiscoveries(range: NewsDiscoveryRange, selectedStatus: NewsDiscoveryStatus | 'all') {
  const [state, setState] = useState<NewsInboxState>(initialState);
  const requestVersion = useRef(0);
  const moreInFlight = useRef(false);
  async function refresh(): Promise<void> {
    const version = requestVersion.current + 1; requestVersion.current = version;
    setState((current) => ({ ...current, discoveries: [], nextCursor: null, loading: true, loadingMore: false, error: null }));
    try { const [page, runs] = await Promise.all([listNewsDiscoveries(range, selectedStatus), listNewsDiscoveryRuns()]); if (requestVersion.current === version) setState({ discoveries: page.discoveries, nextCursor: page.nextCursor, lastRun: runs[0] ?? null, loading: false, loadingMore: false, busyId: null, error: null }); }
    catch (caught: unknown) { if (requestVersion.current === version) setState((current) => ({ ...current, loading: false, error: message(caught) })); }
  }
  useEffect(() => { void refresh(); }, [range, selectedStatus]);
  async function loadMore(): Promise<void> {
    if (!state.nextCursor || state.loadingMore || moreInFlight.current) return;
    const cursor = state.nextCursor; const version = requestVersion.current; moreInFlight.current = true;
    setState((current) => ({ ...current, loadingMore: true, error: null }));
    try { const page = await listNewsDiscoveries(range, selectedStatus, cursor); if (requestVersion.current === version) setState((current) => ({ ...current, discoveries: [...current.discoveries, ...page.discoveries], nextCursor: page.nextCursor, loadingMore: false })); }
    catch (caught: unknown) { if (requestVersion.current === version) setState((current) => ({ ...current, loadingMore: false, error: message(caught) })); }
    finally { moreInFlight.current = false; }
  }
  async function perform(id: string, request: () => Promise<unknown>): Promise<void> {
    setState((current) => ({ ...current, busyId: id, error: null }));
    try { await request(); await refresh(); } catch (caught: unknown) { setState((current) => ({ ...current, busyId: null, error: message(caught) })); }
  }
  return { ...state, refresh, loadMore, run: () => perform('run', runNewsDiscovery), startReview: (id: string) => perform(id, () => startNewsReview(id)), dismiss: (id: string, reason: string) => perform(id, () => dismissNewsDiscovery(id, reason)), confirmSource: (id: string, input: ConfirmNewsSourceInput) => perform(id, () => confirmNewsSource(id, input)), linkCalendar: (id: string, calendarId: string, version: number) => perform(id, () => linkNewsDiscoveryCalendar(id, calendarId, version)) };
}
