import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  KeyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import * as authApi from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { BusySpinner } from '@/components/ui/loading-state'

/**
 * 로그인 모달의 화면 단계를 표현한다.
 * - login: 이메일·비밀번호로 로그인
 * - forgotPassword: 이메일만 받아 인증 코드 발송
 * - verifyCode: 받은 6자리 코드 검증
 * - resetPassword: 새 비밀번호 재설정 후 login으로 자동 복귀
 */
export type LoginModalMode =
  | 'login'
  | 'forgotPassword'
  | 'verifyCode'
  | 'resetPassword'

/**
 * HeaderLoginModal 외부 컨트랙트 (2C-2B 확정).
 *
 * Header.tsx(1037줄)에서 로그인 모달 영역을 이 컴포넌트로 이관했다.
 *
 * 소유권 분리:
 *   - Header 소유: showLoginModal(가시성), loginInitialMode(최초 모드 힌트),
 *     URL `?showLogin=true` / sessionStorage 플래그 파싱
 *   - 모달 내부 소유: mode 전환, 로그인 폼, 비밀번호 찾기 폼/에러/로딩,
 *     useAuth().loginWithContext, useAuth().closeLoginPrompt, authApi.*
 *
 * 모달이 재오픈될 때(open false→true) 내부 상태는 initialMode 기준으로 전체
 * 리셋된다. 닫힘 상태에서는 null을 반환하지만 컴포넌트는 유지(mount)되므로
 * 리셋 시점을 open 전환으로 통일했다.
 */
