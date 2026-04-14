import { useAppStore } from '../store/useAppStore'
import { sb } from '../lib/supabase'
import { useState, useEffect, useRef } from 'react'

const PROJECT_GROUPS = ['Material', 'Sustainability', 'GPR', 'Mechanic', 'Other']
const DEGREES = ['MS', 'PhD', 'BS', 'Other']
const SEMESTERS = ['Fall', 'Spring', 'Summer']
const YEARS = Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() - i))

const AVATARS = ['🧪', '🔬', '📐', '🏗️', '⚗️', '🧬', '🔭', '📊', '🛠️', '🧱', '💡', '🎓']

const groupColor = { Material: '#92400e', Sustainability: '#1e4d39', GPR: '#0369a1', Mechanic: '#7c4dbd', Other: '#6b6860' }
const groupBg   = { Material: '#fef3c7', Sustainability: '#e8f2ee', GPR: '#e0f2fe', Mechanic: '#f3eeff', Other: '#f0efe9' }

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>{value || '—'}</div>
    </div>
  )
}

function AvatarPicker({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
      {AVATARS.map(a => (
        <button key={a} type="button" onClick={() => onSelect(a)}
          style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${a === selected ? 'var(--accent)' : 'var(--border)'}`, background: a === selected ? 'var(--accent-light)' : 'var(--surface2)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {a}
        </button>
      ))}
    </div>
  )
}

export default function Profile() {
  const { session, setSession, toast } = useAppStore()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [form, setForm] = useState({})
  const [pinForm, setPinForm] = useState({ current: '', newPin: '', confirm: '' })
  const [pinError, setPinError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('users').select('*').eq('id', session.userId).single()
    if (!data) {
      // fallback by name
      const { data: d2 } = await sb.from('users').select('*').eq('name', session.username).single()
      setUser(d2)
      if (d2) initForm(d2)
    } else {
      setUser(data)
      initForm(data)
    }
    setLoading(false)
  }

  function initForm(d) {
    setForm({
      name: d.name || '',
      last_name: d.last_name || '',
      email: d.email || '',
      phone: d.phone || '',
      degree: d.degree || '',
      year_semester: d.year_semester || '',
      supervisor: d.supervisor || '',
      project_group: d.project_group || '',
      avatar: d.avatar || '',
      photo_url: d.photo_url || '',
    })
  }

  async function saveInfo() {
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email || null,
      phone: form.phone || null,
      degree: form.degree || null,
      year_semester: form.year_semester || null,
      supervisor: form.supervisor || null,
      project_group: form.project_group || null,
      avatar: form.avatar || null,
      photo_url: form.photo_url || null,
    }
    const { error } = await sb.from('users').update(payload).eq('id', user.id)
    if (error) { toast('Error saving profile.'); setSaving(false); return }
    // Update session username if name changed
    if (form.name.trim() !== session.username) {
      setSession({ ...session, username: form.name.trim() })
    }
    toast('Profile saved ✓')
    setSaving(false)
    load()
  }

  async function savePin() {
    setPinError('')
    if (!pinForm.current) { setPinError('Enter your current PIN.'); return }
    if (!/^\d{4}$/.test(pinForm.newPin)) { setPinError('New PIN must be exactly 4 digits.'); return }
    if (pinForm.newPin !== pinForm.confirm) { setPinError('PINs do not match.'); return }
    // Verify current PIN
    const { data } = await sb.from('users').select('pin').eq('id', user.id).single()
    if (data?.pin !== pinForm.current) { setPinError('Current PIN is incorrect.'); return }
    const { error } = await sb.from('users').update({ pin: pinForm.newPin }).eq('id', user.id)
    if (error) { setPinError('Error updating PIN.'); return }
    toast('PIN updated ✓')
    setPinForm({ current: '', newPin: '', confirm: '' })
  }

  async function uploadPhoto(file) {
    if (!file?.type.startsWith('image/')) { toast('Please select an image.'); return }
    setUploading(true)
    try {
      // Compress
      const compressed = await new Promise(resolve => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          const maxPx = 400
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
          URL.revokeObjectURL(url)
          canvas.toBlob(resolve, 'image/jpeg', 0.85)
        }
        img.src = url
      })
      const path = `avatars/${user.id}_${Date.now()}.jpg`
      const { error } = await sb.storage.from('project-files').upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data: urlData } = sb.storage.from('project-files').getPublicUrl(path)
      setForm(f => ({ ...f, photo_url: urlData.publicUrl, avatar: '' }))
      toast('Photo uploaded ✓')
    } catch (e) { toast('Upload failed.') }
    setUploading(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!user) return <div className="empty-state"><div className="empty-icon">👤</div>Profile not found.</div>

  const displayName = [user.name, user.last_name].filter(Boolean).join(' ')
  const avatarContent = user.photo_url
    ? <img src={user.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
    : user.avatar ? <span style={{ fontSize: 36 }}>{user.avatar}</span>
    : <span style={{ fontSize: 32, color: 'var(--text3)' }}>👤</span>

  const tabs = [
    { key: 'info', label: '👤 Info' },
    { key: 'avatar', label: '🖼️ Photo' },
    { key: 'pin', label: '🔑 PIN' },
  ]

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="section-title" style={{ marginBottom: 20 }}>My Profile</div>

      {/* Profile header card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface2)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {avatarContent}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)' }}>{displayName || user.name}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--surface2)', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
              {user.role === 'student' ? 'Student' : user.role === 'admin' ? 'Admin' : 'Staff / RE'}
            </span>
            {user.project_group && (
              <span style={{ background: groupBg[user.project_group] || '#f0efe9', color: groupColor[user.project_group] || '#6b6860', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                {user.project_group}
              </span>
            )}
            {user.degree && (
              <span style={{ background: 'var(--surface2)', borderRadius: 99, padding: '3px 12px', fontSize: 12, color: 'var(--text2)' }}>{user.degree}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: activeTab === t.key ? 'var(--accent)' : 'var(--text2)', borderBottom: `2px solid ${activeTab === t.key ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── INFO TAB ── */}
      {activeTab === 'info' && (
        <div className="card">
          <div className="grid-2">
            <div className="field"><label>First Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First name" /></div>
            <div className="field"><label>Last Name</label><input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="netid@illinois.edu" /></div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(217) 555-0000" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Degree</label>
              <select value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))}>
                <option value="">— Select —</option>
                {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field"><label>Semester & Year Entered UIUC</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={(form.year_semester || '').split(' ')[0] || ''} onChange={e => {
                  const yr = (form.year_semester || '').split(' ')[1] || ''
                  setForm(f => ({ ...f, year_semester: `${e.target.value} ${yr}`.trim() }))
                }} style={{ flex: 1 }}>
                  <option value="">Sem</option>
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={(form.year_semester || '').split(' ')[1] || ''} onChange={e => {
                  const sem = (form.year_semester || '').split(' ')[0] || ''
                  setForm(f => ({ ...f, year_semester: `${sem} ${e.target.value}`.trim() }))
                }} style={{ flex: 1 }}>
                  <option value="">Year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
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
          <button className="btn btn-primary" onClick={saveInfo} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}

      {/* ── AVATAR / PHOTO TAB ── */}
      {activeTab === 'avatar' && (
        <div className="card">
          {/* Current avatar preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {form.photo_url
                ? <img src={form.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                : <span style={{ fontSize: 32 }}>{form.avatar || '👤'}</span>}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Current photo / avatar</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Upload a photo or pick an emoji avatar below</div>
            </div>
            {(form.photo_url || form.avatar) && (
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setForm(f => ({ ...f, photo_url: '', avatar: '' }))}>Remove</button>
            )}
          </div>

          {/* Upload photo */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Upload a photo</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadPhoto(e.target.files[0])} />
            <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '⏳ Uploading…' : '⬆️ Choose photo'}
            </button>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>JPG, PNG — max 400×400px after compression</div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '0 0 20px', position: 'relative' }}>
            <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 12px', fontSize: 12, color: 'var(--text3)' }}>or pick an emoji</span>
          </div>

          {/* Emoji avatar picker */}
          <AvatarPicker selected={form.avatar} onSelect={a => setForm(f => ({ ...f, avatar: a, photo_url: '' }))} />

          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={saveInfo} disabled={saving}>
              {saving ? 'Saving…' : 'Save photo / avatar'}
            </button>
          </div>
        </div>
      )}

      {/* ── PIN TAB ── */}
      {activeTab === 'pin' && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Change login PIN</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Your PIN is used to log in. It must be exactly 4 digits.</div>

          <div className="field">
            <label>Current PIN</label>
            <input type="password" maxLength={4} value={pinForm.current}
              onChange={e => { setPinForm(f => ({ ...f, current: e.target.value })); setPinError('') }}
              placeholder="····" style={{ width: 120, fontFamily: 'var(--mono)', fontSize: 18, letterSpacing: '0.2em', textAlign: 'center' }} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>New PIN</label>
              <input type="password" maxLength={4} value={pinForm.newPin}
                onChange={e => { setPinForm(f => ({ ...f, newPin: e.target.value })); setPinError('') }}
                placeholder="····" style={{ width: 120, fontFamily: 'var(--mono)', fontSize: 18, letterSpacing: '0.2em', textAlign: 'center' }} />
            </div>
            <div className="field">
              <label>Confirm new PIN</label>
              <input type="password" maxLength={4} value={pinForm.confirm}
                onChange={e => { setPinForm(f => ({ ...f, confirm: e.target.value })); setPinError('') }}
                placeholder="····" style={{ width: 120, fontFamily: 'var(--mono)', fontSize: 18, letterSpacing: '0.2em', textAlign: 'center' }} />
            </div>
          </div>

          {pinError && <div style={{ fontSize: 13, color: 'var(--accent2)', marginBottom: 12 }}>⚠️ {pinError}</div>}

          <button className="btn btn-primary" onClick={savePin}
            disabled={!pinForm.current || !pinForm.newPin || !pinForm.confirm}>
            Update PIN
          </button>
        </div>
      )}
    </div>
  )
}
