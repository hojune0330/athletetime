import { useState } from 'react';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import type { Comment } from '../../../types';
import { formatPostDate, showPostToast } from './postDetailPresentation';

type CommentSectionProps = {
  readonly comments: readonly Comment[];
  readonly commentsCount: number;
  readonly onSubmit: (author: string, content: string) => void;
  readonly isSubmitting: boolean;
};

export function CommentSection({
  comments,
  commentsCount,
  onSubmit,
  isSubmitting,
}: CommentSectionProps) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      showPostToast('댓글 내용을 입력해주세요.');
      return;
    }
    onSubmit(author.trim() || '익명', content);
    setContent('');
  };

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-5 h-5 text-primary-500" />
          <span>댓글</span>
          <span className="text-primary-600">{commentsCount}</span>
        </h2>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-3">
            <input
              type="text"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="닉네임 (선택)"
              className="input text-sm"
              disabled={isSubmitting}
            />
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="댓글을 입력하세요..."
            className="textarea"
            rows={4}
            disabled={isSubmitting}
          />
          <div className="flex justify-end mt-3">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>작성 중...</span>
                </>
              ) : (
                '댓글 작성'
              )}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">💬</div>
              <p className="text-neutral-500">첫 번째 댓글을 작성해보세요!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-b border-neutral-100 last:border-0 pb-4 last:pb-0 animate-fadeIn">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-info-500 to-primary-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                    {comment.author[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-neutral-900 text-sm">{comment.author}</span>
                      <span className="text-xs text-neutral-400">{formatPostDate(comment.created_at)}</span>
                    </div>
                    <p className="text-neutral-700 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
