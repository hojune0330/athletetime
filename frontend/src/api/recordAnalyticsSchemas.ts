import { z } from 'zod';

const filterOptionSchema = z.strictObject({
  key: z.string().min(1),
  label: z.string(),
});

const divisionFilterOptionSchema = filterOptionSchema.extend({
  gender: z.string().min(1),
  level: z.string().min(1),
}).strict();

const defaultSeasonSelectionSchema = z.strictObject({
  season: z.number().int(),
  eventKey: z.string().min(1),
  eventLabel: z.string(),
  divisionKey: z.string().min(1),
  divisionLabel: z.string(),
  genderKey: z.string().min(1),
  divisionLevel: z.string().min(1),
  rowCount: z.number().int().nonnegative(),
});

export const analyticsFiltersSchema = z.strictObject({
  seasons: z.array(z.number().int()),
  events: z.array(filterOptionSchema),
  divisions: z.array(divisionFilterOptionSchema),
  genderOptions: z.array(filterOptionSchema),
  levelOptions: z.array(filterOptionSchema),
  defaultSeasonSelection: defaultSeasonSelectionSchema,
});

const seasonKeySchema = z.string().regex(/^(?:19|20)\d{2}$/u);
const divisionKeySchema = z.string().regex(
  /^(?:men|women|mixed|unknown)-(?:general|high|university|middle|elementary|u20|u18|masters|unspecified)$/u,
);
const genderOrder: readonly string[] = ['men', 'women', 'mixed', 'unknown'];
const levelOrder: readonly string[] = ['general', 'high', 'university', 'middle', 'elementary', 'u20', 'u18', 'masters', 'unspecified'];

function compareDivisionKeys(left: string, right: string): number {
  const [leftGender = '', leftLevel = ''] = left.split('-');
  const [rightGender = '', rightLevel = ''] = right.split('-');
  return genderOrder.indexOf(leftGender) - genderOrder.indexOf(rightGender)
    || levelOrder.indexOf(leftLevel) - levelOrder.indexOf(rightLevel)
    || left.localeCompare(right);
}

const divisionKeysSchema = z.array(divisionKeySchema).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: 'custom', message: 'division keys must be unique' });
  }
  const sorted = values.slice().sort(compareDivisionKeys);
  if (values.some((value, index) => value !== sorted[index])) {
    context.addIssue({ code: 'custom', message: 'division keys must be sorted' });
  }
});

const seasonAvailabilityWireSchema = z.strictObject({
  seasons: z.record(
    seasonKeySchema,
    z.record(z.string().min(1), divisionKeysSchema),
  ),
});

export type SeasonAvailability = {
  readonly seasonOrder: readonly number[];
  readonly seasons: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
};

export const athleteSearchCardSchema = z.strictObject({
  athleteKey: z.string().min(1),
  name: z.string(),
  team: z.string(),
  teams: z.array(z.string()),
  years: z.array(z.number().int()),
  events: z.array(z.string()),
  divisions: z.array(z.string()),
  recordCount: z.number().int().nonnegative(),
  ambiguity: z.string(),
  note: z.string(),
});

export const athleteSearchCardsSchema = z.array(athleteSearchCardSchema);

const publicSourceSchema = z.strictObject({
  provider: z.string(),
  sourceType: z.string(),
  sourceUrl: z.string(),
  capturedAt: z.string(),
  sourceLabel: z.string().optional(),
  reviewStatus: z.string().optional(),
});

const publicSourceDivisionPatterns = [/^(?:남자|여자|혼성)(?:부)?$/u, /^(?:(?:남자|여자|혼성) *)?(?:일반|실업|대학|고등|고교|중학|초등|마스터즈)(?:학교)?(?: *[1-6] *학년)?(?:부)?$/u, /^(?:남|여)(?:일|대|고|중|초)$/u, /^(?:고|중|초) *[1-6](?: *학년)?(?:부)?$/u, /^(?:U(?:18|20)|(?:M|W)(?:A|\d{2})?)$/iu, /^(?:통합부|공통|전체|구분 *미상)$/u] as const;
const publicSourceDivisionLabelSchema = z.string().max(40).refine((label) => {
  const segments = label.split(/ *[,/·] */u);
  return segments.length <= 3 && segments.every((segment) => publicSourceDivisionPatterns.some((pattern) => pattern.test(segment)));
});

export const publicRecordSchema = z.strictObject({
  id: z.string().min(1),
  athleteKey: z.string().min(1),
  name: z.string(),
  team: z.string(),
  season: z.number().int(),
  competitionName: z.string(),
  date: z.string(),
  venue: z.string(),
  eventKey: z.string().min(1),
  eventLabel: z.string(),
  divisionKey: divisionKeySchema,
  divisionLabel: z.string(),
  gender: z.string().min(1),
  divisionLevel: z.string().min(1),
  divisionDetail: z.string().nullable(),
  sourceDivisionLabel: publicSourceDivisionLabelSchema.nullable(),
  phase: z.string(),
  record: z.string(),
  recordValue: z.number(),
  direction: z.enum(['lower', 'higher']),
  rank: z.number().int().nullable(),
  wind: z.string().nullable(),
  windLegal: z.boolean(),
  isComparable: z.boolean(),
  note: z.string(),
  source: publicSourceSchema,
});

