import { z } from 'zod'
import { apiClient } from './client'
import type { AthleteSearchCard, PublicRecord } from './recordAnalytics'
import { athleteSearchCardSchema, publicRecordSchema } from './recordAnalyticsSchemas'
import { AthleteKeySchema } from '../features/record-workspace/model'

const BASE = '/api/card-studio/analytics/record-workspaces'

export type RecordWorkspacePreviewRequest = {
  readonly subjectKeys: readonly string[]
  readonly cursor?: string
  readonly limit?: number
}

export type RecordWorkspaceSubject = AthleteSearchCard

export type RecordWorkspaceResolvedSubjectKey = {
  readonly requestedSubjectKey: string
  readonly athleteKey: string
}

export type RecordWorkspaceAffiliation = {
  readonly label: string
  readonly firstObservedSeason: number
  readonly lastObservedSeason: number
  readonly recordCount: number
  readonly status: 'latest_observed' | 'past_observed' | 'needs_review'
}

export type RecordWorkspaceEvent = {
  readonly eventKey: string
  readonly eventLabel: string
  readonly recordCount: number
  readonly best: PublicRecord | null
}

export type RecordWorkspaceCoverage = {
  readonly totalMatched: number
  readonly returned: number
  readonly hasMore: boolean
  readonly nextCursor: string | null
  readonly observedSeasons: readonly number[]
  readonly competitionCount: number
  readonly sourceCount: number
  readonly lastCapturedAt: string | null
  readonly qualityState: 'visible_index' | 'partial_source'
}

export type RecordWorkspaceIdentity = {
  readonly displayName: string
  readonly distinctNames: readonly string[]
  readonly warning: 'none' | 'same_name' | 'different_names'
}

export type RecordWorkspacePreview = {
  readonly subjects: readonly RecordWorkspaceSubject[]
  readonly resolvedSubjectKeys: readonly RecordWorkspaceResolvedSubjectKey[]
  readonly unavailableSubjectKeys: readonly string[]
  readonly identity: RecordWorkspaceIdentity
  readonly affiliations: readonly RecordWorkspaceAffiliation[]
  readonly coverage: RecordWorkspaceCoverage
  readonly events: readonly RecordWorkspaceEvent[]
  readonly records: readonly PublicRecord[]
}

const resolvedSubjectKeySchema = z.strictObject({
  requestedSubjectKey: AthleteKeySchema,
  athleteKey: AthleteKeySchema,
})

const recordWorkspaceSubjectSchema = athleteSearchCardSchema.extend({
  athleteKey: AthleteKeySchema,
}).strict()

const recordWorkspacePublicRecordSchema = publicRecordSchema.extend({
  athleteKey: AthleteKeySchema,
}).strict()

