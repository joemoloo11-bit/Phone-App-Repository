// Drop-in replacement for window.api that the Electron preload exposes on PC.
// Each method has the same shape as Vault's SQLite-backed IPC handlers.
// Backed by a JSON store in localStorage for now; Google Drive sync is layered
// on top of the same store in a later step.

import { load, persist, nextId } from './store'

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

const api = {
  window: {
    minimize: () => Promise.resolve(),
    maximize: () => Promise.resolve(),
    close: () => Promise.resolve(),
  },

  // ─── Accounts ─────────────────────────────────────────────────────────────
  accounts: {
    getAll: async () => {
      const s = load()
      return [...s.accounts].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          String(a.name).localeCompare(String(b.name)),
      )
    },
    save: async (data: any) => {
      const s = load()
      const id = nextId(s, 'accounts')
      const row = {
        id,
        name: data.name,
        color: data.color,
        weekly_target: data.weekly_target,
        buffer_percent: data.buffer_percent,
        sort_order: data.sort_order ?? 0,
        type: data.type ?? 'envelope',
        buffer_target: data.buffer_target ?? null,
        sweep_amount: data.sweep_amount ?? null,
        sweep_to_account_id: data.sweep_to_account_id ?? null,
        created_at: nowIso(),
      }
      s.accounts.push(row)
      persist(s)
      return row
    },
    update: async (id: number, data: any) => {
      const s = load()
      const i = s.accounts.findIndex((a) => a.id === id)
      if (i < 0) return null
      s.accounts[i] = { ...s.accounts[i], ...data }
      persist(s)
      return s.accounts[i]
    },
    delete: async (id: number) => {
      const s = load()
      s.accounts = s.accounts.filter((a) => a.id !== id)
      // Cascade-ish: clear references on dependent tables
      s.balance_logs = s.balance_logs.filter((b) => b.account_id !== id)
      s.weekly_allocations = s.weekly_allocations.filter((w) => w.account_id !== id)
      s.expenses.forEach((e) => {
        if (e.account_id === id) e.account_id = null
        if (e.save_account_id === id) e.save_account_id = null
        if (e.debit_account_id === id) e.debit_account_id = null
      })
      persist(s)
    },
  },

  // ─── Income Sources ───────────────────────────────────────────────────────
  income: {
    getAll: async () => {
      const s = load()
      return [...s.income_sources].sort((a, b) =>
        String(a.person_name).localeCompare(String(b.person_name)),
      )
    },
    save: async (data: any) => {
      const s = load()
      const id = nextId(s, 'income_sources')
      const row = {
        id,
        person_name: data.person_name,
        amount: data.amount,
        frequency: data.frequency,
        payday_reference: data.payday_reference ?? null,
        created_at: nowIso(),
      }
      s.income_sources.push(row)
      persist(s)
      return row
    },
    update: async (id: number, data: any) => {
      const s = load()
      const i = s.income_sources.findIndex((x) => x.id === id)
      if (i < 0) return null
      s.income_sources[i] = { ...s.income_sources[i], ...data }
      persist(s)
      return s.income_sources[i]
    },
    delete: async (id: number) => {
      const s = load()
      s.income_sources = s.income_sources.filter((x) => x.id !== id)
      persist(s)
    },
  },

  // ─── Expenses ─────────────────────────────────────────────────────────────
  expenses: {
    getAll: async () => {
      const s = load()
      return [...s.expenses]
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .map((e) => {
          const sa = s.accounts.find((x) => x.id === e.save_account_id)
          const da = s.accounts.find((x) => x.id === e.debit_account_id)
          const a = s.accounts.find((x) => x.id === e.account_id)
          return {
            ...e,
            save_account_name: sa?.name,
            save_account_color: sa?.color,
            debit_account_name: da?.name,
            debit_account_color: da?.color,
            account_name: sa?.name ?? a?.name,
            account_color: sa?.color ?? a?.color,
          }
        })
    },
    save: async (data: any) => {
      const s = load()
      const id = nextId(s, 'expenses')
      const saveId = data.save_account_id ?? data.account_id ?? null
      const row = {
        id,
        name: data.name,
        amount: data.amount,
        allocation_amount: data.allocation_amount ?? null,
        weekly_extra: data.weekly_extra ?? null,
        frequency: data.frequency,
        due_day: data.due_day ?? null,
        account_id: saveId,
        save_account_id: saveId,
        debit_account_id: data.debit_account_id ?? null,
        category: data.category,
        created_at: nowIso(),
      }
      s.expenses.push(row)
      persist(s)
      return row
    },
    update: async (id: number, data: any) => {
      const s = load()
      const i = s.expenses.findIndex((x) => x.id === id)
      if (i < 0) return null
      const merged: any = { ...s.expenses[i] }
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) merged[k] = v
      }
      s.expenses[i] = merged
      persist(s)
      return merged
    },
    delete: async (id: number) => {
      const s = load()
      s.expenses = s.expenses.filter((x) => x.id !== id)
      persist(s)
    },
  },

  // ─── Balance Logs ─────────────────────────────────────────────────────────
  balances: {
    getAll: async (accountId?: number) => {
      const s = load()
      let rows = [...s.balance_logs]
      if (accountId) rows = rows.filter((x) => x.account_id === accountId)
      rows.sort((a, b) => String(b.logged_at).localeCompare(String(a.logged_at)))
      if (accountId) return rows
      return rows.map((r) => {
        const a = s.accounts.find((x) => x.id === r.account_id)
        return { ...r, account_name: a?.name, account_color: a?.color }
      })
    },
    getLatest: async () => {
      const s = load()
      const sorted = [...s.balance_logs].sort((a, b) =>
        String(b.logged_at).localeCompare(String(a.logged_at)),
      )
      const latestByAccount = new Map<number, any>()
      for (const r of sorted) {
        if (!latestByAccount.has(r.account_id)) latestByAccount.set(r.account_id, r)
      }
      const out: any[] = []
      for (const a of s.accounts) {
        const log = latestByAccount.get(a.id)
        if (!log) continue
        out.push({
          ...log,
          account_name: a.name,
          account_color: a.color,
          weekly_target: a.weekly_target,
          buffer_percent: a.buffer_percent,
        })
      }
      return out.sort((x, y) => {
        const ax = s.accounts.find((a) => a.id === x.account_id)
        const ay = s.accounts.find((a) => a.id === y.account_id)
        return (
          (ax?.sort_order ?? 0) - (ay?.sort_order ?? 0) ||
          String(ax?.name ?? '').localeCompare(String(ay?.name ?? ''))
        )
      })
    },
    save: async (data: any) => {
      const s = load()
      const id = nextId(s, 'balance_logs')
      const row = {
        id,
        account_id: data.account_id,
        balance: data.balance,
        notes: data.notes ?? null,
        logged_at: nowIso(),
      }
      s.balance_logs.push(row)
      persist(s)
      return row
    },
  },

  // ─── Weekly Allocations ───────────────────────────────────────────────────
  allocations: {
    getWeek: async (weekStart: string) => {
      const s = load()
      const rows = s.weekly_allocations.filter((a) => a.week_start === weekStart)
      return rows
        .map((r) => {
          const a = s.accounts.find((x) => x.id === r.account_id)
          return {
            ...r,
            account_name: a?.name,
            account_color: a?.color,
            _sort_order: a?.sort_order ?? 0,
          }
        })
        .sort(
          (x: any, y: any) =>
            x._sort_order - y._sort_order ||
            String(x.account_name ?? '').localeCompare(String(y.account_name ?? '')),
        )
        .map(({ _sort_order, ...rest }: any) => rest)
    },
    upsert: async (data: any) => {
      const s = load()
      const i = s.weekly_allocations.findIndex(
        (a) => a.week_start === data.week_start && a.account_id === data.account_id,
      )
      if (i >= 0) {
        s.weekly_allocations[i] = {
          ...s.weekly_allocations[i],
          planned_amount: data.planned_amount,
          buffer_amount: data.buffer_amount,
          actual_amount:
            data.actual_amount !== undefined && data.actual_amount !== null
              ? data.actual_amount
              : s.weekly_allocations[i].actual_amount,
        }
        persist(s)
        return s.weekly_allocations[i]
      }
      const id = nextId(s, 'weekly_allocations')
      const row = {
        id,
        week_start: data.week_start,
        account_id: data.account_id,
        planned_amount: data.planned_amount,
        actual_amount: data.actual_amount ?? null,
        buffer_amount: data.buffer_amount,
        funded: 0,
      }
      s.weekly_allocations.push(row)
      persist(s)
      return row
    },
    setFunded: async (id: number, funded: boolean) => {
      const s = load()
      const i = s.weekly_allocations.findIndex((x) => x.id === id)
      if (i < 0) return
      s.weekly_allocations[i] = { ...s.weekly_allocations[i], funded: funded ? 1 : 0 }
      persist(s)
    },
  },

  // ─── Goals ────────────────────────────────────────────────────────────────
  goals: {
    getAll: async () => {
      const s = load()
      return [...s.goals].sort(
        (a, b) =>
          String(a.status).localeCompare(String(b.status)) ||
          String(a.deadline ?? '').localeCompare(String(b.deadline ?? '')),
      )
    },
    save: async (data: any) => {
      const s = load()
      const id = nextId(s, 'goals')
      const row = {
        id,
        name: data.name,
        target_amount: data.target_amount,
        saved_amount: 0,
        deadline: data.deadline ?? null,
        priority: data.priority,
        status: 'active',
        weekly_contribution: data.weekly_contribution ?? 0,
        approach: data.approach ?? null,
        created_at: nowIso(),
      }
      s.goals.push(row)
      persist(s)
      return row
    },
    update: async (id: number, data: any) => {
      const s = load()
      const i = s.goals.findIndex((g) => g.id === id)
      if (i < 0) return null
      s.goals[i] = { ...s.goals[i], ...data }
      persist(s)
      return s.goals[i]
    },
    delete: async (id: number) => {
      const s = load()
      s.goals = s.goals.filter((g) => g.id !== id)
      s.goal_snapshots = s.goal_snapshots.filter((gs) => gs.goal_id !== id)
      persist(s)
    },
    saveSnapshot: async (data: any) => {
      const s = load()
      const id = nextId(s, 'goal_snapshots')
      s.goal_snapshots.push({
        id,
        goal_id: data.goal_id,
        saved_amount: data.saved_amount,
        snapshot_date: todayDate(),
      })
      persist(s)
    },
    getSnapshots: async (goalId: number) => {
      const s = load()
      return s.goal_snapshots
        .filter((g) => g.goal_id === goalId)
        .sort((a, b) =>
          String(a.snapshot_date).localeCompare(String(b.snapshot_date)),
        )
    },
  },

  // ─── Test Runs ────────────────────────────────────────────────────────────
  tests: {
    getAll: async () => {
      const s = load()
      return [...s.test_runs].sort((a, b) =>
        String(b.run_date).localeCompare(String(a.run_date)),
      )
    },
    save: async (data: any) => {
      const s = load()
      const id = nextId(s, 'test_runs')
      const row = {
        id,
        version: data.version,
        results: data.results,
        notes: data.notes ?? null,
        run_date: nowIso(),
      }
      s.test_runs.push(row)
      persist(s)
      return row
    },
    update: async (id: number, data: any) => {
      const s = load()
      const i = s.test_runs.findIndex((t) => t.id === id)
      if (i < 0) return null
      s.test_runs[i] = {
        ...s.test_runs[i],
        results: data.results,
        notes: data.notes ?? null,
      }
      persist(s)
      return s.test_runs[i]
    },
    delete: async (id: number) => {
      const s = load()
      s.test_runs = s.test_runs.filter((t) => t.id !== id)
      persist(s)
    },
  },

  // ─── Updates / Debug (no-ops on phone) ────────────────────────────────────
  updates: {
    check: async () => null,
    install: async () => null,
  },

  debug: {
    getInfo: async () => ({
      app_version: 'phone-pwa',
      platform: 'web',
      db_path: 'localStorage',
      timestamp: nowIso(),
    }),
    getTableCounts: async () => {
      const s = load()
      return {
        accounts: s.accounts.length,
        income_sources: s.income_sources.length,
        expenses: s.expenses.length,
        balance_logs: s.balance_logs.length,
        weekly_allocations: s.weekly_allocations.length,
        goals: s.goals.length,
        goal_snapshots: s.goal_snapshots.length,
        test_runs: s.test_runs.length,
      }
    },
    getTableRows: async (table: string) => {
      const s = load() as any
      return s[table] ?? []
    },
    saveLog: async (text: string) => {
      console.log('[debug log]', text)
    },
  },
}

export function installApi(): void {
  ;(window as any).api = api
  ;(window as any).electron = { process: { versions: {} } }
}

export type Api = typeof api
