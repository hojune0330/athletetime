import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';

type MagazineDiscussionPromptProps = {
  readonly question: string;
};

export function MagazineDiscussionPrompt({ question }: MagazineDiscussionPromptProps) {
  return (
    <section className="min-w-0" aria-labelledby="magazine-discussion-title">
      <h2 id="magazine-discussion-title" className="flex items-center gap-2 font-bold text-neutral-900">
        <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-amber-600" />
        같이 이야기해요
      </h2>
      <p className="mt-3 break-words rounded-2xl bg-white/80 p-4 text-sm font-medium leading-6 text-neutral-700">
        {question}
      </p>
    </section>
  );
}