const recordWorkspacePreviewSchema = z.strictObject({
  subjects: z.array(recordWorkspaceSubjectSchema),
  resolvedSubjectKeys: z.array(resolvedSubjectKeySchema),
  unavailableSubjectKeys: z.array(AthleteKeySchema),
  identity: z.strictObject({
    displayName: z.string(),
    distinctNames: z.array(z.string()),
    warning: z.enum(['none', 'same_name', 'different_names']),
  }),
  affiliations: z.array(z.strictObject({
    label: z.string(),
    firstObservedSeason: z.number().int(),
    lastObservedSeason: z.number().int(),
    recordCount: z.number().int().nonnegative(),
    status: z.enum(['latest_observed', 'past_observed', 'needs_review']),
  })),
  coverage: z.strictObject({
    totalMatched: z.number().int().nonnegative(),
    returned: z.number().int().nonnegative(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    observedSeasons: z.array(z.number().int()),
    competitionCount: z.number().int().nonnegative(),
    sourceCount: z.number().int().nonnegative(),
    lastCapturedAt: z.string().nullable(),
    qualityState: z.enum(['visible_index', 'partial_source']),
  }),
  events: z.array(z.strictObject({
    eventKey: z.string().min(1),
    eventLabel: z.string(),
    recordCount: z.number().int().nonnegative(),
    best: publicRecordSchema.nullable(),
  })),
  records: z.array(recordWorkspacePublicRecordSchema),
})

const recordWorkspaceEnvelopeSchema = z.strictObject({
  success: z.literal(true),
  data: z.unknown(),
})

export class RecordWorkspaceApiBoundaryError extends Error {
  readonly name = 'RecordWorkspaceApiBoundaryError'
  readonly endpoint: string
  readonly issues: readonly string[]

  constructor(endpoint: string, issues: readonly string[]) {
    super(`Invalid record workspace response from ${endpoint}`)
    this.endpoint = endpoint
    this.issues = issues
  }
}

function parseRecordWorkspaceResponse(
  response: unknown,
  requestedSubjectKeys: readonly string[],
  endpoint: string,
): RecordWorkspacePreview {
  const envelope = recordWorkspaceEnvelopeSchema.safeParse(response)
  if (!envelope.success) {
    throw new RecordWorkspaceApiBoundaryError(endpoint, envelope.error.issues.map((issue) => issue.message))
  }
  const preview = recordWorkspacePreviewSchema.safeParse(envelope.data.data)
  if (!preview.success) {
    throw new RecordWorkspaceApiBoundaryError(
      endpoint,
      preview.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`),
    )
  }

  const requestIssues = requestedSubjectKeys.flatMap((subjectKey, index) => (
    AthleteKeySchema.safeParse(subjectKey).success
      ? []
      : [`subjectKeys[${index}]: invalid athlete key`]
  ))
  const submitted = new Set(requestedSubjectKeys)
  const subjectKeys = new Set(preview.data.subjects.map((subject) => subject.athleteKey))
  const seenRequested = new Set<string>()
  const seenUnavailable = new Set<string>()
  const mappedCanonicalKeys = new Set<string>()
  const mappingIssues: string[] = []
  if (requestIssues.length > 0) mappingIssues.push(...requestIssues)
  if (subjectKeys.size !== preview.data.subjects.length) mappingIssues.push('subjects contained duplicate athlete keys')
  for (const mapping of preview.data.resolvedSubjectKeys) {
    if (!submitted.has(mapping.requestedSubjectKey)) mappingIssues.push('resolved requested key was not submitted')
    if (!subjectKeys.has(mapping.athleteKey)) mappingIssues.push('resolved athlete key was not returned as a subject')
    if (seenRequested.has(mapping.requestedSubjectKey)) mappingIssues.push('resolved requested key was duplicated')
    if (subjectKeys.has(mapping.requestedSubjectKey) && mapping.requestedSubjectKey !== mapping.athleteKey) {
      mappingIssues.push('direct requested key was mapped to a different athlete key')
    }
    seenRequested.add(mapping.requestedSubjectKey)
    mappedCanonicalKeys.add(mapping.athleteKey)
  }
  for (const unavailableSubjectKey of preview.data.unavailableSubjectKeys) {
    if (!submitted.has(unavailableSubjectKey)) mappingIssues.push('unavailable requested key was not submitted')
    if (seenRequested.has(unavailableSubjectKey)) mappingIssues.push('requested key was both resolved and unavailable')
    if (seenUnavailable.has(unavailableSubjectKey)) mappingIssues.push('unavailable requested key was duplicated')
    seenUnavailable.add(unavailableSubjectKey)
  }
  const representedRequestedKeys = new Set([...seenRequested, ...seenUnavailable])
  for (const submittedSubjectKey of submitted) {
    if (!representedRequestedKeys.has(submittedSubjectKey)) mappingIssues.push('submitted requested key was not resolved or unavailable')
  }
  for (const subjectKey of subjectKeys) {
    if (!mappedCanonicalKeys.has(subjectKey)) mappingIssues.push('returned subject was not mapped from a request')
  }
  for (const record of preview.data.records) {
    if (!subjectKeys.has(record.athleteKey)) mappingIssues.push('record athlete key was not returned as a subject')
  }
  if (mappingIssues.length > 0) throw new RecordWorkspaceApiBoundaryError(endpoint, mappingIssues)
  return preview.data
}

export async function previewRecordWorkspace(
  request: RecordWorkspacePreviewRequest,
): Promise<RecordWorkspacePreview> {
  const { data } = await apiClient.post<unknown>(
    `${BASE}/preview`,
    request,
  )
  return parseRecordWorkspaceResponse(data, request.subjectKeys, `${BASE}/preview`)
}