export interface HeaderLoginModalProps {
  /** 모달 가시성. true면 렌더링, false면 null. */
  readonly open: boolean
  /**
   * 모달이 열릴 때 초기 화면 단계. 재오픈마다 이 값으로 되돌아간다.
   * 기본값: 'login'
   */
  readonly initialMode?: LoginModalMode
  /**
   * 모달 닫기 요청 콜백. Header 측에서 AuthContext.closeLoginPrompt()까지
   * 함께 정리해야 한다 (이 컴포넌트에서는 열림/닫힘 상태를 소유하지 않음).
   */
  readonly onClose: () => void
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

/**
 * Header의 로그인/비밀번호 찾기 모달.
 *
 * 열림 상태(open)는 Header가 제어하고, 내부 흐름(mode/폼/에러/로딩)은
 * 이 컴포넌트가 전담한다. 열릴 때마다 설정값과 입력값을 초기화한다.
 */
function HeaderLoginModal({
  open,
  initialMode = 'login',
  onClose,
}: HeaderLoginModalProps) {
  const { login: loginWithContext, closeLoginPrompt } = useAuth()

  // 화면 단계 — 모달 내부에서만 전환한다 (back 버튼/플로우 체인).
  const [mode, setMode] = useState<LoginModalMode>(initialMode)

  // 로그인 폼
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // 비밀번호 찾기
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  // 모달이 열릴 때마다 초기 모드 + 모든 입력/에러 상태를 초기화한다.
  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setLoginForm({ email: '', password: '' })
    setLoginError('')
    setIsLoggingIn(false)
    setForgotEmail('')
    setResetCode('')
    setNewPassword('')
    setNewPasswordConfirm('')
    setForgotError('')
    setForgotSuccess('')
    setIsSendingCode(false)
    setIsVerifyingCode(false)
    setIsResettingPassword(false)
  }, [open, initialMode])

  if (!open) return null

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!loginForm.email || !loginForm.password) {
      setLoginError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoggingIn(true)

    try {
      await loginWithContext(loginForm.email, loginForm.password)
      closeLoginPrompt()
      onClose()
      setLoginForm({ email: '', password: '' })
    } catch (error: unknown) {
      setLoginError(getErrorMessage(error, '로그인에 실패했습니다.'))
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleClose = () => {
    closeLoginPrompt()
    onClose()
  }

  // 비밀번호 찾기 - 인증 코드 발송
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')

    if (!forgotEmail) {
      setForgotError('이메일을 입력해주세요.')
      return
    }

    setIsSendingCode(true)

    try {
      const response = await authApi.forgotPassword(forgotEmail)

      if (response.success) {
        setForgotSuccess('등록된 이메일이라면 인증 코드를 보냈어요. 이메일을 확인해 주세요.')
        setMode('verifyCode')
      } else {
        setForgotError(response.error || '인증 코드 발송에 실패했습니다.')
      }
    } catch (error: unknown) {
      setForgotError(getErrorMessage(error, '인증 코드 발송에 실패했습니다.'))
    } finally {
      setIsSendingCode(false)
    }
  }

  // 비밀번호 찾기 - 인증 코드 확인
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')

    if (!resetCode) {
      setForgotError('인증 코드를 입력해주세요.')
      return
    }

    setIsVerifyingCode(true)

    try {
      const response = await authApi.verifyResetCode(forgotEmail, resetCode)

      if (response.success) {
        setForgotSuccess('인증이 완료되었습니다. 새 비밀번호를 설정해주세요.')
        setMode('resetPassword')
      } else {
        setForgotError(response.error || '인증 코드 확인에 실패했습니다.')
      }
    } catch (error: unknown) {
      setForgotError(getErrorMessage(error, '인증 코드 확인에 실패했습니다.'))
    } finally {
      setIsVerifyingCode(false)
    }
  }

  // 비밀번호 찾기 - 새 비밀번호 설정
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')

    if (!newPassword || !newPasswordConfirm) {
      setForgotError('새 비밀번호를 입력해주세요.')
      return
    }

    if (newPassword !== newPasswordConfirm) {
      setForgotError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (newPassword.length < 8) {
      setForgotError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)/
    if (!passwordRegex.test(newPassword)) {
      setForgotError('비밀번호는 영문과 숫자를 포함해야 합니다.')
      return
    }

    setIsResettingPassword(true)

    try {
      const response = await authApi.resetPassword(forgotEmail, resetCode, newPassword)

      if (response.success) {
        setForgotSuccess('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.')
        // 로그인 화면으로 돌아가기
        setTimeout(() => {
          setMode('login')
          setLoginForm({ email: forgotEmail, password: '' })
          setForgotEmail('')
          setResetCode('')
          setNewPassword('')
          setNewPasswordConfirm('')
          setForgotError('')
          setForgotSuccess('')
        }, 2000)
      } else {
        setForgotError(response.error || '비밀번호 변경에 실패했습니다.')
      }
    } catch (error: unknown) {
      setForgotError(getErrorMessage(error, '비밀번호 변경에 실패했습니다.'))
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleBack = () => {
    if (mode === 'verifyCode') {
      setMode('forgotPassword')
    } else if (mode === 'resetPassword') {
      setMode('verifyCode')
    } else {
      setMode('login')
    }
    setForgotError('')
    setForgotSuccess('')
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-surface rounded-sm border border-line max-w-md w-full shadow-subtle animate-fadeInUp">
        <div className="p-6">
          {/* 모달 헤더 */}
          <div className="flex items-center justify-between mb-6">
            {mode !== 'login' && (
              <button onClick={handleBack} className="rounded-sm p-2 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-h3 font-semibold tracking-tight text-ink flex-1 text-center">
              {mode === 'login' && '로그인'}
              {mode === 'forgotPassword' && '비밀번호 찾기'}
              {mode === 'verifyCode' && '인증 코드 확인'}
              {mode === 'resetPassword' && '새 비밀번호 설정'}
            </h2>
            <button onClick={handleClose} className="p-2 text-ink-4 hover:text-ink-2 rounded-sm hover:bg-surface-2 transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ========== 로그인 화면 ========== */}
          {mode === 'login' && (
            <>
              {/* 에러 메시지 */}
              {loginError && (
                <div id="login-error" role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-sm text-danger-600 text-sm">
                  {loginError}
                </div>
              )}

              {/* 로그인 폼 */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-ink-2 mb-2">
                    이메일
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                    disabled={isLoggingIn}
                    autoFocus
                    aria-invalid={Boolean(loginError)}
                    aria-describedby={loginError ? 'login-error' : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-ink-2 mb-2">
                    비밀번호
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                    disabled={isLoggingIn}
                    aria-invalid={Boolean(loginError)}
                    aria-describedby={loginError ? 'login-error' : undefined}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <BusySpinner size="md" />
                      <span>로그인 중...</span>
                    </>
                  ) : (
                    '로그인'
                  )}
                </button>
              </form>

              {/* 비밀번호 찾기 링크 */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setMode('forgotPassword')
                    setForgotError('')
                    setForgotSuccess('')
                  }}
                  className="text-sm text-ink-3 hover:text-brand transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>

              {/* 하단 링크 */}
              <div className="mt-4 text-center text-sm text-ink-3">
                계정이 없으신가요?{' '}
                <Link to="/register" onClick={handleClose} className="text-brand hover:text-brand-600 font-medium">
                  회원가입
                </Link>
              </div>
            </>
          )}

          {/* ========== 비밀번호 찾기 - 이메일 입력 ========== */}
          {mode === 'forgotPassword' && (
            <>
              {/* 안내 메시지 */}
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <EnvelopeIcon className="w-8 h-8 text-brand" />
                </div>
                <p className="text-sm text-ink-2">
                  가입한 이메일 주소를 입력하시면<br />
                  비밀번호 재설정 인증 코드를 보내드립니다.
                </p>
              </div>

              {/* 에러/성공 메시지 */}
              {forgotError && (
                <div id="forgot-error" role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-sm text-danger-600 text-sm">
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div role="status" className="mb-4 p-3 bg-success-50 border border-success-100 rounded-sm text-success-600 text-sm">
                  {forgotSuccess}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-ink-2 mb-2">
                    이메일
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                    disabled={isSendingCode}
                    autoFocus
                    aria-invalid={Boolean(forgotError)}
                    aria-describedby={forgotError ? 'forgot-error' : undefined}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingCode}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSendingCode ? (
                    <>
                      <BusySpinner size="md" />
                      <span>발송 중...</span>
                    </>
                  ) : (
                    '인증 코드 발송'
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button onClick={() => setMode('login')} className="text-sm text-ink-3 hover:text-brand transition-colors">
                  로그인으로 돌아가기
                </button>
              </div>
            </>
          )}

          {/* ========== 비밀번호 찾기 - 인증 코드 확인 ========== */}
          {mode === 'verifyCode' && (
            <>
              {/* 안내 메시지 */}
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyIcon className="w-8 h-8 text-brand" />
                </div>
                <p className="text-sm text-ink-2">
                  <strong>{forgotEmail}</strong>으로<br />
                  등록된 이메일이라면 받은 6자리 인증 코드를 입력해주세요.
                </p>
              </div>

              {/* 에러/성공 메시지 */}
              {forgotError && (
                <div id="forgot-error" role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-sm text-danger-600 text-sm">
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div role="status" className="mb-4 p-3 bg-success-50 border border-success-100 rounded-sm text-success-600 text-sm">
                  {forgotSuccess}
                </div>
              )}

              <form onSubmit={handleVerifyResetCode} className="space-y-4">
                <div>
                  <label htmlFor="reset-code" className="block text-sm font-medium text-ink-2 mb-2">
                    인증 코드
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6자리 숫자 입력"
                    className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors text-center text-2xl tracking-widest font-mono"
                    disabled={isVerifyingCode}
                    maxLength={6}
                    autoFocus
                    aria-invalid={Boolean(forgotError)}
                    aria-describedby={forgotError ? 'forgot-error' : undefined}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingCode || resetCode.length !== 6}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isVerifyingCode ? (
                    <>
                      <BusySpinner size="md" />
                      <span>확인 중...</span>
                    </>
                  ) : (
                    '인증 코드 확인'
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => handleForgotPassword({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={isSendingCode}
                  className="text-sm text-ink-3 hover:text-brand transition-colors disabled:opacity-50"
                >
                  {isSendingCode ? '발송 중...' : '인증 코드 재발송'}
                </button>
              </div>
            </>
          )}

          {/* ========== 비밀번호 찾기 - 새 비밀번호 설정 ========== */}
          {mode === 'resetPassword' && (
            <>
              {/* 안내 메시지 */}
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyIcon className="w-8 h-8 text-success-500" />
                </div>
                <p className="text-sm text-ink-2">
                  인증이 완료되었습니다.<br />
                  새로운 비밀번호를 설정해주세요.
                </p>
              </div>

              {/* 에러/성공 메시지 */}
              {forgotError && (
                <div id="forgot-error" role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-sm text-danger-600 text-sm">
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div role="status" className="mb-4 p-3 bg-success-50 border border-success-100 rounded-sm text-success-600 text-sm">
                  {forgotSuccess}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-ink-2 mb-2">
                    새 비밀번호
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8자 이상, 영문+숫자"
                    className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                    disabled={isResettingPassword}
                    autoFocus
                    aria-invalid={Boolean(forgotError)}
                    aria-describedby="new-password-help"
                  />
                  <p id="new-password-help" className="mt-1 text-xs text-ink-4">
                    8자 이상, 영문과 숫자 포함
                  </p>
                </div>

                <div>
                  <label htmlFor="new-password-confirm" className="block text-sm font-medium text-ink-2 mb-2">
                    새 비밀번호 확인
                  </label>
                  <input
                    id="new-password-confirm"
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="새 비밀번호 확인"
                    className="w-full px-4 py-3 border border-line rounded-sm bg-surface text-ink placeholder:text-ink-4 focus:outline-none focus:border-brand transition-colors"
                    disabled={isResettingPassword}
                    aria-invalid={Boolean(newPasswordConfirm && newPassword !== newPasswordConfirm)}
                    aria-describedby={newPasswordConfirm && newPassword !== newPasswordConfirm ? 'new-password-mismatch' : undefined}
                  />
                  {newPasswordConfirm && newPassword !== newPasswordConfirm && (
                    <p id="new-password-mismatch" className="mt-1 text-xs text-danger-600">
                      비밀번호가 일치하지 않습니다.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isResettingPassword || !newPassword || !newPasswordConfirm || newPassword !== newPasswordConfirm}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isResettingPassword ? (
                    <>
                      <BusySpinner size="md" />
                      <span>변경 중...</span>
                    </>
                  ) : (
                    '비밀번호 변경'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default HeaderLoginModal
