// Phone-side data store. Mirrors Vault's SQLite tables as plain JSON in
// localStorage. Google Drive sync (next phase) reads/writes this same shape.

const STORAGE_KEY = 'vault-data-v1'

export interface DataStore {
  accounts: Record<string, any>[]
  income_sources: Record<string, any>[]
  expenses: Record<string, any>[]
  balance_logs: Record<string, any>[]
  weekly_allocations: Record<string, any>[]
  goals: Record<string, any>[]
  goal_snapshots: Record<string, any>[]
  test_runs: Record<string, any>[]
  next_id: Record<string, number>
}

const DEFAULT_STORE = (): DataStore => ({
  accounts: [],
  income_sources: [],
  expenses: [],
  balance_logs: [],
  weekly_allocations: [],
  goals: [],
  goal_snapshots: [],
  test_runs: [],
  next_id: {},
})

let cache: DataStore | null = null

export function load(): DataStore {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cache = DEFAULT_STORE()
      return cache
    }
    const parsed = JSON.parse(raw)
    cache = { ...DEFAULT_STORE(), ...parsed }
    return cache
  } catch (e) {
    console.error('[store] load failed, resetting', e)
    cache = DEFAULT_STORE()
    return cache
  }
}

export function persist(s: DataStore): void {
  cache = s
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch (e) {
    console.error('[store] persist failed', e)
  }
}

export function nextId(s: DataStore, table: string): number {
  const n = (s.next_id[table] ?? 0) + 1
  s.next_id[table] = n
  return n
}

export function exportJson(): string {
  return JSON.stringify(load(), null, 2)
}

export function importJson(json: string): void {
  const parsed = JSON.parse(json)
  persist({ ...DEFAULT_STORE(), ...parsed })
}

export function reset(): void {
  cache = DEFAULT_STORE()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
