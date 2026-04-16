import HelpPanel from '../components/HelpPanel'
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

// ══════════════════════════════════════════════════════════════
// ADMIN PROFILE PAGE
// ══════════════════════════════════════════════════════════════
function AdminProfile() {
  const { session, settings, refreshCache, toast } = useAppStore()
  const [adminTab, setAdminTab] = useState('admin')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}><div className="section-title">Profile & Management</div><HelpPanel screen="profile" /></div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[{ key: 'admin', label: '🔑 Admin Settings' }, { key: 'students', label: '👥 Students' }].map(t => (
          <button key={t.key} onClick={() => setAdminTab(t.key)}
            style={{ padding: '10px 24px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: adminTab === t.key ? 'var(--accent)' : 'var(--text2)', borderBottom: `2px solid ${adminTab === t.key ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {adminTab === 'admin' && <AdminSettings session={session} toast={toast} />}
      {adminTab === 'students' && <StudentsPanel toast={toast} session={session} />}
      {adminTab === 'access' && <AccessControl toast={toast} session={session} />}
    </div>
  )
}

function AdminSettings({ session, toast }) {
  const [form, setForm] = useState({ email: '', currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function savePassword() {
    setError('')
    if (!form.newPassword) { setError('Enter a new password.'); return }
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true)
    if (session.userId) {
      // Verify current password first
      const { data } = await sb.from('users').select('password').eq('id', session.userId).single()
      if (data?.password && data.password !== form.currentPassword) {
        setError('Current password is incorrect.'); setSaving(false); return
      }
      await sb.from('users').update({ password: form.newPassword, email: form.email || undefined }).eq('id', session.userId)
    } else {
      // Owner admin — save to settings
      await sb.from('settings').upsert({ key: 'admin_password', value: form.newPassword })
      if (form.email) await sb.from('settings').upsert({ key: 'admin_email', value: form.email })
    }
    toast('Password updated ✓')
    setForm({ email: '', currentPassword: '', newPassword: '', confirmPassword: '' })
    setSaving(false)
  }

  return (
    <div className="card" style={{ maxWidth: 440 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>🔑 Account Settings</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Update your login email and password.</div>
      <div className="field"><label>Email address</label>
        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="motlagh999@gmail.com" />
      </div>
      <div className="field"><label>Current password</label>
        <input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="••••••••" />
      </div>
      <div className="field"><label>New password</label>
        <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min. 6 characters" />
      </div>
      <div className="field"><label>Confirm new password</label>
        <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="••••••••" />
      </div>
      {error && <div style={{ fontSize: 13, color: 'var(--accent2)', marginBottom: 12 }}>⚠️ {error}</div>}
      <button className="btn btn-primary" onClick={savePassword} disabled={saving}>{saving ? 'Saving…' : 'Update password'}</button>
    </div>
  )
}

const DEGREES_OPTS = DEGREES
const GROUPS_OPTS = PROJECT_GROUPS

function StudentsPanel({ toast }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  const [supervisors, setSupervisors] = useState([])

  useEffect(() => { loadStudents(); loadSupervisors() }, [])

  async function loadStudents() {
    setLoading(true)
    const { data } = await sb.from('users').select('*').order('role').order('name')
    setStudents(data || [])
    setLoading(false)
  }

  async function loadSupervisors() {
    // Supervisors = staff (user) + admin roles
    const { data } = await sb.from('users').select('id, name').in('role', ['user','admin']).eq('is_active', true).order('name')
    setSupervisors(data || [])
  }

  async function saveStudent(form, id) {
    if (!form.name.trim()) { toast('Name is required.'); return }
    if (!id && !form.password) { toast('Password is required.'); return }
    const adminLv = parseInt(form.admin_level)||0
    const role = adminLv >= 1 ? 'admin' : adminLv === -1 ? 'user' : 'student'
    const payload = { name: form.name.trim(), email: form.email||null, phone: form.phone||null, degree: form.degree||null, year_semester: form.year_semester||null, supervisor: form.supervisor||null, project_group: form.project_group||null, role, is_active: true, admin_level: Math.max(0,adminLv) }
    if (form.password) payload.password = form.password
    if (id) await sb.from('users').update(payload).eq('id', id)
    else await sb.from('users').insert(payload)
    setShowModal(false); setEditStudent(null); loadStudents(); toast('Student saved.')
  }

  async function toggleActive(s) {
    await sb.from('users').update({ is_active: !s.is_active }).eq('id', s.id)
    loadStudents(); toast(s.is_active ? 'Student deactivated.' : 'Student activated.')
  }

  async function deleteStudent(id) {
    if (!confirm('Delete this student?')) return
    await sb.from('users').delete().eq('id', id)
    loadStudents(); toast('Student deleted.')
  }

  async function parseExcel(file) {
    const XLSX = await import('xlsx')
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          const items = []
          for (let i = 1; i < rows.length; i++) {
            const [name, email, phone, degree, year_semester, supervisor, project_group] = rows[i]
            if (name?.trim()) items.push({ name: name.trim(), email: email||'', phone: phone||'', degree: degree||'', year_semester: year_semester||'', supervisor: supervisor||'', project_group: project_group||'' })
          }
          resolve(items)
        } catch(err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsBinaryString(file)
    })
  }

  async function confirmImport() {
    if (!importPreview) return
    setImporting(true)
    let added = 0
    for (const s of importPreview) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString()
      const { error } = await sb.from('users').insert({ ...s, pin, role: 'student', is_active: true })
      if (!error) added++
    }
    setImportPreview(null); setImporting(false); loadStudents()
    toast(`${added} students imported. PINs auto-assigned.`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>{students.length} student{students.length !== 1 ? 's' : ''}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>⬆️ Import Excel</button>
          <button className="btn btn-sm btn-primary" onClick={() => { setEditStudent(null); setShowModal(true) }}>+ Add student</button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={async e => {
        try { setImportPreview(await parseExcel(e.target.files[0])) } catch { toast('Error reading file.') }
      }} />

      {importPreview && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Import preview — {importPreview.length} students</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Columns: Name · Email · Phone · Degree · Year/Semester · Supervisor · Project Group</div>
          {importPreview.slice(0,3).map((s,i) => <div key={i} style={{ fontSize: 13, padding: '2px 0', color: 'var(--text2)' }}>· {s.name}</div>)}
          {importPreview.length > 3 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>…and {importPreview.length - 3} more</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={confirmImport} disabled={importing}>{importing ? 'Importing…' : 'Import now'}</button>
            <button className="btn btn-sm" onClick={() => setImportPreview(null)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : students.length === 0 ? <div className="empty-state"><div className="empty-icon">👥</div>No students yet.</div>
        : students.map(s => (
          <div key={s.id} className="card" style={{ padding: '12px 18px', marginBottom: 10, opacity: s.is_active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.name}
                  {s.role === 'admin' && <span style={{ marginLeft: 8, fontSize: 11, background: '#e0f2fe', color: '#0369a1', borderRadius: 3, padding: '1px 6px', fontWeight: 600 }}>Admin {s.admin_level || ''}</span>}
                  {s.role === 'user' && <span style={{ marginLeft: 8, fontSize: 11, background: '#f3eeff', color: '#7c4dbd', borderRadius: 3, padding: '1px 6px', fontWeight: 600 }}>Staff/RE</span>}
                  {s.role === 'student' && <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--surface2)', color: 'var(--text3)', borderRadius: 3, padding: '1px 6px' }}>Student</span>}
                  {!s.is_active && <span style={{ fontSize: 11, color: 'var(--accent2)', marginLeft: 6 }}>Inactive</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                  {s.email && <span>📧 {s.email}</span>}
                  {s.password && <span>🔑 {s.password}</span>}
                  {s.degree && <span>{s.degree}</span>}
                  {s.project_group && <span>{s.project_group}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={() => { setEditStudent(s); setShowModal(true) }}>Edit</button>
                <button className="btn btn-sm" onClick={() => toggleActive(s)}>{s.is_active ? 'Deactivate' : 'Activate'}</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteStudent(s.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))
      }

      {showModal && (
        <StudentModal student={editStudent} supervisors={supervisors} onClose={() => { setShowModal(false); setEditStudent(null) }} onSave={saveStudent} />
      )}
    </div>
  )
}

function SupervisorSelect({ value, onChange }) {
  const [supervisors, setSupervisors] = useState([])
  useEffect(() => {
    sb.from('users').select('id, name').in('role', ['user','admin']).eq('is_active', true).order('name')
      .then(({ data }) => setSupervisors(data || []))
  }, [])
  return (
    <select value={value||''} onChange={e => onChange(e.target.value)}>
      <option value="">— Select supervisor —</option>
      {supervisors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
    </select>
  )
}

function StudentModal({ student, onClose, onSave, supervisors = [] }) {
  const [form, setForm] = useState(student
    ? { name: student.name||'', password:'', email: student.email||'', phone: student.phone||'', degree: student.degree||'', year_semester: student.year_semester||'', supervisor: student.supervisor||'', project_group: student.project_group||'', admin_level: student.admin_level||0, role: student.role||'student' }
    : { name:'', password:'', email:'', phone:'', degree:'', year_semester:'', supervisor:'', project_group:'', admin_level:0, role:'student' })
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:28, maxWidth:520, width:'100%', maxHeight:'90vh', overflowY:'auto', border:'1px solid var(--border)' }}>
        <div style={{ fontWeight:600, fontSize:16, marginBottom:20 }}>{student ? 'Edit student' : 'Add student'}</div>
        <div className="grid-2">
          <div className="field"><label>Full Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus /></div>
          <div className="field"><label>Email *</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="netid@illinois.edu" /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Password{student?' (leave blank to keep)':' *'}</label><input type="text" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min. 6 chars" /></div>
          <div className="field"><label>Admin Level</label>
            <select value={form.admin_level||0} onChange={e=>setForm(f=>({...f,admin_level:parseInt(e.target.value),role:parseInt(e.target.value)>=1?'admin':f.role}))}>
              <option value={0}>Student</option>
              <option value={-1}>Staff / RE</option>
              <option value={1}>Admin 1</option>
              <option value={2}>Admin 2</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Email</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="netid@illinois.edu" /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Degree</label>
            <select value={form.degree} onChange={e=>setForm(f=>({...f,degree:e.target.value}))}>
              <option value="">— Select —</option>
              {DEGREES_OPTS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field"><label>Year & Semester Entered</label><input value={form.year_semester} onChange={e=>setForm(f=>({...f,year_semester:e.target.value}))} placeholder="e.g. Fall 2024" /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Supervisor</label>
            <select value={form.supervisor||''} onChange={e=>setForm(f=>({...f,supervisor:e.target.value}))}>
              <option value="">— Select supervisor —</option>
              {supervisors.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Project Group</label>
            <select value={form.project_group} onChange={e=>setForm(f=>({...f,project_group:e.target.value}))}>
              <option value="">— Select —</option>
              {GROUPS_OPTS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button className="btn btn-primary" onClick={()=>onSave(form, student?.id)}>Save</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// STAFF / STUDENT PROFILE PAGE
// ══════════════════════════════════════════════════════════════
function UserProfile({ session }) {
  const { toast, setSession } = useAppStore()
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
    let user = null
    if (session.userId) {
      const { data } = await sb.from('users').select('*').eq('id', session.userId).maybeSingle()
      user = data
    }
    if (!user) {
      const { data } = await sb.from('users').select('*').eq('name', session.username).maybeSingle()
      user = data
    }
    setUser(user)
    if (user) setForm({ name: user.name||'', last_name: user.last_name||'', email: user.email||'', phone: user.phone||'', degree: user.degree||'', year_semester: user.year_semester||'', supervisor: user.supervisor||'', project_group: user.project_group||'', avatar: user.avatar||'', photo_url: user.photo_url||'' })
    setLoading(false)
  }

  async function saveInfo() {
    setSaving(true)
    const { error } = await sb.from('users').update({ name: form.name.trim(), last_name: form.last_name||null, email: form.email||null, phone: form.phone||null, degree: form.degree||null, year_semester: form.year_semester||null, supervisor: form.supervisor||null, project_group: form.project_group||null, avatar: form.avatar||null, photo_url: form.photo_url||null }).eq('id', user.id)
    if (error) { toast('Error saving.'); setSaving(false); return }
    if (form.name.trim() !== session.username) setSession({ ...session, username: form.name.trim() })
    toast('Profile saved ✓'); setSaving(false); load()
  }

  async function savePin() {
    setPinError('')
    if (!pinForm.current) { setPinError('Enter your current password.'); return }
    if (!pinForm.newPin || pinForm.newPin.length < 6) { setPinError('New password must be at least 6 characters.'); return }
    if (pinForm.newPin !== pinForm.confirm) { setPinError('Passwords do not match.'); return }
    const { data } = await sb.from('users').select('password').eq('id', user.id).single()
    if (data?.password && data.password !== pinForm.current) { setPinError('Current password is incorrect.'); return }
    await sb.from('users').update({ password: pinForm.newPin }).eq('id', user.id)
    toast('Password updated ✓'); setPinForm({ current: '', newPin: '', confirm: '' })
  }

  async function uploadPhoto(file) {
    if (!file?.type.startsWith('image/')) { toast('Please select an image.'); return }
    setUploading(true)
    try {
      const compressed = await new Promise(resolve => {
        const img = new Image(), url = URL.createObjectURL(file)
        img.onload = () => {
          const s = Math.min(1, 400 / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * s); canvas.height = Math.round(img.height * s)
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
          URL.revokeObjectURL(url); canvas.toBlob(resolve, 'image/jpeg', 0.85)
        }
        img.src = url
      })
      const path = `avatars/${user.id}_${Date.now()}.jpg`
      const { error } = await sb.storage.from('project-files').upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const url = sb.storage.from('project-files').getPublicUrl(path).data.publicUrl
      setForm(f => ({ ...f, photo_url: url, avatar: '' }))
      toast('Photo uploaded ✓')
    } catch { toast('Upload failed.') }
    setUploading(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!user) return <div className="empty-state"><div className="empty-icon">👤</div>Profile not found.</div>

  const displayName = [user.name, user.last_name].filter(Boolean).join(' ')
  const avatarContent = user.photo_url
    ? <img src={user.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : user.avatar ? <span style={{ fontSize: 36 }}>{user.avatar}</span>
    : <span style={{ fontSize: 32, color: 'var(--text3)' }}>👤</span>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}><div className="section-title">My Profile</div><HelpPanel screen="profile" /></div>

      {/* Header card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface2)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {avatarContent}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{displayName || user.name}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--surface2)', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
              {user.role === 'student' ? 'Student' : 'Staff / RE'}
            </span>
            {user.project_group && <span style={{ background: groupBg[user.project_group]||'#f0efe9', color: groupColor[user.project_group]||'#6b6860', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{user.project_group}</span>}
            {user.degree && <span style={{ background: 'var(--surface2)', borderRadius: 99, padding: '3px 12px', fontSize: 12, color: 'var(--text2)' }}>{user.degree}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[{ key: 'info', label: '👤 Info' }, { key: 'avatar', label: '🖼️ Photo' }, { key: 'pin', label: '🔑 Password' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: activeTab === t.key ? 'var(--accent)' : 'var(--text2)', borderBottom: `2px solid ${activeTab === t.key ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {activeTab === 'info' && (
        <div className="card">
          <div className="grid-2">
            <div className="field"><label>First Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="field"><label>Last Name</label><input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="netid@illinois.edu" /></div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Degree</label>
              <select value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))}>
                <option value="">— Select —</option>
                {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field"><label>Semester & Year Started</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={(form.year_semester||'').split(' ')[0]||''} onChange={e => { const yr = (form.year_semester||'').split(' ')[1]||''; setForm(f => ({ ...f, year_semester: `${e.target.value} ${yr}`.trim() })) }} style={{ flex: 1 }}>
                  <option value="">Sem</option>{SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={(form.year_semester||'').split(' ')[1]||''} onChange={e => { const sem = (form.year_semester||'').split(' ')[0]||''; setForm(f => ({ ...f, year_semester: `${sem} ${e.target.value}`.trim() })) }} style={{ flex: 1 }}>
                  <option value="">Year</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Supervisor</label>
              <SupervisorSelect value={form.supervisor} onChange={v => setForm(f => ({ ...f, supervisor: v }))} />
            </div>
            <div className="field"><label>Project Group</label>
              <select value={form.project_group} onChange={e => setForm(f => ({ ...f, project_group: e.target.value }))}>
                <option value="">— Select —</option>
                {PROJECT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveInfo} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}

      {/* Photo tab */}
      {activeTab === 'avatar' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {form.photo_url ? <img src={form.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>{form.avatar || '👤'}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Current photo / avatar</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Upload a photo or pick an emoji</div>
            </div>
            {(form.photo_url || form.avatar) && <button className="btn btn-sm" onClick={() => setForm(f => ({ ...f, photo_url: '', avatar: '' }))}>Remove</button>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Upload a photo</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadPhoto(e.target.files[0])} />
            <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? '⏳ Uploading…' : '⬆️ Choose photo'}</button>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', margin: '0 0 20px', position: 'relative' }}>
            <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 12px', fontSize: 12, color: 'var(--text3)' }}>or pick an emoji</span>
          </div>
          <AvatarPicker selected={form.avatar} onSelect={a => setForm(f => ({ ...f, avatar: a, photo_url: '' }))} />
          <div style={{ marginTop: 20 }}><button className="btn btn-primary" onClick={saveInfo} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
        </div>
      )}

      {/* PIN tab */}
      {activeTab === 'pin' && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Change password</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Your password must be at least 6 characters.</div>
          <div className="field"><label>Current PIN</label><input type="password" value={pinForm.current} onChange={e => { setPinForm(f => ({ ...f, current: e.target.value })); setPinError('') }} placeholder="Current password" /></div>
          <div className="grid-2">
            <div className="field"><label>New PIN</label><input type="password" value={pinForm.newPin} onChange={e => { setPinForm(f => ({ ...f, newPin: e.target.value })); setPinError('') }} placeholder="Min. 6 characters" /></div>
            <div className="field"><label>Confirm new PIN</label><input type="password" value={pinForm.confirm} onChange={e => { setPinForm(f => ({ ...f, confirm: e.target.value })); setPinError('') }} placeholder="Confirm new password" /></div>
          </div>
          {pinError && <div style={{ fontSize: 13, color: 'var(--accent2)', marginBottom: 12 }}>⚠️ {pinError}</div>}
          <button className="btn btn-primary" onClick={savePin} disabled={!pinForm.current || !pinForm.newPin || !pinForm.confirm}>Update PIN</button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PROFILE — routes by role
// ══════════════════════════════════════════════════════════════
export default function Profile() {
  const { session } = useAppStore()
  if (session?.role === 'admin') return <AdminProfile />
  return <UserProfile session={session} />
}


// ── Access Control Panel ──────────────────────────────────────
function AccessControl({ toast, session }) {
  const ALL_SCREENS = [
    { key: 'home',        label: 'Supply Inventory', icon: '📦' },
    { key: 'projects',    label: 'Project Inventory', icon: '🧪' },
    { key: 'training',    label: 'Training Records',  icon: '🎓' },
    { key: 'equipment',   label: 'Equipment Inventory', icon: '🔧' },
    { key: 'equipmenthub',label: 'Equipment Hub',     icon: '📚' },
    { key: 'booking',     label: 'Booking Equipment', icon: '📅' },
    { key: 'remessages',  label: 'Research Engineers', icon: '💬' },
    { key: 'mileage',     label: 'Mileage Form',      icon: '🚗' },
    { key: 'labsafety',   label: 'Lab Safety',        icon: '🦺' },
  ]
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [access, setAccess] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUsers() }, [])
  useEffect(() => { if (selected) loadAccess(selected.id) }, [selected])

  async function loadUsers() {
    setLoading(true)
    const { data } = await sb.from('users').select('id, name, role, admin_level').in('role', ['user', 'admin']).eq('is_active', true).order('name')
    setUsers(data || [])
    setLoading(false)
  }

  async function loadAccess(userId) {
    const { data } = await sb.from('user_screen_access').select('screen_key').eq('user_id', userId)
    if (data?.length) {
      const map = {}
      data.forEach(r => { map[r.screen_key] = true })
      setAccess(map)
    } else {
      // Default: all screens enabled
      const map = {}
      ALL_SCREENS.forEach(s => { map[s.key] = true })
      setAccess(map)
    }
  }

  async function saveAccess() {
    if (!selected) return
    setSaving(true)
    // Delete existing, re-insert
    await sb.from('user_screen_access').delete().eq('user_id', selected.id)
    const rows = Object.entries(access).filter(([, v]) => v).map(([key]) => ({ user_id: selected.id, screen_key: key }))
    if (rows.length) await sb.from('user_screen_access').insert(rows)
    toast('Access updated ✓')
    setSaving(false)
  }

  async function setAdminLevel(user, level) {
    const role = level >= 1 ? 'admin' : 'user'
    await sb.from('users').update({ admin_level: level, role }).eq('id', user.id)
    toast(`${user.name} set to ${level >= 1 ? 'Admin ' + level : 'Staff/RE'} ✓`)
    loadUsers()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>
      {/* Admin level assignment */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>👑 Admin Level Assignment</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Assign Admin 1 or Admin 2 access to staff members.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.role === 'admin' ? `Admin ${u.admin_level}` : 'Staff/RE'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ label: 'Staff/RE', level: 0 }, { label: 'Admin 1', level: 1 }, { label: 'Admin 2', level: 2 }].map(opt => (
                  <button key={opt.level}
                    className={`btn btn-sm${(u.admin_level || 0) === opt.level && u.role === (opt.level >= 1 ? 'admin' : 'user') ? ' btn-primary' : ''}`}
                    onClick={() => setAdminLevel(u, opt.level)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen access per user */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>🗂️ Module Access</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Select a staff member to control which modules they can access.</div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Select staff member</label>
          <select value={selected?.id || ''} onChange={e => setSelected(users.find(u => u.id === e.target.value) || null)}>
            <option value="">— Select —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'Admin ' + u.admin_level : 'Staff/RE'})</option>)}
          </select>
        </div>
        {selected && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
              {ALL_SCREENS.map(s => (
                <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1px solid ${access[s.key] ? 'var(--accent)' : 'var(--border)'}`, background: access[s.key] ? 'var(--accent-light)' : 'var(--surface2)', cursor: 'pointer', marginBottom: 0 }}>
                  <input type="checkbox" checked={!!access[s.key]} onChange={e => setAccess(a => ({ ...a, [s.key]: e.target.checked }))} style={{ width: 'auto' }} />
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: access[s.key] ? 'var(--accent)' : 'var(--text)' }}>{s.label}</span>
                </label>
              ))}
            </div>
            <button className="btn btn-primary" onClick={saveAccess} disabled={saving}>{saving ? 'Saving…' : `Save access for ${selected.name}`}</button>
          </>
        )}
      </div>
    </div>
  )
}