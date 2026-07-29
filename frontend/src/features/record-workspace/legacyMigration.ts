import { z } from 'zod'
import { AthleteKeySchema, WORKSPACE_LIMITS, type AthleteKey } from './model'
import { type RecordWorkspaceStorage } from './storage'
import { type StorageLike } from './storageBoundary'

export const LEGACY_STORAGE_KEYS = {
  v1: 'athletetime.my-athlete.v1',
  v2: 'athletetime.my-athlete.v2',
} as const

const LegacyEntrySchema = z.object({
  athleteKey: AthleteKeySchema,
})

const LegacyV1Schema = LegacyEntrySchema
const LegacyV2Schema = z.array(z.unknown())

export type LegacyMigrationInspection = {
  readonly hasLegacy: boolean
  readonly storageAvailable: boolean
  readonly subjectKeys: readonly AthleteKey[]
}

export type LegacyMigrationChoice = 'clear' | 'self' | 'workspace'

export type LegacyMigrationResult =
  | {
      readonly ok: true
      readonly destination: LegacyMigrationChoice
      readonly subjectKeys: readonly AthleteKey[]
    }
  | {
      readonly ok: false
      readonly reason: 'invalid_data' | 'nothing_to_migrate' | 'storage_unavailable'
    }

type MigrateLegacyOptions = {
  readonly choice: LegacyMigrationChoice
  readonly local: StorageLike
  readonly store: RecordWorkspaceStorage
}

export function inspectLegacyMyAthlete(local: StorageLike): LegacyMigrationInspection {
  let v1Raw: string | null
  let v2Raw: string | null
  try {
    v2Raw = local.getItem(LEGACY_STORAGE_KEYS.v2)
    v1Raw = local.getItem(LEGACY_STORAGE_KEYS.v1)
  } catch {
    return { hasLegacy: false, storageAvailable: false, subjectKeys: [] }
  }

  const candidates = [
    ...parseV2(v2Raw),
    ...parseV1(v1Raw),
  ]
  const subjectKeys = [...new Set(candidates)].slice(0, WORKSPACE_LIMITS.selfClaimSubjects)
  return {
    hasLegacy: v1Raw !== null || v2Raw !== null,
    storageAvailable: true,
    subjectKeys,
  }
}

export function migrateLegacyMyAthlete(options: MigrateLegacyOptions): LegacyMigrationResult {
  const inspection = inspectLegacyMyAthlete(options.local)
  if (!inspection.storageAvailable) return { ok: false, reason: 'storage_unavailable' }
  if (!inspection.hasLegacy) return { ok: false, reason: 'nothing_to_migrate' }
  if (options.choice !== 'clear' && inspection.subjectKeys.length === 0) {
    return { ok: false, reason: 'invalid_data' }
  }

  const destinationPersistence = writeDestination(options, inspection.subjectKeys)
  if (destinationPersistence !== 'persistent') return { ok: false, reason: 'storage_unavailable' }

  const marker = options.store.saveMigrationCompletion()
  if (!marker.ok || marker.persistence !== 'persistent') {
    return { ok: false, reason: 'storage_unavailable' }
  }
  try {
    options.local.removeItem(LEGACY_STORAGE_KEYS.v2)
    options.local.removeItem(LEGACY_STORAGE_KEYS.v1)
  } catch {
    return { ok: false, reason: 'storage_unavailable' }
  }
  return {
    ok: true,
    destination: options.choice,
    subjectKeys: inspection.subjectKeys,
  }
}

function writeDestination(
  options: MigrateLegacyOptions,
  subjectKeys: readonly AthleteKey[],
): 'persistent' | 'volatile' {
  switch (options.choice) {
    case 'clear':
      return 'persistent'
    case 'self': {
      const result = options.store.saveSelfClaimDraft(subjectKeys)
      return result.ok ? result.persistence : 'volatile'
    }
    case 'workspace': {
      const result = options.store.createWorkspace({ subjectKeys })
      return result.ok ? result.persistence : 'volatile'
    }
  }
}

function parseV1(raw: string | null): readonly AthleteKey[] {
  if (raw === null) return []
  try {
    const parsed = LegacyV1Schema.safeParse(JSON.parse(raw))
    return parsed.success ? [parsed.data.athleteKey] : []
  } catch {
    return []
  }
}

function parseV2(raw: string | null): readonly AthleteKey[] {
  if (raw === null) return []
  try {
    const parsed = LegacyV2Schema.safeParse(JSON.parse(raw))
    if (!parsed.success) return []
    return parsed.data.flatMap((entry) => {
      const candidate = LegacyEntrySchema.safeParse(entry)
      return candidate.success ? [candidate.data.athleteKey] : []
    })
  } catch {
    return []
  }
}
