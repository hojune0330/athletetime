import { useState } from 'react'
import { BusySpinner } from '@/components/ui/loading-state'
import { Button } from '@/components/ui/button'
import * as authApi from '@/api/auth'

type RecoveryStep = 'code' | 'email' | 'password'

type PasswordRecoveryPanelProps = {
  readonly onReturnToLogin: (email?: string) => void
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function PasswordRecoveryPanel({ onReturnToLogin }: PasswordRecoveryPanelProps) {
  const [step, setStep] = useState<RecoveryStep>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const sendCode = async () => {
    const normalizedEmail = email.trim()
    setError('')
    setNotice('')
    if (!normalizedEmail) {
      setError('이메일을 입력해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      const response = await authApi.forgotPassword(normalizedEmail)
      if (!response.success) {
        setError(response.error || '인증 코드 발송에 실패했습니다.')
        return
      }
      setEmail(normalizedEmail)
      setNotice('등록된 이메일이라면 인증 코드를 보냈어요. 이메일을 확인해 주세요.')
      setStep('code')
    } catch (requestError) {
      setError(errorMessage(requestError, '인증 코드 발송에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  const verifyCode = async () => {
    setError('')
    setNotice('')
    if (code.length !== 6) {
      setError('인증 코드 6자리를 입력해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      const response = await authApi.verifyResetCode(email, code)
      if (!response.success) {
        setError(response.error || '인증 코드 확인에 실패했습니다.')
        return
      }
      setNotice('인증이 완료되었습니다. 새 비밀번호를 설정해 주세요.')
      setStep('password')
    } catch (requestError) {
      setError(errorMessage(requestError, '인증 코드 확인에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  const resetPassword = async () => {
    setError('')
    setNotice('')
    if (!newPassword || !passwordConfirm) {
      setError('새 비밀번호를 모두 입력해 주세요.')
      return
    }
    if (newPassword !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
      setError('비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.')
      return
    }

    setSubmitting(true)
    try {
      const response = await authApi.resetPassword(email, code, newPassword)
      if (!response.success) {
        setError(response.error || '비밀번호 변경에 실패했습니다.')
        return
      }
      onReturnToLogin(email)
    } catch (requestError) {
      setError(errorMessage(requestError, '비밀번호 변경에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  const goTo = (next: RecoveryStep) => {
    setError('')
    setNotice('')
    setStep(next)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => onReturnToLogin()}
        className="mb-6 flex min-h-11 items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
      >
        로그인으로 돌아가기
      </button>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">비밀번호 찾기</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {step === 'email' && '가입한 이메일로 인증 코드를 보낼게요.'}
          {step === 'code' && '이메일로 받은 6자리 인증 코드를 입력해 주세요.'}
          {step === 'password' && '새 비밀번호를 설정해 주세요.'}
        </p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl border border-success-100 bg-success-50 p-3 text-sm text-success-600">{notice}</p>}

      {step === 'email' && (
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void sendCode() }}>
          <label className="block text-sm font-medium text-neutral-700">
            이메일
            <input
              autoComplete="email"
              className="input mt-2"
              disabled={submitting}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@email.com"
              type="email"
              value={email}
            />
          </label>
          <Button className="w-full" disabled={submitting} type="submit">
            {submitting ? <><BusySpinner className="h-5 w-5" /><span>발송 중...</span></> : '인증 코드 보내기'}
          </Button>
        </form>
      )}

      {step === 'code' && (
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void verifyCode() }}>
          <label className="block text-sm font-medium text-neutral-700">
            인증 코드
            <input
              autoComplete="one-time-code"
              className="input mt-2 text-center font-mono tracking-[0.25em]"
              disabled={submitting}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6자리 숫자"
              value={code}
            />
          </label>
          <Button className="w-full" disabled={submitting || code.length !== 6} type="submit">
            {submitting ? <><BusySpinner className="h-5 w-5" /><span>확인 중...</span></> : '인증 코드 확인'}
          </Button>
          <button className="min-h-11 w-full text-sm text-neutral-500 hover:text-neutral-900" onClick={() => goTo('email')} type="button">
            이메일 다시 입력하기
          </button>
        </form>
      )}

      {step === 'password' && (
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void resetPassword() }}>
          <label className="block text-sm font-medium text-neutral-700">
            새 비밀번호
            <input
              autoComplete="new-password"
              className="input mt-2"
              disabled={submitting}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="영문과 숫자 포함 8자 이상"
              type="password"
              value={newPassword}
            />
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            새 비밀번호 확인
            <input
              autoComplete="new-password"
              className="input mt-2"
              disabled={submitting}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="새 비밀번호를 다시 입력하세요"
              type="password"
              value={passwordConfirm}
            />
          </label>
          <Button className="w-full" disabled={submitting} type="submit">
            {submitting ? <><BusySpinner className="h-5 w-5" /><span>변경 중...</span></> : '새 비밀번호로 변경'}
          </Button>
          <button className="min-h-11 w-full text-sm text-neutral-500 hover:text-neutral-900" onClick={() => goTo('code')} type="button">
            인증 코드 다시 확인하기
          </button>
        </form>
      )}
    </div>
  )
}
