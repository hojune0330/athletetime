import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhotoIcon } from '@heroicons/react/24/outline'

export default function WritePage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('free')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: API call to save post
    navigate('/')
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">새 글쓰기</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Category Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="free">자유</option>
              <option value="humor">유머</option>
              <option value="daily">일상</option>
              <option value="hobby">취미</option>
              <option value="stream">인방</option>
            </select>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="제목을 입력하세요"
              required
            />
          </div>

          {/* Content Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={15}
              placeholder="내용을 입력하세요"
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이미지 첨부
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="flex flex-col items-center">
                <PhotoIcon className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  클릭하거나 드래그하여 이미지를 업로드하세요
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const input = document.querySelector('input[type="file"]') as HTMLInputElement
                    input?.click()
                  }}
                >
                  파일 선택
                </button>
              </div>
            </div>
          </div>

          {/* Password for Edit/Delete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수정/삭제 비밀번호
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="게시글 수정/삭제시 필요합니다"
              required
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            취소
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            등록
          </button>
        </div>
      </form>
    </div>
  )
}