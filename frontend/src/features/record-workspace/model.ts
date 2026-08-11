import { z } from 'zod'

export const WORKSPACE_LIMITS = {
  comparisonSubjects: 4,
  selfClaimSubjects: 6,
  workspaceDraftSubjects: 6,
  workspaces: 20,
  titleLength: 40,
} as const

export const STORAGE_KEYS = {
  comparison: 'athletetime.recordComparisons.v1',
  migration: 'athletetime.recordMigration.v1',
  selfClaimDraft: 'athletetime.selfClaimDraft.v1',
  workspaceDraft: 'athletetime.recordWorkspaceDraft.v1',
  workspaces: 'athletetime.recordWorkspaces.v1',
} as const

export const RECORD_DEVICE_DATA_CLEARED_EVENT = 'athletetime:record-device-data-cleared'

const publicAthleteKeyPattern = /^(?:[a-f0-9]{16}|at_[a-z0-9_-]{8,80})$/
const focusTokenPattern = /^[a-z0-9][a-z0-9:_-]{0,79}$/i

export const AthleteKeySchema = z.string().max(120).regex(publicAthleteKeyPattern).brand<'AthleteKey'>()
export const WorkspaceIdSchema = z.string().uuid().brand<'WorkspaceId'>()
export const ComparisonIdSchema = z.string().uuid().brand<'ComparisonId'>()
export const FocusTokenSchema = z.string().regex(focusTokenPattern).brand<'FocusToken'>()
export const IsoDateSchema = z.string().datetime({ offset: true })

const uniqueKeys = (maximum: number) => z
  .array(AthleteKeySchema)
  .min(1)
  .transform((keys) => [...new Set(keys)])
  .refine((keys) => keys.length <= maximum)

const ReturnContextSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('athlete'),
    id: AthleteKeySchema,
    focusToken: FocusTokenSchema,
  }),
  z.object({
    kind: z.literal('workspace'),
    id: WorkspaceIdSchema,
    focusToken: FocusTokenSchema,
  }),
])

const WorkspaceFilterSchema = z.object({
  eventKey: z.string().trim().min(1).max(80).optional(),
  seasons: z.array(z.number().int().min(1900).max(2200)).max(100).optional(),
  sort: z.union([z.literal('newest'), z.literal('oldest')]).optional(),
})

export const WorkspaceDraftSchema = z.object({
  version: z.literal(1),
  subjectKeys: uniqueKeys(WORKSPACE_LIMITS.workspaceDraftSubjects),
  updatedAt: IsoDateSchema,
})

export const SelfClaimDraftSchema = z.object({
  version: z.literal(1),
  subjectKeys: uniqueKeys(WORKSPACE_LIMITS.selfClaimSubjects),
  updatedAt: IsoDateSchema,
})

export const RecordWorkspaceSchema = z.object({
  id: WorkspaceIdSchema,
  title: z.string().trim().min(1).max(WORKSPACE_LIMITS.titleLength),
  subjectKeys: uniqueKeys(WORKSPACE_LIMITS.workspaceDraftSubjects),
  excludedRecordIds: z.array(z.string().trim().min(1).max(120)).max(500).transform((ids) => [...new Set(ids)]),
  filter: WorkspaceFilterSchema,
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
})

export const WorkspacesEnvelopeSchema = z.object({
  version: z.literal(1),
  items: z.array(RecordWorkspaceSchema).max(WORKSPACE_LIMITS.workspaces),
})

const comparisonBase = {
  id: ComparisonIdSchema,
  returnContext: ReturnContextSchema.optional().catch(undefined),
  updatedAt: IsoDateSchema,
}

const ComparisonSetupSchema = z.object({
  ...comparisonBase,
  state: z.literal('setup'),
  subjectKeys: uniqueKeys(WORKSPACE_LIMITS.comparisonSubjects),
})

const ComparisonReadySchema = z.object({
  ...comparisonBase,
  state: z.literal('ready'),
  subjectKeys: uniqueKeys(WORKSPACE_LIMITS.comparisonSubjects).refine((keys) => keys.length >= 2),
  eventKey: z.string().trim().min(1).max(80),
})

export const RecordComparisonSchema = z.discriminatedUnion('state', [
  ComparisonSetupSchema,
  ComparisonReadySchema,
])

export const ComparisonEnvelopeSchema = z.object({
  version: z.literal(1),
  value: RecordComparisonSchema,
})

export const MigrationStateSchema = z.object({
  version: z.literal(1),
  status: z.literal('completed'),
  completedAt: IsoDateSchema,
})

export type AthleteKey = z.infer<typeof AthleteKeySchema>
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>
export type RecordWorkspace = z.infer<typeof RecordWorkspaceSchema>
export type RecordWorkspaceDraft = z.infer<typeof WorkspaceDraftSchema>
export type SelfClaimDraft = z.infer<typeof SelfClaimDraftSchema>
export type RecordComparison = z.infer<typeof RecordComparisonSchema>
export type MigrationState = z.infer<typeof MigrationStateSchema>
