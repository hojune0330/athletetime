import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 5

type CommunityImagePickerProps = {
  readonly selectedImages: readonly File[]
  readonly imagePreviews: readonly string[]
  readonly imageError: string | null
  readonly onImagesAdded: (files: readonly File[], previews: readonly string[]) => void
  readonly onRemoveImage: (index: number) => void
  readonly onError: (message: string | null) => void
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`${file.name} 미리보기를 만들지 못했어요.`))
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error(`${file.name} 미리보기 형식이 올바르지 않아요.`))
    }
    reader.readAsDataURL(file)
  })
}

function validateImages(selectedCount: number, files: readonly File[]): string | null {
  if (selectedCount + files.length > MAX_IMAGES) {
    return '이미지는 최대 5개까지 업로드할 수 있습니다.'
  }
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'JPG, PNG, GIF 파일만 업로드할 수 있습니다.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기는 5MB를 초과할 수 없습니다. (${file.name})`
    }
  }
  return null
}

export function CommunityImagePicker({
  selectedImages,
  imagePreviews,
  imageError,
  onImagesAdded,
  onRemoveImage,
  onError,
}: CommunityImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    onError(null)

    const validationError = validateImages(selectedImages.length, files)
    if (validationError) {
      onError(validationError)
      return
    }

    try {
      const previews = await Promise.all(files.map(readAsDataUrl))
      onImagesAdded(files, previews)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '이미지를 불러오지 못했어요.'
      onError(message)
    }
  }

  return (
    <div className="space-y-3">
      {imageError && <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{imageError}</div>}
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif" multiple onChange={handleImageChange} className="hidden" />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-neutral-200 p-6 text-center transition-colors hover:border-primary-300"
      >
        <PhotoIcon className="mx-auto mb-2 h-10 w-10 text-neutral-400" />
        <span className="block text-sm text-neutral-500">클릭하여 이미지 업로드</span>
        <span className="mt-1 block text-xs text-neutral-400">최대 5MB, JPG/PNG/GIF (최대 5개)</span>
      </button>
      {imagePreviews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {imagePreviews.map((preview, index) => (
            <div key={preview} className="group relative aspect-square">
              <img src={preview} alt={`미리보기 ${index + 1}`} className="h-full w-full rounded-lg border border-neutral-200 object-cover" />
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                aria-label={`이미지 ${index + 1} 삭제`}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
