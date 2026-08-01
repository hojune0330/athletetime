import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-ink/50 transition-opacity duration-200',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'motion-reduce:animate-none motion-reduce:duration-0',
      className,
    )}
    {...props}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  [
    'fixed z-50 border-line bg-surface text-ink shadow-[0_-12px_40px_rgba(14,20,18,0.12)]',
    'duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in',
    'motion-reduce:animate-none motion-reduce:duration-0',
  ].join(' '),
  {
    variants: {
      side: {
        bottom: [
          'inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto overscroll-contain border-t',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        ].join(' '),
        right: [
          'inset-y-0 right-0 h-full w-[min(92vw,28rem)] overflow-y-auto overscroll-contain border-l',
          'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        ].join(' '),
      },
    },
    defaultVariants: {
      side: 'bottom',
    },
  },
)

type SheetContentProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>
  & VariantProps<typeof sheetVariants>
  & {
    readonly closeLabel?: string
  }

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'bottom', className, children, closeLabel = '닫기', ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        sheetVariants({ side }),
        'px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:px-6',
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close
        className={cn(
          'absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-sm text-ink-3',
          'transition-colors hover:bg-surface-2 hover:text-ink active:translate-y-px',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          'disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:duration-0',
        )}
      >
        <X className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">{closeLabel}</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 border-b border-hair pb-4 pr-12 text-left', className)}
      {...props}
    />
  )
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-5 flex flex-col-reverse gap-2 border-t border-hair pt-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('text-h3 font-semibold leading-tight tracking-tight text-ink', className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-body-sm leading-5 text-ink-3', className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
