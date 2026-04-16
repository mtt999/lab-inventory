import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

function canEdit(s) { return s?.role === 'admin' || s?.role === 'user' }

function getModules(role) {
  const all = [
    { key: 'supply',      screen: 'home',        label: 'Supply Inventory',   sub: 'Weekly inspection & export',    icon: '📦', bg: '#e8f2ee', color: '#2a6049' },
    { key: 'projects',    screen: 'projects',    label: 'Project Inventory',  sub: 'Materials, storage & database', icon: '🧪', bg: '#f3eeff', color: '#7c4dbd' },
    { key: 'training',    screen: 'training',    label: 'Training Records',   sub: 'Certs, equipment & alarm',      icon: '🎓', bg: '#e0f2fe', color: '#0369a1' },
    { key: 'equipment',   screen: 'equipment',   label: 'Equipment Inventory',sub: 'Lab equipment tracking',        icon: '🔧', bg: '#fef3c7', color: '#92400e' },
    { key: 'equipmenthub',screen: 'equipmenthub',label: 'Equipment',          sub: 'Info, SOP & standards',         icon: '📚', bg: '#e8f2ee', color: '#1e4d39' },
    { key: 'booking',     screen: 'booking',     label: 'Booking Equipment',  sub: 'Reserve lab equipment',         icon: '📅', bg: '#e0f2fe', color: '#0369a1' },
    { key: 'mileage',     screen: null,          label: 'Mileage Form',       sub: 'Submit mileage reimbursement',  icon: '🚗', bg: '#fdf0ed', color: '#c84b2f', external: true },
    { key: 'labsafety',   screen: null,          label: 'Lab Safety',         sub: 'Safety training & certification', icon: '🦺', bg: '#fef3c7', color: '#92400e', external: true, urlKey: 'labsafety_url' },
    { key: 'remessages',  screen: 'remessages',  label: 'Research Engineers', sub: 'Notes, ideas & issue reports',  icon: '💬', bg: '#e8f2ee', color: '#2a6049' },
    { key: 'profile',     screen: 'profile',     label: 'Profile',            sub: 'Your info & settings',          icon: '👤', bg: '#f3eeff', color: '#7c4dbd' },
  ]
  if (role === 'admin') return all.filter(m => !m.external)
  if (role === 'student') return all.filter(m => ['projects','training','profile','equipmenthub','booking','mileage','labsafety','remessages'].includes(m.key))
  return all
}

// ── External link confirmation modal ─────────────────────────
function ExternalLinkModal({ url, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 380, width: '100%', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🔗</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, textAlign: 'center' }}>Leaving InteleLab</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8, textAlign: 'center' }}>
          You are being redirected to an external website:
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 14px', marginBottom: 20, fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)', wordBreak: 'break-all', textAlign: 'center' }}>
          {url}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onConfirm}>Continue →</button>
        </div>
      </div>
    </div>
  )
}

// ── Card Grid View ────────────────────────────────────────────
function CardGridView({ modules, onNavigate, mileageUrl, labSafetyUrl, isAdmin, onEditUrl }) {
  const [confirmExternal, setConfirmExternal] = useState(null) // { url, label }
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {modules.map(m => (
          <div key={m.key}
            onClick={() => m.external ? setConfirmExternal({ url: m.key === 'mileage' ? mileageUrl : labSafetyUrl, label: m.label }) : onNavigate(m.screen)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            {m.external && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, color: 'var(--text3)' }}>↗</div>}
            <div style={{ width: 44, height: 44, borderRadius: 12, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 22 }}>{m.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{m.sub}</div>
          </div>
        ))}
        {/* Admin-only: external link management cards */}
        {isAdmin && [
          { key: 'mileage', icon: '🚗', label: 'Mileage Form', bg: '#fdf0ed', color: '#c84b2f' },
          { key: 'labsafety', icon: '🦺', label: 'Lab Safety', bg: '#fef3c7', color: '#92400e' },
        ].map(card => (
          <div key={card.key} onClick={() => onEditUrl(card.key)}
            style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 22 }}>{card.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>Manage external link</div>
            <div style={{ marginTop: 8, fontSize: 11, color: card.color, fontWeight: 500 }}>⚙ Edit URL</div>
          </div>
        ))}
      </div>
      {confirmExternal && (
        <ExternalLinkModal
          url={confirmExternal.url}
          onConfirm={() => { window.open(confirmExternal.url, '_blank'); setConfirmExternal(null) }}
          onCancel={() => setConfirmExternal(null)}
        />
      )}
    </>
  )
}

