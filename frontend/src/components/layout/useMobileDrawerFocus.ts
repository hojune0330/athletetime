import { useCallback, useEffect, useRef, type RefObject } from 'react'

type MobileDrawerFocusOptions = {
  readonly open: boolean
  readonly onClose: () => void
  readonly triggerRef?: RefObject<HTMLButtonElement | null>
  readonly drawerRef: RefObject<HTMLDivElement | null>
  readonly closeButtonRef: RefObject<HTMLButtonElement | null>
}

export function useMobileDrawerFocus({
  open,
  onClose,
  triggerRef,
  drawerRef,
  closeButtonRef,
}: MobileDrawerFocusOptions) {
  const restoreTargetRef = useRef<HTMLElement | null>(null)

  const closeAndRestoreFocus = useCallback(() => {
    const focusTarget = restoreTargetRef.current ?? triggerRef?.current
    onClose()
    focusTarget?.focus({ preventScroll: true })
  }, [onClose, triggerRef])

  useEffect(() => {
    if (!open) return

    const activeElement = document.activeElement
    restoreTargetRef.current = activeElement instanceof HTMLButtonElement
      && activeElement.getAttribute('aria-controls') === 'mobile-navigation-drawer'
      ? activeElement
      : triggerRef?.current ?? null

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeAndRestoreFocus()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(drawerRef.current)
      const first = focusable.at(0)
      const last = focusable.at(-1)
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeAndRestoreFocus, closeButtonRef, drawerRef, open, triggerRef])

  return closeAndRestoreFocus
}

function getFocusableElements(root: HTMLDivElement | null): HTMLElement[] {
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.tabIndex >= 0 && !element.hasAttribute('aria-hidden'))
}
