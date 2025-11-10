// 정적 SNS 공유 컴포넌트
export const QuickShareButton = () => {
  return (
    <button
      data-action="share"
      className="w-10 h-10 bg-yellow-400 text-black rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
      title="카카오톡으로 공유"
    >
      <i className="fas fa-comment"></i>
    </button>
  );
};