export type AddAthleteToDraftResult =
  | {
    readonly kind: 'already_added'
    readonly subjectKeys: readonly string[]
  }
  | {
    readonly kind: 'limit'
    readonly subjectKeys: readonly string[]
  }
  | {
    readonly kind: 'updated'
    readonly subjectKeys: readonly string[]
  }

export function addAthleteToWorkspaceDraft(
  currentSubjectKeys: readonly string[],
  athleteKey: string,
  maximum: number,
): AddAthleteToDraftResult {
  const subjectKeys = [...new Set(currentSubjectKeys)]
  if (subjectKeys.includes(athleteKey)) return { kind: 'already_added', subjectKeys }
  if (subjectKeys.length >= maximum) return { kind: 'limit', subjectKeys }
  return { kind: 'updated', subjectKeys: [...subjectKeys, athleteKey] }
}
