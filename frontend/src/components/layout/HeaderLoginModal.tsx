import { Link } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { BusySpinner } from '@/components/ui/loading-state'
import { useAuth } from '../../context/AuthContext'

export interface HeaderLoginModalProps {
  readonly open: boolean
  readonly onClose: () => void
}

function HeaderLoginModal({ open, onClose }: HeaderLoginModalProps) {
  const { login, closeLoginPrompt } = useAuth()
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoginForm({ email: '', password: '' })
    setLoginError('')
    setIsLoggingIn(false)
  }, [open])

  if (!open) return null

  const handleClose = () => {
    closeLoginPrompt()
    onClose()
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')

    if (!loginForm.email || !loginForm.password) {
      setLoginError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoggingIn(true)
    try {
      await login(loginForm.email, loginForm.password)
      handleClose()
    } catch (error: unknown) {
      setLoginError(error instanceof Error && error.message ? error.message : '로그인에 실패했습니다.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 animate-fadeIn">
      <div aria-labelledby="header-login-title" aria-modal="true" className="w-full max-w-md rounded-sm border border-line bg-surface shadow-subtle animate-fadeInUp" role="dialog">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex-1 text-center text-h3 font-semibold tracking-tight text-ink" id="header-login-title">로그인</h2>
            <button aria-label="로그인 창 닫기" className="rounded-sm p-2 text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink-2" onClick={handleClose} type="button">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {loginError && (
            <div className="mb-4 rounded-sm border border-danger-100 bg-danger-50 p-3 text-sm text-danger-600" id="login-error" role="alert">
              {loginError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-2" htmlFor="login-email">이메일</label>
              <input
                aria-describedby={loginError ? 'login-error' : undefined}
                aria-invalid={Boolean(loginError)}
                autoFocus
                className="w-full rounded-sm border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-4 transition-colors focus:border-brand focus:outline-none"
                disabled={isLoggingIn}
                id="login-email"
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="example@email.com"
                type="email"
                value={loginForm.email}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-2" htmlFor="login-password">비밀번호</label>
              <input
                aria-describedby={loginError ? 'login-error' : undefined}
                aria-invalid={Boolean(loginError)}
                className="w-full rounded-sm border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-4 transition-colors focus:border-brand focus:outline-none"
                disabled={isLoggingIn}
                id="login-password"
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="비밀번호를 입력하세요"
                type="password"
                value={loginForm.password}
              />
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50" disabled={isLoggingIn} type="submit">
              {isLoggingIn ? <><BusySpinner size="md" /><span>로그인 중...</span></> : '로그인'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link className="text-sm text-ink-3 transition-colors hover:text-brand" onClick={handleClose} to="/login?mode=reset">
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-ink-3">
            계정이 없으신가요?{' '}
            <Link className="font-medium text-brand hover:text-brand-600" onClick={handleClose} to="/register">회원가입</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeaderLoginModal
