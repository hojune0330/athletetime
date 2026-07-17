import type { EditorialDraftInput } from '../../../api/editorialAdmin';

type PublicPreviewProps = {
  readonly draft: EditorialDraftInput;
};

export function PublicPreview({ draft }: PublicPreviewProps) {
  return (
    <section className="border border-line bg-bg p-5" aria-labelledby="preview-heading">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <p className="t-mono-xs">PUBLIC VIEW</p>
          <h2 id="preview-heading" className="mt-1 text-sm font-bold text-ink">공개 화면 미리보기</h2>
        </div>
        <span className="text-xs text-ink-3">애타 편집팀</span>
      </div>
      <h3 className="mt-5 text-2xl font-black leading-tight tracking-tight text-ink">{draft.title || '제목을 입력해 주세요'}</h3>
      <p className="mt-3 text-sm font-medium leading-6 text-ink-2">{draft.summary || '요약이 이곳에 보여요.'}</p>
      <div className="mt-5 whitespace-pre-wrap border-t border-hair pt-5 text-sm leading-7 text-ink-2">
        {draft.content || '확인한 사실을 짧고 명확하게 정리해 주세요.'}
      </div>
      <div className="mt-5 border-l-2 border-brand bg-primary-50 px-4 py-3">
        <p className="text-xs font-bold text-brand">지금 보는 이유</p>
        <p className="mt-1 text-sm text-ink-2">{draft.whyNow || '왜 지금 읽을 만한지 적어 주세요.'}</p>
      </div>
      <p className="mt-5 text-base font-bold text-ink">{draft.discussionQuestion || '함께 이야기할 질문을 적어 주세요.'}</p>
    </section>
  );
}
