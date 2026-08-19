import type { TeamCategory } from './teamPerformanceContracts'

const LABELS: Readonly<Record<TeamCategory, string>> = {
  corporate: '실업·기관 소속',
  university: '대학 소속',
  high: '고교 소속',
  middle: '중학교 소속',
  elementary: '초등학교 소속',
  unclassified: '소속 유형 미확인',
}

export function teamCategoryLabel(category: TeamCategory): string {
  return LABELS[category]
}