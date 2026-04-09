import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import Modal from '../components/Modal'
import ProjectMaterials from './ProjectMaterials'
function MaterialStorage({ project }) {
  return (
    <div className="empty-state" style={{ padding: 48 }}>
      <div className="empty-icon">📦</div>
      <div>Material Storage — coming soon</div>
    </div>
  )
}
function ProjectDatabase({ project }) {
  return (
    <div className="empty-state" style={{ padding: 48 }}>
      <div className="empty-icon">🗄️</div>
      <div>Database — coming soon</div>
    </div>
  )
}

// ── Shared info cell ──────────────────────────────────────────
function InfoCell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}

// ── Project Info sub-tab ──────────────────────────────────────
function ProjectInfo({ project, users, onSaved }) {
  const { toast } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: project.name || '',
    project_id: project.project_id || '',
    cfop: project.cfop || '',
    status: project.status || 'active',
    pi_user_id: project.pi_user_id || '',
    student_ids: project.student_ids || [],
    sampling_date: project.sampling_date || '',
    storage_date: project.storage_date || '',
    notes: project.notes || '',
  })

  // sync form when project changes
  useEffect(() => {
    setForm({
      name: project.name || '',
      project_id: project.project_id || '',
      cfop: project.cfop || '',
      status: project.status || 'active',
      pi_user_id: project.pi_user_id || '',
      student_ids: project.student_ids || [],
      sampling_date: project.sampling_date || '',
      storage_date: project.storage_date || '',
      notes: project.notes || '',
    })
    setEditing(false)
  }, [project.id])

  function toggleStudent(id) {
    setForm(f => ({
      ...f,
      student_ids: f.student_ids.includes(id)
        ? f.student_ids.filter(s => s !== id)
        : [...f.student_ids, id]
    }))
  }

  async function save() {
    if (!form.name.trim()) { toast('Project name is required.'); return }
    if (!form.project_id.trim()) { toast('Project ID is required.'); return }
    const payload = {
      name: form.name.trim(),
      project_id: form.project_id.trim(),
      cfop: form.cfop.trim() || null,
      status: form.status,
      pi_user_id: form.pi_user_id || null,
      student_ids: form.student_ids,
      sampling_date: form.sampling_date || null,
      storage_date: form.storage_date || null,
      notes: form.notes.trim() || null,
    }
    const { error } = await sb.from('projects').update(payload).eq('id', project.id)
    if (error) {
      if (error.code === '23505') toast('Project ID already exists. Use a unique ID.')
      else toast('Error saving project.')
      return
    }
    toast('Project info saved.')
    setEditing(false)
    onSaved()
  }

  const piUser = users.find(u => u.id === project.pi_user_id)
  const studentUsers = users.filter(u => (project.student_ids || []).includes(u.id))
  const statusBadge = project.status === 'active' ? 'badge-active' : project.status === 'completed' ? 'badge-completed' : 'badge-hold'

  // ── Edit mode ──
  if (editing) return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Edit project info</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-primary" onClick={save}>Save</button>
          <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Project Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Soil Analysis Q2" />
        </div>
        <div className="field">
          <label>Project ID *</label>
          <input value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} placeholder="e.g. 2026-001" />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>CFOP (Budget/Funding Code)</label>
          <input value={form.cfop} onChange={e => setForm(f => ({ ...f, cfop: e.target.value }))} placeholder="e.g. 1-23456-789" />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="on hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Principal Investigator (PI)</label>
        <select value={form.pi_user_id} onChange={e => setForm(f => ({ ...f, pi_user_id: e.target.value }))}>
          <option value="">— Select PI —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Students</label>
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text3)' }}>No users found. Add users in Admin → Users first.</div>
            : users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, marginBottom: 0 }}>
                  <input type="checkbox" checked={form.student_ids.includes(u.id)} onChange={() => toggleStudent(u.id)} style={{ width: 'auto', cursor: 'pointer' }} />
                  {u.name}
                </label>
              ))
          }
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Sampling Date</label>
          <input type="date" value={form.sampling_date} onChange={e => setForm(f => ({ ...f, sampling_date: e.target.value }))} />
        </div>
        <div className="field">
          <label>Storage Date</label>
          <input type="date" value={form.storage_date} onChange={e => setForm(f => ({ ...f, storage_date: e.target.value }))} />
        </div>
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" style={{ resize: 'vertical' }} />
      </div>
    </div>
  )

  // ── View mode ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-sm" onClick={() => setEditing(true)}>✏️ Edit info</button>
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <span className={`badge ${statusBadge}`} style={{ fontSize: 12, padding: '4px 12px' }}>{project.status}</span>
        {project.project_id && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--surface2)', padding: '4px 12px', borderRadius: 99, color: 'var(--text2)' }}>
            ID: {project.project_id}
          </span>
        )}
        {project.cfop && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--accent-light)', padding: '4px 12px', borderRadius: 99, color: 'var(--accent)' }}>
            CFOP: {project.cfop}
          </span>
        )}
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <InfoCell label="Principal Investigator" value={piUser?.name} />
        <InfoCell label="Created" value={new Date(project.created_at).toLocaleDateString()} />
        <InfoCell label="Sampling Date" value={project.sampling_date} />
        <InfoCell label="Storage Date" value={project.storage_date} />
      </div>

      {/* Students */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Students</div>
        {studentUsers.length === 0
          ? <div style={{ color: 'var(--text3)', fontSize: 14 }}>No students assigned</div>
          : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {studentUsers.map(u => (
                <span key={u.id} style={{ background: 'var(--accent3-light)', color: 'var(--accent3)', borderRadius: 99, padding: '5px 14px', fontSize: 13, fontWeight: 500 }}>
                  👤 {u.name}
                </span>
              ))}
            </div>
          )
        }
      </div>

      {/* Notes */}
      {project.notes && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Notes</div>
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 14, fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
            {project.notes}
          </div>
        </div>
      )}
    </div>
  )
}

