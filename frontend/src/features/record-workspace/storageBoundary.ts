import type { z } from 'zod'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type StorageMode = 'persistent' | 'volatile'

export type StorageStatus = {
  readonly mode: StorageMode
  readonly reason: 'blocked' | 'corrupt' | 'oversized' | null
}

export class StorageBoundary {
  readonly #memory = new Map<string, string>()
  readonly #volatileKeys = new Set<string>()
  #status: StorageStatus = { mode: 'persistent', reason: null }

  getStatus(): StorageStatus {
    return this.#status
  }

  read<T>(area: StorageLike, key: string, schema: z.ZodType<T>, maximumBytes: number): T | null {
    const raw = this.#readRaw(area, key)
    if (raw === null) return null
    if (this.#byteLength(raw) > maximumBytes) {
      this.#degrade(key, 'oversized')
      return null
    }
    try {
      const parsed = schema.safeParse(JSON.parse(raw))
      if (parsed.success) return parsed.data
    } catch {
      this.#degrade(key, 'corrupt')
      return null
    }
    this.#degrade(key, 'corrupt')
    return null
  }

  write(area: StorageLike, key: string, raw: string, maximumBytes: number): StorageMode {
    this.#memory.set(key, raw)
    if (this.#byteLength(raw) > maximumBytes) {
      this.#degrade(key, 'oversized')
      return 'volatile'
    }
    try {
      area.setItem(key, raw)
      this.#volatileKeys.delete(key)
      return 'persistent'
    } catch {
      this.#degrade(key, 'blocked')
      return 'volatile'
    }
  }

  remove(area: StorageLike, key: string): StorageMode {
    this.#memory.delete(key)
    try {
      area.removeItem(key)
      this.#volatileKeys.delete(key)
      return 'persistent'
    } catch {
      this.#degrade(key, 'blocked')
      return 'volatile'
    }
  }

  #readRaw(area: StorageLike, key: string): string | null {
    if (this.#volatileKeys.has(key)) return this.#memory.get(key) ?? null
    try {
      return area.getItem(key)
    } catch {
      this.#degrade(key, 'blocked')
      return this.#memory.get(key) ?? null
    }
  }

  #degrade(key: string, reason: Exclude<StorageStatus['reason'], null>): void {
    this.#volatileKeys.add(key)
    this.#status = { mode: 'volatile', reason }
  }

  #byteLength(raw: string): number {
    return new TextEncoder().encode(raw).byteLength
  }
}
