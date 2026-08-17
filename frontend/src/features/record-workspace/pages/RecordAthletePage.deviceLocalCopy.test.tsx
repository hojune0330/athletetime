import { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RecordAthletePage from './RecordAthletePage'

const fixture = vi.hoisted(() => ({
  canonicalSubjectKey: 'alpha-2016',
  requestedSubjectKey: 'alpha-2016',
  savedSubjectKeys: Array<Array<string>>(),
  sharedUrls: Array<string>(),
  workspaceSubjectKeys: ['alpha-2016'],
}))

vi.mock('../components/AffiliationHistory', () => ({ AffiliationHistory: () => null }))
vi.mock('../components/RecordCoverageReceipt', () => ({ RecordCoverageReceipt: () => null }))
vi.mock('../components/RecordIdentityHeader', () => ({ RecordIdentityHeader: () => null }))
vi.mock('../useRecordAthletePreview', () => ({
  useRecordAthletePreview: () => ({
    fetchNextPage: () => Promise.resolve(),
    isError: false,
    isFetchingNextPage: false,
    isPending: false,
    preview: {
      affiliations: [],
      coverage: { returned: 0, totalMatched: 0 },
      identity: { displayName: 'Alpha Kim', warning: 'none' },
      records: [],
      resolvedSubjectKeys: [{
        requestedSubjectKey: fixture.requestedSubjectKey,
        athleteKey: fixture.canonicalSubjectKey,
      }],
      subjects: [{ athleteKey: fixture.canonicalSubjectKey, name: 'Alpha Kim', note: '' }],
    },
    refetch: () => Promise.resolve(),
  }),
}))
vi.mock('../useRecordWorkspaceStore', () => ({
  useRecordWorkspaceStore: () => ({
    saveWorkspaceDraft: (subjectKeys: readonly string[]) => {
      fixture.savedSubjectKeys.push([...subjectKeys])
      return { ok: true, persistence: 'persistent', value: null }
    },
    workspaceDraft: { subjectKeys: fixture.workspaceSubjectKeys },
  }),
}))
vi.mock('./RecordAthleteRecordTab', () => ({ RecordAthleteRecordTab: () => null }))
vi.mock('./RecordSourceList', () => ({ RecordSourceList: () => null }))

type MiniNode = MiniElement | MiniLeaf
class MiniLeaf {
  parentNode: MiniElement | null = null
  constructor(readonly nodeType: 3 | 8, readonly data: string) {}
  get textContent() { return this.nodeType === 3 ? this.data : '' }
}
class MiniElement {
  readonly nodeType = 1
  readonly childNodes: MiniNode[] = []
  readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
  readonly style = { setProperty() {}, removeProperty() {} }
  parentNode: MiniElement | null = null
  constructor(readonly tagName: string, readonly ownerDocument: MiniDocument, readonly namespaceURI = 'http://www.w3.org/1999/xhtml') {}
  get nodeName() { return this.tagName }
  get firstChild() { return this.childNodes[0] ?? null }
  get nextSibling() {
    const index = this.parentNode?.childNodes.indexOf(this) ?? -1
    return index >= 0 ? this.parentNode?.childNodes[index + 1] ?? null : null
  }
  get textContent() { return this.childNodes.map((child) => child.textContent).join('') }
  set textContent(value: string) { this.childNodes.splice(0, this.childNodes.length); if (value) this.appendChild(new MiniLeaf(3, value)) }
  appendChild<T extends MiniNode>(child: T) { child.parentNode = this; this.childNodes.push(child); return child }
  insertBefore<T extends MiniNode>(child: T, before: MiniNode | null) {
    child.parentNode = this
    const index = before ? this.childNodes.indexOf(before) : -1
    this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, child); return child
  }
  removeChild<T extends MiniNode>(child: T) {
    const index = this.childNodes.indexOf(child)
    if (index >= 0) this.childNodes.splice(index, 1)
    child.parentNode = null; return child
  }
  setAttribute() {}
  removeAttribute() {}
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (!listener) return
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>()
    listeners.add(listener); this.listeners.set(type, listeners)
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (listener) this.listeners.get(type)?.delete(listener)
  }
  dispatchEvent(event: Event) {
    const path: MiniElement[] = [this]
    for (let node = this.parentNode; node; node = node.parentNode) path.push(node)
    Object.defineProperty(event, 'target', { configurable: true, value: this })
    Object.defineProperty(event, 'composedPath', { configurable: true, value: () => path })
    for (const node of path) {
      Object.defineProperty(event, 'currentTarget', { configurable: true, value: node })
      for (const listener of node.listeners.get(event.type) ?? []) {
        if (typeof listener === 'function') listener(event)
        else listener.handleEvent(event)
      }
      if (!event.bubbles) break
    }
    return true
  }
  focus() { this.ownerDocument.activeElement = this }
}