// ── New project modal ─────────────────────────────────────────
function NewProjectModal({ users, onClose, onCreated }) {
  const { toast } = useAppStore()
  const [form, setForm] = useState({
    name: '', project_id: '', cfop: '', status: 'active',
    pi_user_id: '', student_ids: [],
    sampling_date: '', storage_date: '', notes: '',
  })

  function toggleStudent(id) {
    setForm(f => ({
      ...f,
      student_ids: f.student_ids.includes(id)
        ? f.student_ids.filter(s => s !== id)
        : [...f.student_ids, id]
    }))
  }

  async function create() {
    if (!form.name.trim()) { toast('Project name is required.'); return }
    if (!form.project_id.trim()) { toast('Project ID is required.'); return }
    const payload = {
      name: form.name.trim(),
      project_id: form.project_id.trim(),
      cfop: form.cfop.trim() || null,
      status: form.status,
      pi_user_id: form.pi_user_id || null,
      student_ids: form.student_ids,
      sampling_date: form.sampling_date || null,
      storage_date: form.storage_date || null,
      notes: form.notes.trim() || null,
    }
    const { data, error } = await sb.from('projects').insert(payload).select().single()
    if (error) {
      if (error.code === '23505') toast('Project ID already exists. Use a unique ID.')
      else toast('Error creating project.')
      return
    }
    toast('Project created!')
    onCreated(data.id)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>New project</div>

      <div className="grid-2">
        <div className="field">
          <label>Project Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Soil Analysis Q2" autoFocus />
        </div>
        <div className="field">
          <label>Project ID *</label>
          <input value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} placeholder="e.g. 2026-001" />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>CFOP (Budget/Funding Code)</label>
          <input value={form.cfop} onChange={e => setForm(f => ({ ...f, cfop: e.target.value }))} placeholder="e.g. 1-23456-789" />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="on hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Principal Investigator (PI)</label>
        <select value={form.pi_user_id} onChange={e => setForm(f => ({ ...f, pi_user_id: e.target.value }))}>
          <option value="">— Select PI —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Students</label>
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 180, overflowY: 'auto' }}>
          {users.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text3)' }}>No users found. Add users in Admin → Users first.</div>
            : users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, marginBottom: 0 }}>
                  <input type="checkbox" checked={form.student_ids.includes(u.id)} onChange={() => toggleStudent(u.id)} style={{ width: 'auto', cursor: 'pointer' }} />
                  {u.name}
                </label>
              ))
          }
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Sampling Date</label>
          <input type="date" value={form.sampling_date} onChange={e => setForm(f => ({ ...f, sampling_date: e.target.value }))} />
        </div>
        <div className="field">
          <label>Storage Date</label>
          <input type="date" value={form.storage_date} onChange={e => setForm(f => ({ ...f, storage_date: e.target.value }))} />
        </div>
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" style={{ resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-purple" onClick={create}>Create project</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PROJECTS COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Projects() {
  const { toast } = useAppStore()
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [activeProject, setActiveProject] = useState(null)
  const [subTab, setSubTab] = useState('info')

  useEffect(() => { loadProjects() }, [filter])
  useEffect(() => { loadUsers() }, [])
  useEffect(() => { if (activeProjectId) loadActiveProject() }, [activeProjectId])

  async function loadProjects() {
    setLoading(true)
    let q = sb.from('projects').select('id, name, project_id, status, cfop').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setProjects(data || [])
    setLoading(false)
  }

  async function loadUsers() {
    const { data } = await sb.from('users').select('id, name').order('name')
    setUsers(data || [])
  }

  async function loadActiveProject() {
    const { data } = await sb.from('projects').select('*').eq('id', activeProjectId).single()
    setActiveProject(data || null)
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project and all its data?')) return
    await sb.from('projects').delete().eq('id', id)
    setActiveProjectId(null)
    setActiveProject(null)
    loadProjects()
    toast('Project deleted.')
  }

  const statusBadge = (s) => s === 'active' ? 'badge-active' : s === 'completed' ? 'badge-completed' : 'badge-hold'

  const subTabs = [
    { key: 'info',      label: '1 · Project Info' },
    { key: 'materials', label: '2 · Project Materials' },
    { key: 'storage',   label: '3 · Material Storage' },
    { key: 'database',  label: '4 · Database' },
  ]

  return (
    <div>
      {/* ── Header ── */}
      <div className="section-header">
        <div className="section-title">Projects</div>
        <button className="btn btn-sm btn-purple" onClick={() => setShowNewModal(true)}>+ New project</button>
      </div>

      {/* ── Status filter ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all','active','on hold','completed'].map(f => (
          <button key={f} className={'filter-btn' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Two-panel layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left: project list */}
        <div style={{ position: 'sticky', top: 72 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : projects.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="empty-icon">🧪</div>
              <div>No projects yet.<br />Create your first one!</div>
            </div>
          ) : (
            projects.map(p => {
              const isActive = activeProjectId === p.id
              return (
                <div key={p.id}
                  onClick={() => { setActiveProjectId(p.id); setSubTab('info') }}
                  style={{
                    background: isActive ? 'var(--accent3-light)' : 'var(--surface)',
                    border: `1px solid ${isActive ? 'var(--accent3)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)', padding: '12px 14px', marginBottom: 8,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: isActive ? 'var(--accent3)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      {p.project_id && (
                        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', marginTop: 2 }}>
                          {p.project_id}
                        </div>
                      )}
                    </div>
                    <span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 10, flexShrink: 0, padding: '2px 8px' }}>
                      {p.status}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right: project detail */}
        <div>
          {!activeProject ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👈</div>
              <div>Select a project from the list</div>
            </div>
          ) : (
            <div>
              {/* Project name bar */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{activeProject.name}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text3)', marginTop: 2 }}>
                      {[activeProject.project_id && `ID: ${activeProject.project_id}`, activeProject.cfop && `CFOP: ${activeProject.cfop}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteProject(activeProject.id)}>Delete</button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0, background: 'var(--surface)', borderRadius: '0', overflowX: 'auto' }}>
                {subTabs.map(t => (
                  <button key={t.key} onClick={() => setSubTab(t.key)}
                    style={{
                      padding: '11px 16px', border: 'none', background: 'transparent',
                      fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      color: subTab === t.key ? 'var(--accent3)' : 'var(--text2)',
                      borderBottom: `2px solid ${subTab === t.key ? 'var(--accent3)' : 'transparent'}`,
                      whiteSpace: 'nowrap', transition: 'all 0.15s'
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab content */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: 24 }}>
                {subTab === 'info'      && <ProjectInfo project={activeProject} users={users} onSaved={loadActiveProject} />}
                {subTab === 'materials' && <ProjectMaterials project={activeProject} />}
                {subTab === 'storage'   && <MaterialStorage project={activeProject} />}
                {subTab === 'database'  && <ProjectDatabase project={activeProject} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New project modal ── */}
      {showNewModal && (
        <NewProjectModal
          users={users}
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => { setActiveProjectId(id); loadProjects() }}
        />
      )}
    </div>
  )
}
