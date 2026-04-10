import { useAppStore } from '../store/useAppStore'
import { sb } from '../lib/supabase'
import { useState, useEffect } from 'react'

const PROJECT_GROUPS = ['Material', 'Sustainability', 'GPR', 'Mechanic', 'Other']
const DEGREES = ['MS', 'PhD', 'BS', 'Other']

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{value || '—'}</div>
    </div>
  )
}

export default function Profile() {
  const { session } = useAppStore()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const { toast } = useAppStore()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('users').select('*').eq('name', session.username).single()
    setUser(data)
    if (data) setForm({
      email: data.email || '',
      phone: data.phone || '',
      degree: data.degree || '',
      year_semester: data.year_semester || '',
      supervisor: data.supervisor || '',
      project_group: data.project_group || '',
    })
    setLoading(false)
  }

  async function save() {
    const { error } = await sb.from('users').update(form).eq('id', user.id)
    if (error) { toast('Error saving profile.'); return }
    toast('Profile updated.')
    setEditing(false)
    load()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!user) return <div className="empty-state"><div className="empty-icon">👤</div>Profile not found.</div>

  const groupColor = { Material: '#92400e', Sustainability: '#1e4d39', GPR: '#0369a1', Mechanic: '#7c4dbd', Other: '#6b6860' }
  const groupBg = { Material: '#fef3c7', Sustainability: '#e8f2ee', GPR: '#e0f2fe', Mechanic: '#f3eeff', Other: '#f0efe9' }

  return (
    <div>
      <div className="section-header">
        <div className="section-title">My Profile</div>
        {!editing && <button className="btn btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>}
      </div>

      {/* Avatar + name card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent3-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
          👤
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{user.name}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--surface2)', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
              {user.role === 'student' ? 'Student' : user.role === 'admin' ? 'Admin' : 'Staff / RE'}
            </span>
            {user.project_group && (
              <span style={{ background: groupBg[user.project_group] || '#f0efe9', color: groupColor[user.project_group] || '#6b6860', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                {user.project_group}
              </span>
            )}
          </div>
        </div>
      </div>

      {editing ? (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>Edit profile info</div>
          <div className="grid-2">
            <div className="field"><label>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@illinois.edu" /></div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(217) 555-0000" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Degree</label>
              <select value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))}>
                <option value="">— Select —</option>
                {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field"><label>Year & Semester Entered UIUC</label><input value={form.year_semester} onChange={e => setForm(f => ({ ...f, year_semester: e.target.value }))} placeholder="e.g. Fall 2024" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Supervisor</label><input value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))} placeholder="e.g. Dr. Smith" /></div>
            <div className="field"><label>Project Group</label>
              <select value={form.project_group} onChange={e => setForm(f => ({ ...f, project_group: e.target.value }))}>
                <option value="">— Select —</option>
                {PROJECT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone} />
            <InfoRow label="Degree" value={user.degree} />
            <InfoRow label="Year & Semester Entered" value={user.year_semester} />
            <InfoRow label="Supervisor" value={user.supervisor} />
            <InfoRow label="Project Group" value={user.project_group} />
          </div>
        </div>
      )}
    </div>
  )
}
