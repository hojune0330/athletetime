import { z } from 'zod'

export const TEAM_CATEGORIES = [
  'corporate',
  'university',
  'high',
  'middle',
  'elementary',
  'unclassified',
] as const

const TeamCategorySchema = z.enum(TEAM_CATEGORIES)
const TeamKeySchema = z.string().regex(/^[a-f0-9]{16}$/u).brand<'TeamKey'>()
const NullableSeasonSchema = z.number().int().min(1900).max(2100).nullable()
const NullableTextSchema = z.string().nullable()

const CategoryEvidenceSchema = z.object({
  category: TeamCategorySchema,
  resultCount: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().min(1).max(100)).max(12).readonly(),
}).readonly()

const AggregateShape = {
  athleteCount: z.number().int().nonnegative(),
  resultCount: z.number().int().nonnegative(),
  competitionCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  confirmedPodiumCount: z.number().int().nonnegative(),
  confirmedPodium: z.object({
    first: z.number().int().nonnegative(),
    second: z.number().int().nonnegative(),
    third: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }).readonly(),
  ambiguousPodiumCount: z.number().int().nonnegative(),
  preliminaryPodiumRowsExcluded: z.number().int().nonnegative(),
  indexedImprovementCount: z.number().int().nonnegative(),
  sourceMarkedPersonalBestCount: z.number().int().nonnegative(),
} as const

const AggregateSchema = z.object(AggregateShape).readonly()

const TeamSearchSummarySchema = z.object({
  teamKey: TeamKeySchema,
  teamLabel: z.string().min(1).max(100),
  selectedCategory: TeamCategorySchema.nullable(),
  primaryCategory: TeamCategorySchema,
  categoryEvidence: CategoryEvidenceSchema.nullable(),
  categoryBreakdown: z.array(CategoryEvidenceSchema).max(TEAM_CATEGORIES.length).readonly(),
  athleteCount: z.number().int().nonnegative(),
  resultCount: z.number().int().nonnegative(),
  competitionCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  confirmedPodiumCount: z.number().int().nonnegative(),
  indexedImprovementCount: z.number().int().nonnegative(),
  firstSeason: NullableSeasonSchema,
  latestSeason: NullableSeasonSchema,
  latestDate: NullableTextSchema,
  coverageDisclaimer: z.string().min(1).max(300),
}).readonly()

const TeamSearchEnvelopeSchema = z.object({
  success: z.literal(true),
  contractVersion: z.literal(1),
  total: z.number().int().min(0).max(30),
  data: z.array(TeamSearchSummarySchema).max(30).readonly(),
}).readonly()

const TeamDetailSchema = z.object({
  identity: z.object({
    teamKey: TeamKeySchema,
    teamLabel: z.string().min(1).max(100),
    selectedCategory: TeamCategorySchema,
    categoryEvidence: CategoryEvidenceSchema,
    otherCategories: z.array(CategoryEvidenceSchema).max(TEAM_CATEGORIES.length - 1).readonly(),
  }).readonly(),
  summary: AggregateSchema,
  seasonTrend: z.array(z.object({
    ...AggregateShape,
    season: z.number().int().min(1900).max(2100),
  }).readonly()).max(120).readonly(),
  eventBreakdown: z.array(z.object({
    ...AggregateShape,
    eventKey: z.string().min(1).max(120),
    eventLabel: z.string().min(1).max(120),
  }).readonly()).max(120).readonly(),
  participation: z.array(z.object({
    competitionKey: z.string().regex(/^[a-f0-9]{16}$/u),
    competitionName: z.string().min(1).max(200),
    season: NullableSeasonSchema,
    latestDate: NullableTextSchema,
    resultCount: z.number().int().nonnegative(),
    confirmedPodiumCount: z.number().int().nonnegative(),
  }).readonly()).max(120).readonly(),
  improvement: z.array(z.object({
    ...AggregateShape,
    season: z.number().int().min(1900).max(2100),
    eventKey: z.string().min(1).max(120),
    eventLabel: z.string().min(1).max(120),
  }).readonly()).max(120).readonly(),
  coverage: z.object({
    appliedScope: z.enum(['latest', 'all', 'season']),
    appliedSeason: NullableSeasonSchema,
    firstSeason: NullableSeasonSchema,
    latestSeason: NullableSeasonSchema,
    availableSeasons: z.array(z.number().int().min(1900).max(2100)).max(200).readonly(),
    latestDate: NullableTextSchema,
    sourceCount: z.number().int().nonnegative(),
    lastCapturedAt: NullableTextSchema,
    ambiguousPodiumCount: z.number().int().nonnegative(),
    preliminaryPodiumRowsExcluded: z.number().int().nonnegative(),
    participationTotal: z.number().int().nonnegative(),
    participationReturned: z.number().int().min(0).max(120),
    improvementGroupTotal: z.number().int().nonnegative(),
    improvementGroupReturned: z.number().int().min(0).max(120),
    disclaimer: z.string().min(1).max(500),
  }).readonly(),
}).readonly()

