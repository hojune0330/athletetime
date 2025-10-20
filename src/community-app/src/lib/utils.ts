export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' })

export function formatRelativeTime(target: string | number | Date) {
  const date = new Date(target)
  const now = new Date()
  const diff = (date.getTime() - now.getTime()) / 1000

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  for (const [unit, seconds] of ranges) {
    const delta = diff / seconds
    if (Math.abs(delta) >= 1 || unit === 'second') {
      return rtf.format(Math.round(delta), unit)
    }
  }

  return '방금 전'
}

export function formatDate(target: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('ko', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(new Date(target))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('ko').format(value)
}
