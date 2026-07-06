type RecordContextPromptProps = {
  readonly recordContext: string
  readonly onStart: () => void
}

export function RecordContextPrompt({ recordContext, onStart }: RecordContextPromptProps) {
  const recordSearchHref = `/records?q=${encodeURIComponent(recordContext)}`

  return (
    <section className="card mb-4 border-primary-100 bg-primary-50/60">
      <div className="card-body">
        <p className="text-sm font-semibold text-primary-700">기록에서 이어왔어요</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-950">{recordContext} 기록 이야기</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              같은 이름의 다른 선수일 수 있어요. 소속과 연도를 직접 확인한 뒤 이야기해 주세요.
            </p>
            <p className="mt-1 text-xs font-medium text-neutral-500">
              자동으로 글을 만들지 않아요. 버튼을 누른 뒤 제목과 내용을 직접 확인해 주세요.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={recordSearchHref} className="btn-secondary text-center">
              기록 다시 보기
            </a>
            <button type="button" onClick={onStart} className="btn-primary">
              이 기록 이야기하기
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
