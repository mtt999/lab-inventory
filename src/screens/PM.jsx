import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

// ── iLab theme colors ──
const BLUE = '#0d47a1'
const ORANGE = '#ff6b00'
const ORANGE_LIGHT = '#fff3e0'

// ══════════════════════════════════════════════════════════════
// PROGRESS CIRCLE
// ══════════════════════════════════════════════════════════════
function ProgressCircle({ progress, onChange }) {
  const size = 36, stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  const color = progress === 100 ? '#2e7d32' : progress >= 50 ? BLUE : ORANGE
  const next = { 0: 25, 25: 50, 50: 75, 75: 100, 100: 0 }
  return (
    <div style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onChange(next[progress] ?? 0) }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e0e0e0" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.3s, stroke 0.3s' }}
        />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          fontSize="9" fontWeight="500" fill={color}>{progress}%</text>
      </svg>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MY TASKS TAB
// ══════════════════════════════════════════════════════════════
function MyTasks({ userId }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    sb.from('tasks').select('*').eq('assigned_to', userId).order('created_at', { ascending: true })
      .then(({ data }) => { setTasks(data || []); setLoading(false) })
  }, [userId])

  const toggleStatus = async (task, e) => {
    e.stopPropagation()
    const next = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    const newStatus = next[task.status]
    await sb.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const updateProgress = async (task, val) => {
    await sb.from('tasks').update({ progress: val }).eq('id', task.id)
    setTasks(tasks.map(t => t.id === task.id ? { ...t, progress: val } : t))
    if (selectedTask?.id === task.id) setSelectedTask({ ...selectedTask, progress: val })
  }

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  const statusStyle = (s) => ({
    todo: { background: '#f1f1f1', color: '#555' },
    in_progress: { background: ORANGE_LIGHT, color: ORANGE },
    done: { background: '#e8f5e9', color: '#2e7d32' },
  }[s] || {})

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>
      {selectedTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 16, flex: 1, paddingRight: 12 }}>{selectedTask.title}</div>
              <button onClick={() => setSelectedTask(null)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, ...statusStyle(selectedTask.status) }}>{selectedTask.status.replace('_', ' ')}</span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#e8f0fe', color: BLUE, fontWeight: 500 }}>{selectedTask.progress || 0}% complete</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Start date</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedTask.start_date || '—'}</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Deadline</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedTask.deadline || '—'}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${selectedTask.progress || 0}%`, background: BLUE, borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea rows={4} style={{ resize: 'vertical' }}
                defaultValue={selectedTask.notes || ''}
                onChange={e => setSelectedTask({ ...selectedTask, notes: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={async () => {
                await sb.from('tasks').update({ notes: selectedTask.notes }).eq('id', selectedTask.id)
                setTasks(tasks.map(t => t.id === selectedTask.id ? selectedTask : t))
                setSelectedTask(null)
              }}>Save notes</button>
              <button className="btn" onClick={() => setSelectedTask(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[{ label: 'Total tasks', value: tasks.length, color: 'var(--text)' },
          { label: 'Done', value: done, color: '#2e7d32' },
          { label: 'Progress', value: `${pct}%`, color: BLUE }].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: BLUE, borderRadius: 99 }} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {tasks.length === 0
          ? <div style={{ padding: 24, color: 'var(--text3)', fontSize: 14 }}>No tasks assigned yet.</div>
          : tasks.map(task => (
            <div key={task.id} onClick={() => setSelectedTask(task)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--surface2)', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <button onClick={e => toggleStatus(task, e)}
                style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.status === 'done' ? '#2e7d32' : 'var(--border)'}`, background: task.status === 'done' ? '#2e7d32' : 'transparent', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {task.status === 'done' && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </button>
              <span style={{ flex: 1, fontSize: 14, color: task.status === 'done' ? 'var(--text3)' : 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
              {task.notes && <span style={{ fontSize: 12, color: 'var(--text3)' }}>📝</span>}
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
              <ProgressCircle progress={task.progress || 0} onChange={val => updateProgress(task, val)} />
            </div>
          ))
        }
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Click a task to open · Click circle to update progress</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TEAM TAB
// ══════════════════════════════════════════════════════════════
function Team() {
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      sb.from('profiles').select('*').order('role', { ascending: true }),
      sb.from('tasks').select('*')
    ]).then(([{ data: p }, { data: t }]) => {
      setUsers(p || []); setTasks(t || []); setLoading(false)
    })
  }, [])

  const userTasks = (uid) => tasks.filter(t => t.assigned_to === uid)
  const doneTasks = (uid) => tasks.filter(t => t.assigned_to === uid && t.status === 'done').length
  const pct = (uid) => { const tot = userTasks(uid).length; return tot ? Math.round((doneTasks(uid) / tot) * 100) : 0 }

  const dotColor = (s) => ({ todo: '#aaa', in_progress: ORANGE, done: '#2e7d32' }[s] || '#aaa')
  const statusStyle = (s) => ({ todo: { background: '#f1f1f1', color: '#555' }, in_progress: { background: ORANGE_LIGHT, color: ORANGE }, done: { background: '#e8f5e9', color: '#2e7d32' } }[s] || {})

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {users.map(user => (
        <div key={user.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: user.role === 'admin' ? '#e8f0fe' : ORANGE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: user.role === 'admin' ? BLUE : ORANGE, flexShrink: 0 }}>
              {user.name?.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{userTasks(user.id).length} tasks · {doneTasks(user.id)} done</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct(user.id)}%`, background: BLUE, borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 12, color: BLUE, fontWeight: 500, minWidth: 32, textAlign: 'right' }}>{pct(user.id)}%</span>
            </div>
          </div>
          {userTasks(user.id).length === 0
            ? <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text3)' }}>No tasks assigned.</div>
            : userTasks(user.id).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--surface2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(task.status), flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: task.status === 'done' ? 'var(--text3)' : 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
              </div>
            ))
          }
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MEETINGS TAB
// ══════════════════════════════════════════════════════════════
function Meetings({ userId, isAdmin }) {
  const [meetings, setMeetings] = useState([])
  const [tasks, setTasks] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeMeeting, setActiveMeeting] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', assigned_to: '', start_date: '', deadline: '' })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useAppStore()

  useEffect(() => {
    Promise.all([
      sb.from('meetings').select('*').order('date', { ascending: false }),
      sb.from('tasks').select('*').eq('is_meeting_task', true),
      sb.from('profiles').select('*')
    ]).then(([{ data: m }, { data: t }, { data: p }]) => {
      const map = {}; (p || []).forEach(pr => map[pr.id] = pr)
      setMeetings(m || []); setTasks(t || []); setProfiles(map)
      if (m?.length) { setActiveMeeting(m[0]); setNotes(m[0].notes || '') }
      setLoading(false)
    })
  }, [])

  const createMeeting = async () => {
    const { data } = await sb.from('meetings').insert({ date: new Date().toISOString().split('T')[0], created_by: userId, notes: '' }).select().single()
    setMeetings([data, ...meetings]); setActiveMeeting(data); setNotes('')
  }

  const saveNotes = async () => {
    setSaving(true)
    await sb.from('meetings').update({ notes }).eq('id', activeMeeting.id)
    setMeetings(meetings.map(m => m.id === activeMeeting.id ? { ...m, notes } : m))
    setSaving(false); toast('Notes saved!')
  }

  const addTask = async (e) => {
    e.preventDefault()
    const { data } = await sb.from('tasks').insert({ ...newTask, created_by: userId, meeting_id: activeMeeting.id, is_meeting_task: true, status: 'todo' }).select().single()
    setTasks([...tasks, data]); setNewTask({ title: '', assigned_to: '', start_date: '', deadline: '' }); setShowNewTask(false)
  }

  const toggleStatus = async (task) => {
    const next = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    const newStatus = next[task.status]
    await sb.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const meetingTasks = (mid) => tasks.filter(t => t.meeting_id === mid)
  const statusStyle = (s) => ({ todo: { background: '#f1f1f1', color: '#555' }, in_progress: { background: ORANGE_LIGHT, color: ORANGE }, done: { background: '#e8f5e9', color: '#2e7d32' } }[s] || {})

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Meetings</div>
          {isAdmin && <button className="btn btn-sm" onClick={createMeeting} style={{ padding: '2px 8px', fontSize: 11 }}>+ New</button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {meetings.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No meetings yet.</div>}
          {meetings.map(m => (
            <button key={m.id} onClick={() => { setActiveMeeting(m); setNotes(m.notes || '') }}
              style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeMeeting?.id === m.id ? 600 : 400, background: activeMeeting?.id === m.id ? BLUE : 'transparent', color: activeMeeting?.id === m.id ? 'white' : 'var(--text2)', transition: 'all 0.15s' }}>
              {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {!activeMeeting
          ? <div style={{ fontSize: 14, color: 'var(--text3)' }}>Select or create a meeting.</div>
          : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{new Date(activeMeeting.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                {isAdmin && <button className="btn btn-sm btn-primary" onClick={() => setShowNewTask(!showNewTask)}>+ Add task</button>}
              </div>

              {showNewTask && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div className="field"><label>Task title</label><input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title" required /></div>
                  <div className="field"><label>Assign to</label>
                    <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} required>
                      <option value="">Assign to...</option>
                      {Object.values(profiles).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid-2">
                    <div className="field"><label>Start date</label><input type="date" value={newTask.start_date} onChange={e => setNewTask({ ...newTask, start_date: e.target.value })} required /></div>
                    <div className="field"><label>Deadline</label><input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} required /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={addTask}>Add task</button>
                    <button className="btn" onClick={() => setShowNewTask(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                {meetingTasks(activeMeeting.id).length === 0
                  ? <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text3)' }}>No tasks for this meeting yet.</div>
                  : meetingTasks(activeMeeting.id).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--surface2)' }}>
                      <button onClick={() => toggleStatus(task)}
                        style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.status === 'done' ? '#2e7d32' : 'var(--border)'}`, background: task.status === 'done' ? '#2e7d32' : 'transparent', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {task.status === 'done' && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: task.status === 'done' ? 'var(--text3)' : 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{profiles[task.assigned_to]?.name} · {task.start_date} → {task.deadline}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
                    </div>
                  ))
                }
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Meeting notes</div>
                <textarea rows={4} style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                  value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes for this meeting..." />
                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={saveNotes} disabled={saving}>{saving ? 'Saving…' : 'Save notes'}</button>
              </div>
            </>
          )
        }
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ADMIN TAB
// ══════════════════════════════════════════════════════════════
function PMAdmin({ userId }) {
  const [profiles, setProfiles] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState({ title: '', assigned_to: '', start_date: '', deadline: '', is_meeting_task: false })
  const [saving, setSaving] = useState(false)
  const { toast } = useAppStore()

  useEffect(() => {
    Promise.all([
      sb.from('profiles').select('*'),
      sb.from('tasks').select('*').order('created_at', { ascending: false })
    ]).then(([{ data: p }, { data: t }]) => {
      setProfiles(p || []); setTasks(t || []); setLoading(false)
    })
  }, [])

  const profileMap = {}
  profiles.forEach(p => profileMap[p.id] = p)

  const createTask = async (e) => {
    e.preventDefault(); setSaving(true)
    const { data } = await sb.from('tasks').insert({ ...newTask, created_by: userId, status: 'todo' }).select().single()
    setTasks([data, ...tasks])
    setNewTask({ title: '', assigned_to: '', start_date: '', deadline: '', is_meeting_task: false })
    setSaving(false); toast('Task created!')
  }

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return
    await sb.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id)); toast('Task deleted.')
  }

  const statusStyle = (s) => ({ todo: { background: '#f1f1f1', color: '#555' }, in_progress: { background: ORANGE_LIGHT, color: ORANGE }, done: { background: '#e8f5e9', color: '#2e7d32' } }[s] || {})

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Create new task</div>
        <div className="field"><label>Task title</label><input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title" required /></div>
        <div className="field"><label>Assign to</label>
          <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} required>
            <option value="">Assign to...</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
          </select>
        </div>
        <div className="grid-2">
          <div className="field"><label>Start date</label><input type="date" value={newTask.start_date} onChange={e => setNewTask({ ...newTask, start_date: e.target.value })} required /></div>
          <div className="field"><label>Deadline</label><input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} required /></div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={newTask.is_meeting_task} onChange={e => setNewTask({ ...newTask, is_meeting_task: e.target.checked })} /> This is a meeting task
        </label>
        <button className="btn btn-primary" onClick={createTask} disabled={saving}>{saving ? 'Creating…' : 'Create task'}</button>
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>All tasks ({tasks.length})</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {tasks.length === 0
            ? <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text3)' }}>No tasks yet.</div>
            : tasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--surface2)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{profileMap[task.assigned_to]?.name} · {task.start_date} → {task.deadline}{task.is_meeting_task && <span style={{ color: BLUE, marginLeft: 8 }}>meeting task</span>}</div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
                <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c84b2f', fontSize: 12 }}>delete</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CHAT TAB
// ══════════════════════════════════════════════════════════════
function Chat({ userId }) {
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    Promise.all([
      sb.from('profiles').select('*'),
      sb.from('messages').select('*').order('sent_at', { ascending: true })
    ]).then(([{ data: p }, { data: m }]) => {
      const map = {}; (p || []).forEach(pr => map[pr.id] = pr)
      setProfiles(map); setMessages(m || []); setLoading(false)
    })

    const channel = sb.channel('pm_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new])
      }).subscribe()
    return () => sb.removeChannel(channel)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    await sb.from('messages').insert({ sender_id: userId, body: newMessage.trim() })
    setNewMessage('')
  }

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 500 }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
        {messages.length === 0 && <div style={{ fontSize: 14, color: 'var(--text3)' }}>No messages yet. Say hello!</div>}
        {messages.map(msg => {
          const isMe = msg.sender_id === userId
          const sender = profiles[msg.sender_id]
          return (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: sender?.role === 'admin' ? '#e8f0fe' : ORANGE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: sender?.role === 'admin' ? BLUE : ORANGE, flexShrink: 0 }}>
                {sender?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2, maxWidth: '70%' }}>
                {!isMe && <span style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 4 }}>{sender?.name}</span>}
                <div style={{ padding: '8px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? BLUE : 'var(--surface2)', color: isMe ? 'white' : 'var(--text)', fontSize: 14 }}>
                  {msg.body}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 4 }}>{formatTime(msg.sent_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
        <input style={{ flex: 1 }} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message…" />
        <button className="btn btn-primary" type="submit" style={{ flexShrink: 0 }}>Send</button>
      </form>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PM SCREEN
// ══════════════════════════════════════════════════════════════
export default function PM() {
  const { session } = useAppStore()
  const [activeTab, setActiveTab] = useState('tasks')
  const [profile, setProfile] = useState(null)

  const userId = session?.userId
  const isAdmin = session?.role === 'admin'

  useEffect(() => {
    if (userId) {
      sb.from('profiles').select('*').eq('id', userId).maybeSingle()
        .then(({ data }) => setProfile(data))
    }
  }, [userId])

  const tabs = [
    { key: 'tasks',    label: 'My Tasks' },
    { key: 'team',     label: 'Team' },
    { key: 'meetings', label: 'Meetings' },
    { key: 'chat',     label: 'Chat' },
    ...(isAdmin ? [{ key: 'admin', label: 'Admin' }] : [])
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px' }}>Project Management</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>ICT — Staff workspace</div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 18px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: activeTab === t.key ? BLUE : 'var(--text2)', borderBottom: `2px solid ${activeTab === t.key ? BLUE : 'transparent'}`, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'tasks'    && <MyTasks userId={userId} />}
      {activeTab === 'team'     && <Team />}
      {activeTab === 'meetings' && <Meetings userId={userId} isAdmin={isAdmin} />}
      {activeTab === 'chat'     && <Chat userId={userId} />}
      {activeTab === 'admin'    && isAdmin && <PMAdmin userId={userId} />}
    </div>
  )
}
