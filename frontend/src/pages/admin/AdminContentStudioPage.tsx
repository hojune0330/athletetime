import { useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  getAthleteAnalytics,
  searchRecordAthletes,
  type AthleteSearchCard,
} from '@/api/recordAnalytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ContentStudioCard } from '@/features/content-studio/ContentStudioCard';
import { ContentStudioEditor } from '@/features/content-studio/ContentStudioEditor';
import {
  buildAgentWorkPacket,
  createContentStudioDraft,
  getContentStudioQa,
  parseAgentResult,
  type ContentStudioDraft,
} from '@/features/content-studio/contentStudioWorkflow';
import { useContentStudioDraft } from '@/features/content-studio/useContentStudioDraft';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
}

export default function AdminContentStudioPage() {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<readonly AthleteSearchCard[]>([]);
  const { draft, setDraft, clearDraft, restored } = useContentStudioDraft();
  const [searching, setSearching] = useState(false);
  const [loadingAthleteKey, setLoadingAthleteKey] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [exporting, setExporting] = useState(false);
  const searchRequest = useRef(0);
  const profileRequest = useRef(0);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2) {
      setSearchStatus('선수 이름을 두 글자 이상 입력해 주세요.');
      return;
    }

    const requestId = ++searchRequest.current;
    setSearching(true);
    setSearchStatus('선수를 찾는 중입니다.');
    try {
      const results = await searchRecordAthletes(normalized, 8);
      if (requestId !== searchRequest.current) return;
      setCandidates(results);
      setSearchStatus(results.length > 0 ? `${results.length}명을 찾았습니다.` : '일치하는 공개 기록을 찾지 못했습니다.');
    } catch (error) {
      if (requestId === searchRequest.current) setSearchStatus(errorMessage(error));
    } finally {
      if (requestId === searchRequest.current) setSearching(false);
    }
  };

  const handleCandidate = async (candidate: AthleteSearchCard) => {
    const requestId = ++profileRequest.current;
    setLoadingAthleteKey(candidate.athleteKey);
    setSearchStatus(`${candidate.name} 선수의 공개 기록을 확인하는 중입니다.`);
    try {
      const result = await getAthleteAnalytics(candidate.athleteKey);
      if (requestId !== profileRequest.current) return;
      if (result.kind === 'ambiguous') {
        setCandidates(result.candidates);
        setSearchStatus('동명이인을 구분해 다시 선택해 주세요.');
        return;
      }
      const nextDraft = createContentStudioDraft(result.profile);
      if (!nextDraft) {
        setSearchStatus('카드에 사용할 공개 기록이 없습니다.');
        return;
      }
      setDraft(nextDraft);
      setAiResult('');
      setActionStatus('공개 기록으로 초안을 만들었습니다. 출처와 권리를 확인해 주세요.');
      setSearchStatus(`${candidate.name} 선수 기록을 불러왔습니다.`);
    } catch (error) {
      if (requestId === profileRequest.current) setSearchStatus(errorMessage(error));
    } finally {
      if (requestId === profileRequest.current) setLoadingAthleteKey(null);
    }
  };

  const updateDraft = (changes: Partial<ContentStudioDraft>) => {
    setDraft((current) => current ? { ...current, ...changes } : current);
    setActionStatus('');
  };

  const handleResetDraft = () => {
    if (!window.confirm('이 기기에 저장된 콘텐츠 초안을 지울까요?')) return;
    profileRequest.current += 1;
    clearDraft();
    setAiResult('');
    setLoadingAthleteKey(null);
    setActionStatus('');
    setSearchStatus('저장된 초안을 지웠습니다. 다른 선수를 선택해 다시 시작할 수 있습니다.');
  };

  const handleCopyWorkPacket = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(buildAgentWorkPacket(draft));
      setActionStatus('AI 작업지시서를 복사했습니다. 사용하는 AI에 붙여넣으세요.');
    } catch {
      setActionStatus('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  const handleImportAiResult = () => {
    if (!draft) return;
    try {
      const copy = parseAgentResult(aiResult);
      setDraft({ ...draft, ...copy });
      setActionStatus('AI 문구를 반영했습니다. 기록 사실과 출처는 바뀌지 않았습니다.');
    } catch (error) {
      setActionStatus(errorMessage(error));
    }
  };

  const handleExport = async () => {
    if (!draft || !exportRef.current) return;
    setExporting(true);
    setActionStatus('PNG를 만드는 중입니다.');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(exportRef.current, {
        width: 1080,
        height: 1350,
        scale: 1,
        backgroundColor: null,
        logging: false,
      });
      const safeName = draft.athleteName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'record';
      const link = document.createElement('a');
      link.download = `athletetime-${safeName}-${draft.recordDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setActionStatus('1080 × 1350 PNG를 저장했습니다.');
    } catch (error) {
      setActionStatus(`PNG 저장에 실패했습니다. ${errorMessage(error)}`);
    } finally {
      setExporting(false);
    }
  };

  const qaIssues = draft ? getContentStudioQa(draft) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-caption font-semibold uppercase tracking-widest-2 text-brand">Admin Content Desk</p>
        <h1 className="mt-2 break-keep text-h1 font-semibold text-ink [text-wrap:balance]">AI 콘텐츠 제작 데스크</h1>
        <p className="mt-2 max-w-3xl break-keep text-body text-ink-3 [text-wrap:pretty]">
          공개 선수 기록을 불러와 사실은 잠그고, 문구 편집과 AI 협업, 출처 점검, 카드 저장을 <span className="whitespace-nowrap">한 화면에서 마칩니다.</span>
        </p>
        {restored && (
          <p className="mt-4 border border-brand/30 bg-brand/5 px-4 py-3 text-body-sm font-semibold text-brand" role="status" aria-live="polite">
            이 기기에 저장된 초안을 복구했습니다.
          </p>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>1. 공개 기록 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" role="search" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="content-athlete-search">선수 이름 검색</label>
            <Input
              id="content-athlete-search"
              minLength={2}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="선수 이름을 입력하세요"
              className="h-11"
            />
            <Button type="submit" disabled={searching} className="shrink-0">
              <MagnifyingGlassIcon /> {searching ? '검색 중...' : '선수 찾기'}
            </Button>
          </form>
          {searchStatus && <p className="mt-3 break-keep text-body-sm text-ink-3" role="status" aria-live="polite">{searchStatus}</p>}
          {candidates.length > 0 && (
            <ul className="mt-4 grid gap-2 md:grid-cols-2" aria-label="선수 검색 결과">
              {candidates.map((candidate) => (
                <li key={candidate.athleteKey}>
                  <button
                    type="button"
                    disabled={loadingAthleteKey !== null}
                    onClick={() => handleCandidate(candidate)}
                    className="min-h-16 w-full border border-line bg-surface p-3 text-left transition-colors hover:border-brand hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <span className="block break-keep text-body font-semibold text-ink">{candidate.name} · {candidate.team}</span>
                    <span className="mt-1 block break-keep text-caption text-ink-3">{candidate.divisions.join(' · ')} · {candidate.events.join(' · ')}</span>
                    {loadingAthleteKey === candidate.athleteKey && <span className="mt-1 block text-caption text-brand">기록 불러오는 중...</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {draft ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:items-start">
          <ContentStudioEditor
            draft={draft}
            qaIssues={qaIssues}
            aiResult={aiResult}
            status={actionStatus}
            exporting={exporting}
            onDraftChange={updateDraft}
            onAiResultChange={setAiResult}
            onCopyWorkPacket={handleCopyWorkPacket}
            onImportAiResult={handleImportAiResult}
            onExport={handleExport}
            onResetDraft={handleResetDraft}
          />
          <section className="min-w-0 lg:sticky lg:top-20" aria-labelledby="content-preview-title">
            <h2 id="content-preview-title" className="mb-3 text-h3 font-semibold text-ink">2. 카드 미리보기</h2>
            <ContentStudioCard draft={draft} />
            <p className="mt-3 break-keep text-caption text-ink-3">내보내기 크기 1080 × 1350. 공개 기록 기반 카드이며 게시 전 사람의 <span className="whitespace-nowrap">최종 검수가 필요합니다.</span></p>
          </section>
          <div className="pointer-events-none fixed left-[-12000px] top-0" aria-hidden="true">
            <ContentStudioCard ref={exportRef} draft={draft} exportMode />
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-line bg-surface-2 px-6 py-12 text-center">
          <p className="break-keep text-body font-semibold text-ink">선수를 선택하면 편집 화면과 <span className="whitespace-nowrap">카드 미리보기가 열립니다.</span></p>
          <p className="mt-2 break-keep text-body-sm text-ink-3">개인정보 입력 없이 공개 기록 API의 검증된 항목만 사용합니다.</p>
        </div>
      )}
    </div>
  );
}
