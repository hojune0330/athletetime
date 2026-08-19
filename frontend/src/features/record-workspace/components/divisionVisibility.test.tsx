import { renderToStaticMarkup } from "react-dom/server"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import type { PublicRecord } from "@/api/recordAnalytics"
import { RecordDetailSheet } from "./RecordDetailSheet"

vi.mock("@radix-ui/react-dialog", () => {
  const passthrough = ({ children }: { readonly children?: ReactNode }) => children
  const content = ({ children }: { readonly children?: ReactNode }) => <section>{children}</section>
  const close = ({ children }: { readonly children?: ReactNode }) => <button>{children}</button>
  const title = ({ children }: { readonly children?: ReactNode }) => <h2>{children}</h2>
  const description = ({ children }: { readonly children?: ReactNode }) => <p>{children}</p>
  return {
    Trigger: passthrough,
    Close: close,
    Content: content,
    Description: description,
    Overlay: () => null,
    Portal: passthrough,
    Root: passthrough,
    Title: title,
  }
})

function record(overrides: Partial<PublicRecord> = {}): PublicRecord {
  return {
    id: "division-visibility-record",
    athleteKey: "1111111111111111",
    name: "김선수",
    team: "서울고",
    season: 2026,
    competitionName: "테스트대회",
    date: "2026-07-01",
    venue: "예천스타디움",
    eventKey: "100m",
    eventLabel: "100m",
    divisionKey: "men-high",
    divisionLabel: "남자 고등부",
    gender: "men",
    divisionLevel: "high",
    divisionDetail: null,
    sourceDivisionLabel: "남자 고등부",
    phase: "결승",
    record: "10.20",
    recordValue: 10.2,
    direction: "lower",
    rank: 1,
    wind: "+1.2",
    windLegal: true,
    isComparable: true,
    note: "",
    source: {
      provider: "KAAF",
      sourceType: "public_result",
      sourceUrl: "https://example.com/result",
      capturedAt: "2026-07-02T00:00:00.000Z",
    },
    ...overrides,
  }
}

function renderDetail(current: PublicRecord) {
  return renderToStaticMarkup(
    <RecordDetailSheet
      dataRequestHref="/data-request"
      onOpenChange={() => undefined}
      open
      record={current}
    />,
  )
}

describe("record division visibility", () => {
  it("shows canonical division and raw provenance when the source lacks a sub-division", () => {
    // Given a normalized integrated/other division from an original source label.
    const markup = renderDetail(record({
      divisionKey: "men-unspecified",
      divisionLabel: "남자 (세부부문 없음)",
      divisionLevel: "unspecified",
      sourceDivisionLabel: "남자부",
    }))

    // Then the normalized label remains primary and provenance is explicitly accessible.
    expect(markup).toContain("남자 (세부부문 없음)")
    expect(markup).toContain("원문 표기")
    expect(markup).toContain("남자부")
    expect(markup).toContain("대회 결과에 세부 부문이 없어요")
  })

  it("keeps provenance neutral for a compressed alias of a specific division", () => {
    // Given a specific high-school division represented by a short source alias.
    const markup = renderDetail(record({
      divisionKey: "men-high",
      divisionLabel: "남자 고등부",
      divisionLevel: "high",
      divisionDetail: null,
      sourceDivisionLabel: "남고",
    }))

    // Then provenance stays available without claiming that the event omitted sub-divisions.
    expect(markup).toContain("남자 고등부")
    expect(markup).toContain("원문 표기")
    expect(markup).toContain("남고")
    expect(markup).not.toContain("대회 결과에 세부 부문이 없어요")
  })

  it("keeps grade aliases neutral instead of claiming a missing sub-division", () => {
    // Given a grade-level source alias mapped to a normalized middle-school division.
    const markup = renderDetail(record({
      divisionKey: "unknown-middle",
      divisionLabel: "중학부 (남녀 통합)",
      divisionLevel: "middle",
      divisionDetail: "2학년부",
      sourceDivisionLabel: "중2",
    }))

    // Then the canonical division and source context remain observable without a false explanation.
    expect(markup).toContain("중학부 (남녀 통합)")
    expect(markup).toContain("원문 표기")
    expect(markup).toContain("중2")
    expect(markup).not.toContain("대회 결과에 세부 부문이 없어요")
  })

  it("does not add a raw-label note when the source and normalized labels are equivalent", () => {
    // Given an ordinary division whose source differs only by spacing.
    const markup = renderDetail(record({ sourceDivisionLabel: "남자고등부" }))

    // Then the canonical division remains visible without a misleading provenance warning.
    expect(markup).toContain("남자 고등부")
    expect(markup).not.toContain("원문 표기")
    expect(markup).not.toContain("대회 결과에 세부 부문이 없어요")
  })

  it("does not render an empty raw-label note", () => {
    // Given a record with no raw source division.
    const markup = renderDetail(record({ sourceDivisionLabel: null }))

    // Then the detail stays concise and does not expose an empty provenance field.
    expect(markup).not.toContain("원문 표기")
  })
})
