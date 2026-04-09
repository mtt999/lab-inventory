import { create } from 'zustand'
import { sb } from '../lib/supabase'

export const useAppStore = create((set, get) => ({
  // ── Auth ──
  session: null,       // { role, username }
  setSession: (s) => set({ session: s }),
  clearSession: () => set({ session: null }),

  // ── Cache ──
  rooms: [],
  supplies: [],
  settings: {},

  refreshCache: async () => {
    const [r, s, cfg] = await Promise.all([
      sb.from('rooms').select('*').order('created_at'),
      sb.from('supplies').select('*').order('created_at'),
      sb.from('settings').select('*'),
    ])
    const settings = {}
    ;(cfg.data || []).forEach((x) => (settings[x.key] = x.value))
    set({ rooms: r.data || [], supplies: s.data || [], settings })
  },

  // ── Toast ──
  toastMsg: '',
  toastVisible: false,
  toast: (msg) => {
    set({ toastMsg: msg, toastVisible: true })
    setTimeout(() => set({ toastVisible: false }), 2500)
  },

  // ── Navigation ──
  screen: 'home',           // current top-level screen
  setScreen: (s) => set({ screen: s }),

  // ── Inspection state ──
  inspection: null,
  setInspection: (i) => set({ inspection: i }),

  // ── Last completed inspection record ──
  lastRecord: null,
  setLastRecord: (r) => set({ lastRecord: r }),

  // ── Current project ──
  currentProjectId: null,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
}))