const TeamDetailEnvelopeSchema = z.object({
  success: z.literal(true),
  contractVersion: z.literal(1),
  data: TeamDetailSchema,
}).readonly()

export type TeamCategory = z.infer<typeof TeamCategorySchema>
export type TeamKey = z.infer<typeof TeamKeySchema>
export type TeamSearchSummary = z.infer<typeof TeamSearchSummarySchema>
export type TeamPerformanceDetail = z.infer<typeof TeamDetailSchema>

export type TeamDetailPeriod =
  | { readonly kind: 'latest' }
  | { readonly kind: 'all' }
  | { readonly kind: 'season'; readonly season: number }

export type TeamDetailQuery = {
  readonly category: TeamCategory | null
  readonly period: TeamDetailPeriod
}

export type TeamDetailQueryResult =
  | { readonly kind: 'ready'; readonly value: TeamDetailQuery }
  | { readonly kind: 'invalid'; readonly code: 'INVALID_TEAM_CATEGORY' | 'INVALID_TEAM_SCOPE' | 'INVALID_TEAM_SEASON' }

export class TeamPerformanceContractError extends Error {
  readonly code = 'INVALID_TEAM_PAYLOAD' as const
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super('팀 통계 응답을 읽을 수 없어요.')
    this.name = 'TeamPerformanceContractError'
    this.issues = issues
  }
}

export function parseTeamCategory(input: unknown): TeamCategory | null {
  const parsed = TeamCategorySchema.safeParse(input)
  return parsed.success ? parsed.data : null
}

export function parseTeamKey(input: unknown): TeamKey | null {
  const parsed = TeamKeySchema.safeParse(input)
  return parsed.success ? parsed.data : null
}

export function parseTeamSearchResponse(input: unknown): readonly TeamSearchSummary[] {
  return parsePayload(TeamSearchEnvelopeSchema, input).data
}

export function parseTeamDetailResponse(input: unknown): TeamPerformanceDetail {
  return parsePayload(TeamDetailEnvelopeSchema, input).data
}

export function parseTeamDetailQuery(params: URLSearchParams): TeamDetailQueryResult {
  const categoryRaw = params.get('category') || ''
  const category = categoryRaw ? TeamCategorySchema.safeParse(categoryRaw) : null
  if (category && !category.success) return { kind: 'invalid', code: 'INVALID_TEAM_CATEGORY' }

  const scope = params.get('scope') || 'latest'
  if (scope !== 'latest' && scope !== 'all') return { kind: 'invalid', code: 'INVALID_TEAM_SCOPE' }

  const seasonRaw = params.get('season')
  if (seasonRaw) {
    if (!/^\d{4}$/u.test(seasonRaw)) return { kind: 'invalid', code: 'INVALID_TEAM_SEASON' }
    const season = Number(seasonRaw)
    if (season < 1900 || season > new Date().getFullYear() + 1) {
      return { kind: 'invalid', code: 'INVALID_TEAM_SEASON' }
    }
    return {
      kind: 'ready',
      value: { category: category?.data ?? null, period: { kind: 'season', season } },
    }
  }

  return {
    kind: 'ready',
    value: {
      category: category?.data ?? null,
      period: scope === 'all' ? { kind: 'all' } : { kind: 'latest' },
    },
  }
}

function parsePayload<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (parsed.success) return parsed.data
  throw new TeamPerformanceContractError(
    parsed.error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.code}`),
  )
}