const recordDeltaSchema = z.strictObject({
  from: publicRecordSchema,
  to: publicRecordSchema,
  rawDelta: z.number(),
  display: z.string(),
  improved: z.boolean(),
}).nullable();

const recordTrailPointSchema = z.strictObject({
  id: z.string().min(1),
  date: z.string(),
  season: z.number().int(),
  value: z.number(),
  record: z.string(),
  eventLabel: z.string(),
  competitionName: z.string(),
  isComparable: z.boolean(),
});

const athleteAnalyticsProfileSchema = z.strictObject({
  athlete: athleteSearchCardSchema,
  summary: z.strictObject({
    indexedBest: publicRecordSchema.nullable(),
    seasonBest: publicRecordSchema.nullable(),
    latest: publicRecordSchema.nullable(),
    delta: recordDeltaSchema,
    indexedResultCount: z.number().int().nonnegative(),
    comparableResultCount: z.number().int().nonnegative(),
    sourceScope: z.string(),
    disclaimer: z.string(),
  }),
  events: z.array(z.strictObject({
    eventKey: z.string().min(1),
    eventLabel: z.string(),
    recordCount: z.number().int().nonnegative(),
    best: publicRecordSchema.nullable(),
  })),
  recordTrail: z.array(recordTrailPointSchema),
  records: z.array(publicRecordSchema),
});

const ambiguousAthleteSchema = z.strictObject({
  ambiguity: z.literal('multiple_candidates'),
  candidates: z.array(athleteSearchCardSchema),
});

export type AthleteAnalyticsProfile = z.infer<typeof athleteAnalyticsProfileSchema>;
export type AthleteAnalyticsResult = { readonly kind: 'profile'; readonly profile: AthleteAnalyticsProfile } | { readonly kind: 'ambiguous'; readonly candidates: readonly AthleteSearchCard[] };

export const athleteAnalyticsResultSchema = z.union([
  athleteAnalyticsProfileSchema.transform((profile): AthleteAnalyticsResult => ({ kind: 'profile', profile })),
  ambiguousAthleteSchema.transform(({ candidates }): AthleteAnalyticsResult => ({ kind: 'ambiguous', candidates })),
]);

const seasonRecordRowSchema = z.strictObject({
  rank: z.number().int(),
  athleteKey: z.string().min(1),
  name: z.string(),
  team: z.string(),
  record: z.string(),
  recordValue: z.number(),
  date: z.string(),
  competitionName: z.string(),
  divisionKey: divisionKeySchema,
  divisionLabel: z.string(),
  divisionLevel: z.string().min(1),
  divisionDetail: z.string().nullable(),
  wind: z.string().nullable(),
  windLegal: z.boolean(),
  source: publicSourceSchema,
  highlighted: z.boolean(),
});

export const seasonRecordTableSchema = z.strictObject({
  season: z.number().int(),
  eventKey: z.string().min(1),
  divisionKey: divisionKeySchema,
  eventLabel: z.string(),
  divisionLabel: z.string(),
  totalIndexedAthletes: z.number().int().nonnegative(),
  rows: z.array(seasonRecordRowSchema),
  filters: analyticsFiltersSchema,
  disclaimer: z.string(),
});

const analyticsEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
}).passthrough();

export class AnalyticsApiBoundaryError extends Error {
  readonly name = 'AnalyticsApiBoundaryError';
  readonly endpoint: string;
  readonly issues: readonly string[];

  constructor(
    endpoint: string,
    issues: readonly string[],
  ) {
    super(`Invalid analytics response from ${endpoint}`);
    this.endpoint = endpoint;
    this.issues = issues;
  }
}

export function parseAnalyticsResponse<T>(
  response: unknown,
  payloadSchema: z.ZodType<T>,
  endpoint: string,
): T {
  const envelope = analyticsEnvelopeSchema.safeParse(response);
  if (!envelope.success) {
    throw new AnalyticsApiBoundaryError(endpoint, envelope.error.issues.map((issue) => issue.message));
  }
  const payload = payloadSchema.safeParse(envelope.data.data);
  if (!payload.success) {
    throw new AnalyticsApiBoundaryError(
      endpoint,
      payload.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`),
    );
  }
  return payload.data;
}

export function parseSeasonAvailabilityResponse(response: unknown): SeasonAvailability {
  const wire = parseAnalyticsResponse(
    response,
    seasonAvailabilityWireSchema,
    '/season-availability',
  );
  return {
    seasons: wire.seasons,
    seasonOrder: Object.keys(wire.seasons).map(Number).sort((left, right) => right - left),
  };
}

export type AnalyticsFilterOption = z.infer<typeof filterOptionSchema>;
export type DivisionFilterOption = z.infer<typeof divisionFilterOptionSchema>;
export type DefaultSeasonSelection = z.infer<typeof defaultSeasonSelectionSchema>;
export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;
export type AthleteSearchCard = z.infer<typeof athleteSearchCardSchema>;
export type PublicRecord = z.infer<typeof publicRecordSchema>;
export type RecordDelta = z.infer<typeof recordDeltaSchema>;
export type RecordTrailPoint = z.infer<typeof recordTrailPointSchema>;
export type SeasonRecordRow = z.infer<typeof seasonRecordRowSchema>;
export type SeasonRecordTable = z.infer<typeof seasonRecordTableSchema>;