class MiniDocument {
  readonly nodeType = 9
  readonly documentElement: MiniElement
  readonly body: MiniElement
  activeElement: MiniElement | null = null
  constructor() { this.documentElement = new MiniElement('HTML', this); this.body = new MiniElement('BODY', this); this.documentElement.appendChild(this.body) }
  createElement(tagName: string) { return new MiniElement(tagName.toUpperCase(), this) }
  createElementNS(namespaceURI: string, tagName: string) { return new MiniElement(tagName, this, namespaceURI) }
  createTextNode(data: string) { return new MiniLeaf(3, data) }
  createComment(data: string) { return new MiniLeaf(8, data) }
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) { this.documentElement.addEventListener(type, listener) }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) { this.documentElement.removeEventListener(type, listener) }
}

function installMinimalDom() {
  const documentObject = new MiniDocument()
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: MiniElement })
  Object.defineProperty(globalThis, 'Element', { configurable: true, value: MiniElement })
  Object.defineProperty(globalThis, 'Node', { configurable: true, value: MiniElement })
  Object.defineProperty(globalThis, 'Text', { configurable: true, value: MiniLeaf })
  Object.defineProperty(globalThis, 'Comment', { configurable: true, value: MiniLeaf })
  Object.defineProperty(globalThis, 'SVGElement', { configurable: true, value: MiniElement })
  Object.defineProperty(globalThis, 'HTMLIFrameElement', { configurable: true, value: MiniElement })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentObject })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin: 'http://localhost' } })
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
  return documentObject
}

function findButton(container: MiniElement, label: string) {
  const elements: MiniElement[] = []
  const visit = (node: MiniNode) => {
    if (node instanceof MiniElement) {
      if (node.tagName === 'BUTTON' && node.textContent === label) elements.push(node)
      node.childNodes.forEach(visit)
    }
  }
  visit(container)
  const button = elements[0]
  if (!button) throw new Error(`button not found: ${label}`)
  return button
}

function LocationProbe({ control }: { readonly control: { current: string } }) {
  const location = useLocation()
  control.current = `${location.pathname}${location.search}`
  return null
}

describe('RecordAthletePage device-local copy', () => {
  it('Given one current selection When the athlete page renders Then it separates the temporary selection from saved device-local collections', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/records/athletes/alpha-2016']}>
        <Routes>
          <Route path="/records/athletes/:athleteKey" element={<RecordAthletePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(markup).toContain('이 선수 임시 선택하기')
    expect(markup).toContain('임시 선택한 선수 보기 · 1명')
    expect(markup).toContain('이 기기에 저장한 기록 모음 목록')
  })

  it('Given a valid legacy key When the athlete page is mounted and actions run Then URL, share, and draft use the canonical key', async () => {
    fixture.requestedSubjectKey = 'legacy-alpha'
    fixture.canonicalSubjectKey = 'canonical-alpha'
    fixture.workspaceSubjectKeys = []
    fixture.savedSubjectKeys.length = 0
    fixture.sharedUrls.length = 0
    const documentObject = installMinimalDom()
    Object.defineProperty(globalThis.navigator, 'share', {
      configurable: true,
      value: ({ url }: { readonly url: string }) => {
        fixture.sharedUrls.push(url)
        return Promise.resolve()
      },
    })
    const container = documentObject.createElement('div')
    documentObject.body.appendChild(container)
    const locationControl = { current: '' }
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/records/athletes/legacy-alpha?tab=sources']}>
          <LocationProbe control={locationControl} />
          <Routes>
            <Route path="/records/athletes/:athleteKey" element={<RecordAthletePage />} />
          </Routes>
        </MemoryRouter>,
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(locationControl.current).toBe('/records/athletes/canonical-alpha?tab=sources')

    await act(async () => {
      findButton(container, '공유').dispatchEvent(new Event('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(fixture.sharedUrls).toEqual(['http://localhost/records/athletes/canonical-alpha?tab=sources'])

    await act(async () => {
      findButton(container, '이 선수 임시 선택하기').dispatchEvent(new Event('click', { bubbles: true }))
    })
    expect(fixture.savedSubjectKeys).toEqual([['canonical-alpha']])

    await act(async () => root.unmount())
  })
})
