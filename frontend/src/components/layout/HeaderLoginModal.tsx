import type { ReactElement } from 'react'

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
 * HeaderLoginModal 외부 컨트랙트.
 *
 * 2C-2A 단계에서는 **선언만** 작성한다. Header.tsx(1037줄)에서 다음 의존을
 * 잘라낼 때 이 props에 1:1로 매핑된다:
 *
 *   - state (Header.tsx 32-85)
 *       showLoginModal   → props.open
 *       modalMode        → props.mode (+ props.onChangeMode 예정)
 *       loginForm/loginError/isLoggingIn → 내부 자기 소유
 *       forgotEmail/resetCode/newPassword/newPasswordConfirm
 *       forgotError/forgotSuccess
 *       isSendingCode/isVerifyingCode/isResettingPassword
 *       → 내부 자기 소유
 *
 *   - handler (Header.tsx 136-288)
 *       handleLoginSubmit / handleForgotPassword
 *       handleVerifyResetCode / handleResetPassword
 *       closeLoginModal (= props.onClose)
 *       → 내부 자기 소유
 *
 *   - 외부 의존
 *       useAuth().loginWithContext, useAuth().closeLoginPrompt
 *       authApi.forgotPassword / verifyResetCode / resetPassword
 *       ← 2C-2B에서 컴포넌트 내부에서 직접 호출
 *
 * 2C-2A는 props 컨트랙트 + mode 타입만 확정한다. 실제 mount / state 이전은
 * 2C-2B에서 수행한다 (이 컴포넌트가 렌더되면 시각적으로는 아직 변화 없음).
 */
export interface HeaderLoginModalProps {
  /** 모달 가시성. true면 렌더링 트리에 올라오고, false면 해제된다. */
  readonly open: boolean
  /** 현재 모달 단계. 내부 처리 흐름을 제어하는 단일 상태. */
  readonly mode: LoginModalMode
  /**
   * 모달 닫기 요청 콜백. Header 측에서 다음을 함께 정리해야 한다:
   *   - AuthContext.closeLoginPrompt()
   *   - useEffect 트리거 (URL `?showLogin=true` / sessionStorage 플래그)
   */
  readonly onClose: () => void
}

/**
 * 2C-2A placeholder 컴포넌트.
 *
 * - props만 받는다.
 * - 렌더 결과는 항상 null (헤더에 마운트되지 않은 상태).
 * - tsc/vite 빌드가 통과하는지 검증하는 것이 1차 목표.
 *
 * 다음 턴(2C-2B) 작업:
 *   1) useState/useReducer/useEffect를 이 컴포넌트 내부로 이동
 *   2) useAuth.loginWithContext, authApi.* 직접 호출
 *   3) Header.tsx에서 직접 호출하던 JSX 블록을 이 컴포넌트가 반환
 *   4) props 인터페이스에 onChangeMode / onLoggedIn 등 callback 추가 여부 결정
 *   5) 헤더에 <HeaderLoginModal /> 1줄 마운트
 */
function HeaderLoginModal(
  props: HeaderLoginModalProps
): ReactElement | null {
  // props 구조분해 + 타입 체크만 수행한다 (마운트 전 동작이 없어야 함)
  const { open, mode, onClose } = props
  if (!open) return null
  if (mode !== 'login' && mode !== 'forgotPassword' && mode !== 'verifyCode' && mode !== 'resetPassword') {
    return null
  }
  if (typeof onClose !== 'function') return null

  // 2C-2B에서 위 가드 통과 후 실제 JSX를 반환한다.
  return null
}

export default HeaderLoginModal
