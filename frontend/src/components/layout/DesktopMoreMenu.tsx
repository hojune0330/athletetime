import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'

export type DesktopMoreNavItem = Readonly<{
  path: string
  label: string
  note: string
}>

type DesktopMoreMenuProps = Readonly<{
  readonly items: readonly DesktopMoreNavItem[]
  readonly isActive: (path: string) => boolean
}>

const MENU_ID = 'desktop-more-menu'
const TRIGGER_ID = 'desktop-more-menu-trigger'

export function DesktopMoreMenu({ items, isActive }: DesktopMoreMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
  }, [])

  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeAndRestoreFocus()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [closeAndRestoreFocus, open])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={TRIGGER_ID}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-controls={MENU_ID}
        aria-expanded={open}
        className={`relative flex items-center gap-1 px-3 py-2 text-body-sm font-medium transition-colors ${
          items.some((item) => isActive(item.path))
            ? 'text-brand'
            : 'text-ink-2 hover:text-ink'
        }`}
      >
        더보기
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div
            aria-hidden="true"
            data-desktop-more-menu-backdrop
            className="fixed inset-0 z-40 cursor-default"
            onMouseDown={closeAndRestoreFocus}
          />
          <div
            id={MENU_ID}
            aria-labelledby={TRIGGER_ID}
            className="absolute right-0 top-full z-50 mt-1 w-56 rounded-sm border border-line bg-surface py-1 shadow-subtle animate-fadeIn"
          >
            <div className="border-b border-hair px-3 py-2 font-mono text-mono-xs uppercase tracking-widest-2 text-ink-4">도구·부가 기능</div>
            {items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-baseline justify-between gap-2 px-3 py-2 text-body-sm transition-colors hover:bg-surface-2 ${
                  isActive(item.path) ? 'text-brand' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-mono-xs text-ink-4">{item.note}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
