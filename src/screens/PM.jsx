import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const BLUE = '#0d47a1'
const ORANGE = '#ff6b00'
const ORANGE_LIGHT = '#fff3e0'

// detect desktop vs mobile
const isDesktop = () => window.innerWidth >= 768

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
// MINI CALENDAR
// ══════════════════════════════════════════════════════════════
function MiniCalendar({ tasks, onDayClick }) {
  const [cal, setCal] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }
  })

  const today = new Date()
  const firstDay = new Date(cal.year, cal.month, 1).getDay()
  const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate()
  const monthName = new Date(cal.year, cal.month).toLocaleString('default', { month: 'long', year: 'numeric' })

  // count tasks due on each day
  const tasksByDay = {}
  tasks.forEach(t => {
    if (!t.deadline) return
    const d = new Date(t.deadline)
    if (d.getFullYear() === cal.year && d.getMonth() === cal.month) {
      const key = d.getDate()
      tasksByDay[key] = (tasksByDay[key] || 0) + 1
    }
  })

  const prev = () => setCal(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })
  const next = () => setCal(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })

  const isToday = (d) => d === today.getDate() && cal.month === today.getMonth() && cal.year === today.getFullYear()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa']

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prev} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text2)', padding: '0 4px' }}>‹</button>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{monthName}</div>
        <button onClick={next} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text2)', padding: '0 4px' }}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const count = tasksByDay[d] || 0
          const today_ = isToday(d)
          return (
            <div key={d} onClick={() => count > 0 && onDayClick(cal.year, cal.month, d)}
              style={{
                textAlign: 'center', borderRadius: 6, padding: '3px 0', cursor: count > 0 ? 'pointer' : 'default',
                background: today_ ? BLUE : 'transparent',
                border: count > 0 && !today_ ? `1px solid ${ORANGE}` : '1px solid transparent',
                transition: 'background 0.15s',
                position: 'relative'
              }}
              onMouseEnter={e => { if (count > 0 && !today_) e.currentTarget.style.background = ORANGE_LIGHT }}
              onMouseLeave={e => { if (!today_) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ fontSize: 11, fontWeight: today_ ? 700 : 400, color: today_ ? 'white' : 'var(--text)' }}>{d}</div>
              {count > 0 && (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: today_ ? 'white' : ORANGE,
                  color: today_ ? BLUE : 'white',
                  fontSize: 8, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '1px auto 0'
                }}>{count}</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>
        Highlighted days have tasks due
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MY TASKS TAB
// ══════════════════════════════════════════════════════════════
function MyTasks({ userId, isAdmin }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [calDayPopup, setCalDayPopup] = useState(null) // { year, month, day }
  const [desktop, setDesktop] = useState(isDesktop())
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', start_date: '', deadline: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const { toast } = useAppStore()

  useEffect(() => {
    const handler = () => setDesktop(isDesktop())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    load()
  }, [userId])

  async function load() {
    const { data } = await sb.from('tasks').select('*').eq('assigned_to', userId).order('deadline', { ascending: true })
    setTasks(data || [])
    setLoading(false)
  }

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

  const addTask = async () => {
    if (!newTask.title.trim()) { toast('Please enter a task title.'); return }
    setSaving(true)
    const { data } = await sb.from('tasks').insert({
      title: newTask.title,
      assigned_to: userId,
      created_by: userId,
      start_date: newTask.start_date || null,
      deadline: newTask.deadline || null,
      notes: newTask.notes || '',
      status: 'todo',
      progress: 0,
      is_meeting_task: false,
    }).select().single()
    setTasks([...tasks, data])
    setNewTask({ title: '', start_date: '', deadline: '', notes: '' })
    setShowAddTask(false)
    setSaving(false)
    toast('Task added!')
  }

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  const statusStyle = (s) => ({
    todo:        { background: '#f1f1f1', color: '#555' },
    in_progress: { background: ORANGE_LIGHT, color: ORANGE },
    done:        { background: '#e8f5e9', color: '#2e7d32' },
  }[s] || {})

  // tasks due on a specific day for the calendar popup
  const tasksOnDay = (year, month, day) =>
    tasks.filter(t => {
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>

      {/* ── Task detail modal ── */}
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

      {/* ── Calendar day popup ── */}
      {calDayPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                Tasks due on {new Date(calDayPopup.year, calDayPopup.month, calDayPopup.day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <button onClick={() => setCalDayPopup(null)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            {tasksOnDay(calDayPopup.year, calDayPopup.month, calDayPopup.day).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--surface2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.status === 'done' ? '#2e7d32' : task.status === 'in_progress' ? ORANGE : '#aaa', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text3)' : 'var(--text)' }}>{task.title}</div>
                  {desktop && task.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{task.notes}</div>}
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
                {desktop && <span style={{ fontSize: 11, color: BLUE, fontWeight: 500 }}>{task.progress || 0}%</span>}
              </div>
            ))}
            <button className="btn" style={{ marginTop: 16 }} onClick={() => setCalDayPopup(null)}>Close</button>
          </div>
        </div>
      )}

      {/* ── Add task modal (staff/admin) ── */}
      {showAddTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Add new task</div>
              <button onClick={() => setShowAddTask(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div className="field"><label>Task title *</label>
              <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="What needs to be done?" autoFocus />
            </div>
            <div className="grid-2">
              <div className="field"><label>Start date</label>
                <input type="date" value={newTask.start_date} onChange={e => setNewTask({ ...newTask, start_date: e.target.value })} />
              </div>
              <div className="field"><label>Deadline</label>
                <input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Notes</label>
              <textarea rows={3} style={{ resize: 'vertical' }} value={newTask.notes} onChange={e => setNewTask({ ...newTask, notes: e.target.value })} placeholder="Optional notes…" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={addTask} disabled={saving}>{saving ? 'Adding…' : 'Add task'}</button>
              <button className="btn" onClick={() => setShowAddTask(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar: stats + add button ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ label: 'Total', value: tasks.length, color: 'var(--text)' },
            { label: 'Done', value: done, color: '#2e7d32' },
            { label: 'Progress', value: desktop ? `${pct}%` : `${pct}%`, color: BLUE }
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: desktop ? '10px 16px' : '8px 12px' }}>
              {desktop && <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{s.label}</div>}
              <div style={{ fontSize: desktop ? 20 : 16, fontWeight: 600, color: s.color }}>{s.value}</div>
              {!desktop && <div style={{ fontSize: 9, color: 'var(--text3)' }}>{s.label}</div>}
            </div>
          ))}
        </div>
        {/* Add task button — staff and admin only */}
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddTask(true)}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {desktop ? 'Add task' : ''}
          </button>
        )}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: BLUE, borderRadius: 99 }} />
      </div>

      {/* ── Desktop: 2-col layout (task list + calendar); Mobile: stacked ── */}
      <div style={{ display: desktop ? 'grid' : 'block', gridTemplateColumns: desktop ? '1fr 220px' : undefined, gap: 20 }}>

        {/* Task list */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {tasks.length === 0
              ? <div style={{ padding: 24, color: 'var(--text3)', fontSize: 14, textAlign: 'center' }}>
                  No tasks assigned yet.{isAdmin && <span onClick={() => setShowAddTask(true)} style={{ color: BLUE, cursor: 'pointer', marginLeft: 6 }}>Add one →</span>}
                </div>
              : tasks.map(task => (
                <div key={task.id} onClick={() => setSelectedTask(task)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--surface2)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <button onClick={e => toggleStatus(task, e)}
                    style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.status === 'done' ? '#2e7d32' : 'var(--border)'}`, background: task.status === 'done' ? '#2e7d32' : 'transparent', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {task.status === 'done' && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: task.status === 'done' ? 'var(--text3)' : 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    {desktop && task.deadline && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Due {task.deadline}</div>
                    )}
                  </div>
                  {task.notes && <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>📝</span>}
                  {desktop && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, flexShrink: 0, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
                  )}
                  <ProgressCircle progress={task.progress || 0} onChange={val => updateProgress(task, val)} />
                </div>
              ))
            }
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
            Click a task to view details · Click circle to update progress
          </div>
        </div>

        {/* Calendar — shown on desktop inline, on mobile below */}
        <div style={{ marginTop: desktop ? 0 : 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Deadline calendar</div>
          <MiniCalendar tasks={tasks} onDayClick={(y, m, d) => setCalDayPopup({ year: y, month: m, day: d })} />
        </div>

      </div>
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

  const userId = session?.userId
  const isAdmin = session?.role === 'admin' || session?.role === 'user'

  const tabs = [
    { key: 'tasks',    label: 'My Tasks' },
    { key: 'team',     label: 'Team' },
    { key: 'meetings', label: 'Meetings' },
    { key: 'chat',     label: 'Chat' },
    ...(session?.role === 'admin' ? [{ key: 'admin', label: 'Admin' }] : [])
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

      {activeTab === 'tasks'    && <MyTasks userId={userId} isAdmin={isAdmin} />}
      {activeTab === 'team'     && <Team />}
      {activeTab === 'meetings' && <Meetings userId={userId} isAdmin={session?.role === 'admin'} />}
      {activeTab === 'chat'     && <Chat userId={userId} />}
      {activeTab === 'admin'    && session?.role === 'admin' && <PMAdmin userId={userId} />}
    </div>
  )
}
