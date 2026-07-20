import { useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminDeleteModal } from '../components/community/post-detail/AdminDeleteModal';
import { CommentSection } from '../components/community/post-detail/CommentSection';
import { DeleteModal, EditPasswordModal } from '../components/community/post-detail/PasswordModals';
import { PollSection } from '../components/community/post-detail/PollSection';
import { PostActions } from '../components/community/post-detail/PostActions';
import { PostContent } from '../components/community/post-detail/PostContent';
import { PostHeader } from '../components/community/post-detail/PostHeader';
import { showPostToast } from '../components/community/post-detail/postDetailPresentation';
import { MagazinePostContext } from '../components/editorial/MagazinePostContext';
import { useMagazinePostContext } from '../components/editorial/useMagazinePostContext';
import { useAuth } from '../context/AuthContext';
import {
  useCreateComment,
  useDeletePost,
  usePollVote,
  usePost,
  useVerifyPostPassword,
  useVotePost,
} from '../hooks/usePosts';
import { getAnonymousId } from '../utils/anonymousUser';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const id = postId || '';
  const parsedPostId = Number(id);
  const numericPostId = /^[1-9]\d*$/u.test(id) && Number.isSafeInteger(parsedPostId)
    ? parsedPostId
    : null;
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);
  const [hasVotedPoll, setHasVotedPoll] = useState(false);

  const { data: post, isLoading, isError, error } = usePost(id);
  const votePostMutation = useVotePost();
  const createCommentMutation = useCreateComment();
  const deletePostMutation = useDeletePost();
  const verifyPasswordMutation = useVerifyPostPassword();
  const pollVoteMutation = usePollVote();
  const magazineContext = useMagazinePostContext(numericPostId);

  const handleVote = async (type: 'like' | 'dislike') => {
    try {
      const anonymousId = getAnonymousId();
      const currentVote = post?.myVote;
      const result = await votePostMutation.mutateAsync({
        postId: id,
        data: { type, anonymousId },
      });
      if (currentVote === type) {
        showPostToast(type === 'like' ? '👍 추천을 취소했습니다.' : '👎 비추천을 취소했습니다.');
      } else if (result.myVote) {
        showPostToast(type === 'like' ? '👍 추천했습니다!' : '👎 비추천했습니다.');
      }
    } catch {
      showPostToast('투표에 실패했습니다.');
    }
  };

  const handleCommentSubmit = async (author: string, content: string) => {
    try {
      await createCommentMutation.mutateAsync({
        postId: id,
        data: { author, content, anonymousId: getAnonymousId() },
      });
      showPostToast('💬 댓글을 작성했습니다.');
    } catch {
      showPostToast('댓글 작성에 실패했습니다.');
    }
  };

  const handleEditPasswordVerify = async (password: string) => {
    try {
      setEditPasswordError(null);
      await verifyPasswordMutation.mutateAsync({ id, password });
      setShowEditPasswordModal(false);
      navigate(`/edit/${id}`, { state: { password } });
    } catch (caught: unknown) {
      setEditPasswordError(
        caught instanceof Error ? caught.message : '비밀번호가 일치하지 않습니다.',
      );
    }
  };

  const handleDelete = async (password: string) => {
    try {
      await deletePostMutation.mutateAsync({ id, password });
      showPostToast('🗑️ 게시글을 삭제했습니다.');
      setTimeout(() => navigate('/community'), 1000);
    } catch (caught: unknown) {
      showPostToast(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
    setShowDeleteModal(false);
  };

  const handleAdminDelete = async (deleteReason: string) => {
    try {
      await deletePostMutation.mutateAsync({ id, password: '', deleteReason });
      showPostToast('🛡️ 관리자 권한으로 게시글을 삭제했습니다.');
      setTimeout(() => navigate('/community'), 1000);
    } catch (caught: unknown) {
      showPostToast(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
    setShowAdminDeleteModal(false);
  };

  const handlePollVote = async (optionId: number) => {
    try {
      await pollVoteMutation.mutateAsync({
        postId: id,
        data: { optionId, visitorId: getAnonymousId() },
      });
      setHasVotedPoll(true);
      showPostToast('📊 투표가 완료되었습니다.');
    } catch (caught: unknown) {
      showPostToast(caught instanceof Error ? caught.message : '투표에 실패했습니다.');
    }
  };

  if (numericPostId === null) {
    return (
      <div className="empty-state py-16">
        <div className="empty-state-icon">🔍</div>
        <h3 className="empty-state-title">게시글을 찾을 수 없습니다</h3>
        <Link to="/community" className="btn-primary">목록으로 돌아가기</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="empty-state py-16">
        <div className="empty-state-icon">🔍</div>
        <h3 className="empty-state-title">게시글을 찾을 수 없습니다</h3>
        <p className="empty-state-description">
          {error instanceof Error ? error.message : '게시글이 삭제되었거나 존재하지 않습니다.'}
        </p>
        <Link to="/" className="btn-primary">목록으로 돌아가기</Link>
      </div>
    );
  }

  const countsVisible = magazineContext.data?.countsVisible ?? true;

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/community')}
        className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors min-h-[44px]"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="font-medium">목록으로</span>
      </button>

      <article className="card overflow-hidden">
        <PostHeader
          title={post.title}
          author={post.author}
          createdAt={post.created_at}
          categoryName={post.category_name}
          categoryIcon={post.category_icon}
          categoryColor={post.category_color}
          isNotice={post.is_notice}
          views={post.views}
          likesCount={post.likes_count}
          commentsCount={post.comments_count}
          countsVisible={countsVisible}
        />
        <PostContent content={post.content} images={post.images || []} />
        {post.poll && (
          <PollSection
            poll={post.poll}
            onVote={handlePollVote}
            isVoting={pollVoteMutation.isPending}
            hasVoted={hasVotedPoll}
          />
        )}
        <PostActions
          likesCount={post.likes_count}
          dislikesCount={post.dislikes_count}
          myVote={post.myVote}
          onVote={handleVote}
          onEdit={() => setShowEditPasswordModal(true)}
          onDelete={() => isAdmin ? setShowAdminDeleteModal(true) : setShowDeleteModal(true)}
          isVoting={votePostMutation.isPending}
          countsVisible={countsVisible}
          showManagementActions={magazineContext.data === null}
        />
      </article>

      <MagazinePostContext
        issue={magazineContext.data}
        isLoading={magazineContext.isLoading}
        isError={magazineContext.isError}
        onRetry={() => { void magazineContext.refetch(); }}
      />

      <CommentSection
        comments={post.comments || []}
        commentsCount={post.comments_count}
        onSubmit={handleCommentSubmit}
        isSubmitting={createCommentMutation.isPending}
      />

      <EditPasswordModal
        isOpen={showEditPasswordModal}
        onClose={() => {
          setShowEditPasswordModal(false);
          setEditPasswordError(null);
        }}
        onConfirm={handleEditPasswordVerify}
        isVerifying={verifyPasswordMutation.isPending}
        error={editPasswordError}
      />
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={deletePostMutation.isPending}
      />
      <AdminDeleteModal
        isOpen={showAdminDeleteModal}
        onClose={() => setShowAdminDeleteModal(false)}
        onConfirm={handleAdminDelete}
        isDeleting={deletePostMutation.isPending}
      />
    </div>
  );
}