// ── Dashboard View ────────────────────────────────────────────
function DashboardView({ modules, onNavigate, session, mileageUrl, labSafetyUrl, isAdmin, onEditUrl }) {
  const [stats, setStats] = useState({ lowSupplies: 0, activeProjects: 0, students: 0, pendingTraining: 0 })
  const [recentInspections, setRecentInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmExternal, setConfirmExternal] = useState(null)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    try {
      const [supplies, projects, students, inspections, training] = await Promise.all([
        sb.from('supplies').select('id, min_qty'),
        sb.from('projects').select('id, status').eq('status', 'active'),
        sb.from('users').select('id').eq('role', 'student').eq('is_active', true),
        sb.from('inspections').select('id, room_name, inspected_at, flag_count, inspector').order('inspected_at', { ascending: false }).limit(5),
        sb.from('training_fresh').select('id').eq('admin_approved', false),
      ])
      setStats({
        lowSupplies: (supplies.data || []).length,
        activeProjects: (projects.data || []).length,
        students: (students.data || []).length,
        pendingTraining: (training.data || []).length,
      })
      setRecentInspections(inspections.data || [])
    } catch(e) {}
    setLoading(false)
  }

  const statCards = [
    { label: 'Active projects',       value: stats.activeProjects,  color: '#7c4dbd', bg: '#f3eeff', screen: 'projects' },
    { label: 'Active students',        value: stats.students,        color: '#0369a1', bg: '#e0f2fe', screen: 'training' },
    { label: 'Pending cert approvals', value: stats.pendingTraining, color: '#c84b2f', bg: '#fdf0ed', screen: 'training' },
    { label: 'Supply items tracked',   value: stats.lowSupplies,     color: '#2a6049', bg: '#e8f2ee', screen: 'home'     },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            {statCards.map(s => (
              <div key={s.label} onClick={() => onNavigate(s.screen)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ fontSize: 28, fontWeight: 600, color: s.color, marginBottom: 4 }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Recent inspections</div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : recentInspections.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>No inspections yet.</div>
            ) : recentInspections.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--surface2)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{r.room_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{new Date(r.inspected_at).toLocaleDateString()} · {r.inspector}</div>
                </div>
                {r.flag_count > 0
                  ? <span style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 500 }}>{r.flag_count} low</span>
                  : <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>All OK</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Quick access</div>
          {modules.map(m => (
            <div key={m.key}
              onClick={() => m.external ? setConfirmExternal({ url: m.key === 'mileage' ? mileageUrl : labSafetyUrl, label: m.label }) : onNavigate(m.screen)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s', position: 'relative' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.background = m.bg }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.sub}</div>
              </div>
              {m.external && <span style={{ fontSize: 11, color: 'var(--text3)' }}>↗</span>}
            </div>
          ))}
        </div>
      </div>

      {confirmExternal && (
        <ExternalLinkModal
          url={confirmExternal.url}
          onConfirm={() => { window.open(confirmExternal.url, '_blank'); setConfirmExternal(null) }}
          onCancel={() => setConfirmExternal(null)}
        />
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { session, setScreen } = useAppStore()
  const [view, setView] = useState(() => localStorage.getItem('labstock_view') || 'grid')
  const [mileageUrl, setMileageUrl] = useState('https://bw4qh7p8sn.us-east-1.awsapprunner.com/')
  const [labSafetyUrl, setLabSafetyUrl] = useState('https://canvas.illinois.edu/')
  const [editingUrl, setEditingUrl] = useState(null) // 'mileage' | 'labsafety'
  const [urlInput, setUrlInput] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const modules = getModules(session?.role)
  const isAdmin = session?.role === 'admin'

  useEffect(() => { loadMileageUrl() }, [])

  async function loadMileageUrl() {
    const [{ data: m }, { data: s }] = await Promise.all([
      sb.from('settings').select('value').eq('key', 'mileage_url').maybeSingle(),
      sb.from('settings').select('value').eq('key', 'labsafety_url').maybeSingle(),
    ])
    if (m?.value) setMileageUrl(m.value)
    if (s?.value) setLabSafetyUrl(s.value)
  }

  async function saveUrl() {
    if (!urlInput.trim()) return
    setSavingUrl(true)
    const key = editingUrl === 'mileage' ? 'mileage_url' : 'labsafety_url'
    await sb.from('settings').upsert({ key, value: urlInput.trim() })
    if (editingUrl === 'mileage') setMileageUrl(urlInput.trim())
    else setLabSafetyUrl(urlInput.trim())
    setEditingUrl(null)
    setSavingUrl(false)
  }

  function switchView(v) { setView(v); localStorage.setItem('labstock_view', v) }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const now = new Date()
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px', marginBottom: 4 }}>
            {greeting()}, {session?.username}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{dateStr} · ICT Lab</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 3, gap: 2 }}>
            <button onClick={() => switchView('grid')}
              style={{ padding: '6px 14px', border: 'none', borderRadius: 8, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: view === 'grid' ? 'var(--surface)' : 'transparent', color: view === 'grid' ? 'var(--text)' : 'var(--text2)', transition: 'all 0.15s' }}>
              ⊞ Cards
            </button>
            <button onClick={() => switchView('dashboard')}
              style={{ padding: '6px 14px', border: 'none', borderRadius: 8, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: view === 'dashboard' ? 'var(--surface)' : 'transparent', color: view === 'dashboard' ? 'var(--text)' : 'var(--text2)', transition: 'all 0.15s' }}>
              ☰ Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* View */}
      {view === 'grid'
        ? <CardGridView modules={modules} onNavigate={s => setScreen(s)} mileageUrl={mileageUrl} labSafetyUrl={labSafetyUrl} isAdmin={isAdmin} onEditUrl={(type) => { setEditingUrl(type); setUrlInput(type === 'mileage' ? mileageUrl : labSafetyUrl) }} />
        : <DashboardView modules={modules} onNavigate={s => setScreen(s)} session={session} mileageUrl={mileageUrl} labSafetyUrl={labSafetyUrl} isAdmin={isAdmin} onEditUrl={(type) => { setEditingUrl(type); setUrlInput(type === 'mileage' ? mileageUrl : labSafetyUrl) }} />
      }

      {/* Mileage URL edit modal */}
      {editingUrl !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 480, width: '100%', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{editingUrl === 'mileage' ? '🚗 Mileage Form URL' : '🦺 Lab Safety URL'}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Update the external link for the {editingUrl === 'mileage' ? 'Mileage Form' : 'Lab Safety'} icon on the dashboard.</div>
            <div className="field">
              <label>Website URL</label>
              <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://..." onKeyDown={e => e.key === 'Enter' && saveMileageUrl()} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={saveUrl} disabled={savingUrl || !urlInput.trim()}>
                {savingUrl ? 'Saving…' : 'Save URL'}
              </button>
              <button className="btn" onClick={() => setEditingUrl(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
