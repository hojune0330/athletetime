import { XMarkIcon } from '@heroicons/react/24/outline'

type CommunityPollBuilderProps = {
  readonly pollQuestion: string
  readonly pollOptions: readonly string[]
  readonly onQuestionChange: (value: string) => void
  readonly onOptionsChange: (nextOptions: string[]) => void
}

export function CommunityPollBuilder({
  pollQuestion,
  pollOptions,
  onQuestionChange,
  onOptionsChange,
}: CommunityPollBuilderProps) {
  const updateOption = (index: number, value: string) => {
    onOptionsChange(pollOptions.map((option, optionIndex) => (optionIndex === index ? value : option)))
  }

  return (
    <div className="space-y-3 rounded-xl bg-neutral-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">투표 만들기</p>
        <span className="text-xs text-neutral-400">{pollOptions.length}/5개 선택지</span>
      </div>
      <input
        type="text"
        placeholder="투표 질문"
        value={pollQuestion}
        onChange={(event) => onQuestionChange(event.target.value)}
        className="input"
      />
      {pollOptions.map((option, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder={`선택지 ${index + 1}`}
            value={option}
            onChange={(event) => updateOption(index, event.target.value)}
            className="input flex-1"
          />
          {pollOptions.length > 2 && (
            <button
              type="button"
              onClick={() => onOptionsChange(pollOptions.filter((_, optionIndex) => optionIndex !== index))}
              className="rounded-lg bg-danger-50 p-2.5 text-danger-500"
              aria-label={`선택지 ${index + 1} 삭제`}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      ))}
      {pollOptions.length < 5 && (
        <button
          type="button"
          onClick={() => onOptionsChange([...pollOptions, ''])}
          className="text-sm font-medium text-primary-600"
        >
          + 선택지 추가
        </button>
      )}
    </div>
  )
}
