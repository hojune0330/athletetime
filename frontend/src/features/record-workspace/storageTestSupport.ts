import type { StorageLike } from './storageBoundary'

export class TestStorage implements StorageLike {
  readonly values = new Map<string, string>()
  readonly failWritesFor = new Set<string>()
  failReads = false
  failRemovals = false

  constructor(initial: Readonly<Record<string, string>> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.values.set(key, value)
    }
  }

  getItem(key: string): string | null {
    if (this.failReads) throw new Error('storage read blocked')
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.failWritesFor.has(key)) throw new Error('storage write blocked')
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    if (this.failRemovals) throw new Error('storage removal blocked')
    this.values.delete(key)
  }
}
