import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const BLUE = '#0d47a1'
const ORANGE = '#ff6b00'
const ORANGE_LIGHT = '#fff3e0'
const isDesktop = () => window.innerWidth >= 768

function progressColor(pct) {
  if (pct === 100) return '#2e7d32'
  if (pct >= 75)  return '#0369a1'
  if (pct >= 50)  return BLUE
  if (pct >= 25)  return ORANGE
  return '#c84b2f'
}

async function sendNotification(userId, type, title, body, taskId = null) {
  if (!userId) return
  const { data: prefs } = await sb.from('notification_prefs').select('*').eq('user_id', userId).maybeSingle()
  if (prefs && prefs[type] === false) return
  await sb.from('notifications').insert({ user_id: userId, type, title, body, task_id: taskId, read: false })
}

function ProgressCircle({ progress, onChange }) {
  const size = 36, stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  const color = progressColor(progress)
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
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="500" fill={color}>{progress}%</text>
      </svg>
    </div>
  )
}

function ProgressTape({ progress }) {
  const color = progressColor(progress)
  const segments = [{ pct: 25, label: '25%' }, { pct: 50, label: '50%' }, { pct: 75, label: '75%' }, { pct: 100, label: '100%' }]
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Progress</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{progress}%</span>
      </div>
      <div style={{ position: 'relative', height: 10, background: '#e8e8e8', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, borderRadius: 99, background: `linear-gradient(to right, #c84b2f, ${ORANGE}, ${BLUE}, #2e7d32)`, backgroundSize: '400% 100%', backgroundPosition: `${100 - progress}% 0`, transition: 'width 0.5s ease' }} />
        {segments.map(s => <div key={s.pct} style={{ position: 'absolute', top: 0, left: `${s.pct}%`, width: 1, height: '100%', background: 'rgba(255,255,255,0.5)' }} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        {segments.map(s => <span key={s.pct} style={{ fontSize: 9, color: progress >= s.pct ? color : 'var(--text3)', fontWeight: progress >= s.pct ? 600 : 400 }}>{s.label}</span>)}
      </div>
    </div>
  )
}

function TaskComments({ taskId, currentUserId, currentUserName, assignedTo }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadComments()
    const channel = sb.channel(`task_comments_${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` }, payload => {
        setComments(prev => [...prev, payload.new])
      }).subscribe()
    return () => sb.removeChannel(channel)
  }, [taskId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  async function loadComments() {
    const { data } = await sb.from('task_comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true })
    setComments(data || []); setLoading(false)
  }

  async function postComment() {
    if (!newComment.trim()) return
    setPosting(true)
    const name = currentUserName || 'Staff'
    await sb.from('task_comments').insert({ task_id: taskId, user_id: currentUserId || null, user_name: name, body: newComment.trim() }).select().single()
    if (assignedTo && assignedTo !== currentUserId) {
      await sendNotification(assignedTo, 'task_comment', 'New comment on your task', `${name}: ${newComment.trim().slice(0, 60)}`, taskId)
    }
    setNewComment('')
    setPosting(false)
  }

  const formatTime = (ts) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        💬 Comments {comments.length > 0 && <span style={{ background: 'var(--surface2)', borderRadius: 99, padding: '1px 7px', fontSize: 11, color: 'var(--text3)' }}>{comments.length}</span>}
      </div>
      {loading ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading…</div> : (
        <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {comments.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>No comments yet. Be the first!</div>}
          {comments.map(c => {
            const isMe = c.user_id === currentUserId || (!currentUserId && c.user_name === currentUserName)
            return (
              <div key={c.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: isMe ? '#e8f0fe' : ORANGE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: isMe ? BLUE : ORANGE, flexShrink: 0 }}>{c.user_name?.slice(0,2).toUpperCase()}</div>
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, textAlign: isMe ? 'right' : 'left' }}>{c.user_name} · {formatTime(c.created_at)}</div>
                  <div style={{ background: isMe ? '#e8f0fe' : 'var(--surface2)', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '7px 11px', fontSize: 13, color: 'var(--text)' }}>{c.body}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={newComment} onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() } }}
          placeholder="Add a comment… (Enter to send)" style={{ flex: 1, fontSize: 13 }} />
        <button className="btn btn-primary" onClick={postComment} disabled={posting || !newComment.trim()} style={{ flexShrink: 0, padding: '0 14px' }}>
          {posting ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

function MiniCalendar({ tasks, onDayClick }) {
  const [cal, setCal] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() } })
  const today = new Date()
  const firstDay = new Date(cal.year, cal.month, 1).getDay()
  const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate()
  const monthName = new Date(cal.year, cal.month).toLocaleString('default', { month: 'long', year: 'numeric' })
  const tasksByDay = {}
  tasks.forEach(t => {
    if (!t.deadline) return
    const d = new Date(t.deadline + 'T12:00:00')
    if (d.getFullYear() === cal.year && d.getMonth() === cal.month) {
      const key = d.getDate(); tasksByDay[key] = (tasksByDay[key] || 0) + 1
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prev} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text2)', padding: '0 4px' }}>‹</button>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{monthName}</div>
        <button onClick={next} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text2)', padding: '0 4px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const count = tasksByDay[d] || 0
          const today_ = isToday(d)
          return (
            <div key={d} onClick={() => count > 0 && onDayClick(cal.year, cal.month, d)}
              style={{ textAlign: 'center', borderRadius: 6, padding: '3px 0', cursor: count > 0 ? 'pointer' : 'default', background: today_ ? BLUE : 'transparent', border: count > 0 && !today_ ? `1px solid ${ORANGE}` : '1px solid transparent', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (count > 0 && !today_) e.currentTarget.style.background = ORANGE_LIGHT }}
              onMouseLeave={e => { if (!today_) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ fontSize: 11, fontWeight: today_ ? 700 : 400, color: today_ ? 'white' : 'var(--text)' }}>{d}</div>
              {count > 0 && <div style={{ width: 14, height: 14, borderRadius: '50%', background: today_ ? 'white' : ORANGE, color: today_ ? BLUE : 'white', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1px auto 0' }}>{count}</div>}
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>Highlighted days have tasks due</div>
    </div>
  )
}

function TaskModal({ task, onClose, onUpdate, currentUserId, currentUserName }) {
  const [localTask, setLocalTask] = useState(task)
  const [saving, setSaving] = useState(false)
  const { toast } = useAppStore()
  const statusStyle = (s) => ({ todo: { background: '#f1f1f1', color: '#555' }, in_progress: { background: ORANGE_LIGHT, color: ORANGE }, done: { background: '#e8f5e9', color: '#2e7d32' } }[s] || {})
  const cycleStatus = async () => {
    const next = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    const newStatus = next[localTask.status]
    await sb.from('tasks').update({ status: newStatus }).eq('id', localTask.id)
    const updated = { ...localTask, status: newStatus }
    setLocalTask(updated); onUpdate(updated)
  }
  const updateProgress = async (val) => {
    await sb.from('tasks').update({ progress: val }).eq('id', localTask.id)
    const updated = { ...localTask, progress: val }
    setLocalTask(updated); onUpdate(updated)
  }
  const saveNotes = async () => {
    setSaving(true)
    await sb.from('tasks').update({ notes: localTask.notes }).eq('id', localTask.id)
    onUpdate(localTask); setSaving(false); toast('Notes saved!')
  }
  const color = progressColor(localTask.progress || 0)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 17, flex: 1, paddingRight: 12, lineHeight: 1.3 }}>{localTask.title}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text3)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={cycleStatus} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600, border: 'none', cursor: 'pointer', ...statusStyle(localTask.status) }}>{localTask.status.replace('_', ' ')} ↻</button>
          <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: '#e8f0fe', color: BLUE, fontWeight: 600 }}>{localTask.progress || 0}% complete</span>
          {localTask.deadline && <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text3)', fontWeight: 500 }}>📅 Due {localTask.deadline}</span>}
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
          <ProgressTape progress={localTask.progress || 0} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {[0, 25, 50, 75, 100].map(val => (
              <button key={val} onClick={() => updateProgress(val)}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${(localTask.progress||0) === val ? color : 'var(--border)'}`, background: (localTask.progress||0) === val ? color : 'transparent', color: (localTask.progress||0) === val ? 'white' : 'var(--text2)', cursor: 'pointer', fontWeight: (localTask.progress||0) === val ? 600 : 400, transition: 'all 0.15s' }}>
                {val}%
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start date</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{localTask.start_date || '—'}</div>
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadline</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{localTask.deadline || '—'}</div>
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>📝 Notes</div>
          <textarea rows={3} style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box', fontSize: 13 }}
            value={localTask.notes || ''} onChange={e => setLocalTask({ ...localTask, notes: e.target.value })} placeholder="Add notes about this task…" />
          <button className="btn btn-primary" style={{ marginTop: 6, fontSize: 12, padding: '5px 14px' }} onClick={saveNotes} disabled={saving}>{saving ? 'Saving…' : 'Save notes'}</button>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 16 }} />
        <TaskComments taskId={localTask.id} currentUserId={currentUserId} currentUserName={currentUserName} assignedTo={localTask.assigned_to} />
      </div>
    </div>
  )
}

function MyTasks({ userId, isAdmin, isOwnerAdmin, userName }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [calDayPopup, setCalDayPopup] = useState(null)
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

  useEffect(() => { load() }, [userId, isOwnerAdmin])

  async function load() {
    try {
      let query = sb.from('tasks').select('*').order('deadline', { ascending: true, nullsFirst: false })
      if (!isOwnerAdmin && userId) query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      const { data, error } = await query
      if (error) console.error('Load tasks error:', error)
      setTasks(data || [])
    } catch(e) { console.error(e) }
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
  }

  const addTask = async () => {
    if (!newTask.title.trim()) { toast('Please enter a task title.'); return }
    setSaving(true)
    try {
      const payload = { title: newTask.title, start_date: newTask.start_date || null, deadline: newTask.deadline || null, notes: newTask.notes || '', status: 'todo', progress: 0, is_meeting_task: false }
      if (userId) { payload.assigned_to = userId; payload.created_by = userId }
      const { data, error } = await sb.from('tasks').insert(payload).select().single()
      if (error) throw error
      if (data) setTasks(prev => [...prev, data])
      setNewTask({ title: '', start_date: '', deadline: '', notes: '' })
      setShowAddTask(false); toast('Task added!')
    } catch (err) { toast('Could not add task: ' + (err?.message || 'Check tasks table')) }
    setSaving(false)
  }

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
  const statusStyle = (s) => ({ todo: { background: '#f1f1f1', color: '#555' }, in_progress: { background: ORANGE_LIGHT, color: ORANGE }, done: { background: '#e8f5e9', color: '#2e7d32' } }[s] || {})
  const tasksOnDay = (year, month, day) => tasks.filter(t => {
    if (!t.deadline) return false
    const d = new Date(t.deadline + 'T12:00:00')
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  })

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>
      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={updated => { setTasks(tasks.map(t => t.id === updated.id ? updated : t)); setSelectedTask(updated) }} currentUserId={userId} currentUserName={userName} />}

      {calDayPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Tasks due {new Date(calDayPopup.year, calDayPopup.month, calDayPopup.day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              <button onClick={() => setCalDayPopup(null)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            {tasksOnDay(calDayPopup.year, calDayPopup.month, calDayPopup.day).map(task => (
              <div key={task.id} onClick={() => { setCalDayPopup(null); setSelectedTask(task) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--surface2)', cursor: 'pointer' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: progressColor(task.progress||0), flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</div>
                  {desktop && task.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{task.notes}</div>}
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
                {desktop && <span style={{ fontSize: 11, color: progressColor(task.progress||0), fontWeight: 600 }}>{task.progress||0}%</span>}
              </div>
            ))}
            <button className="btn" style={{ marginTop: 16 }} onClick={() => setCalDayPopup(null)}>Close</button>
          </div>
        </div>
      )}

      {showAddTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Add new task</div>
              <button onClick={() => setShowAddTask(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div className="field"><label>Task title *</label><input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="What needs to be done?" autoFocus /></div>
            <div className="grid-2">
              <div className="field"><label>Start date</label><input type="date" value={newTask.start_date} onChange={e => setNewTask({ ...newTask, start_date: e.target.value })} /></div>
              <div className="field"><label>Deadline</label><input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} /></div>
            </div>
            <div className="field"><label>Notes</label><textarea rows={2} style={{ resize: 'vertical' }} value={newTask.notes} onChange={e => setNewTask({ ...newTask, notes: e.target.value })} placeholder="Optional notes…" /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={addTask} disabled={saving}>{saving ? 'Adding…' : 'Add task'}</button>
              <button className="btn" onClick={() => setShowAddTask(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ label: 'Total', value: tasks.length, color: 'var(--text)' }, { label: 'Done', value: done, color: '#2e7d32' }, { label: 'Progress', value: `${pct}%`, color: BLUE }].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: desktop ? '10px 16px' : '8px 12px' }}>
              {desktop && <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{s.label}</div>}
              <div style={{ fontSize: desktop ? 20 : 16, fontWeight: 600, color: s.color }}>{s.value}</div>
              {!desktop && <div style={{ fontSize: 9, color: 'var(--text3)' }}>{s.label}</div>}
            </div>
          ))}
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddTask(true)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>+</span>{desktop ? ' Add task' : ''}
          </button>
        )}
      </div>

      <div style={{ marginBottom: 20 }}><ProgressTape progress={pct} /></div>

      <div style={{ display: desktop ? 'grid' : 'block', gridTemplateColumns: desktop ? '1fr 220px' : undefined, gap: 20 }}>
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {tasks.length === 0
              ? <div style={{ padding: 24, color: 'var(--text3)', fontSize: 14, textAlign: 'center' }}>No tasks yet.{isAdmin && <span onClick={() => setShowAddTask(true)} style={{ color: BLUE, cursor: 'pointer', marginLeft: 6 }}>Add one →</span>}</div>
              : tasks.map(task => {
                const tColor = progressColor(task.progress || 0)
                return (
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
                      <div style={{ height: 3, background: '#e8e8e8', borderRadius: 99, marginTop: 4, overflow: 'hidden', maxWidth: 120 }}>
                        <div style={{ height: '100%', width: `${task.progress || 0}%`, background: tColor, borderRadius: 99, transition: 'width 0.3s' }} />
                      </div>
                      {desktop && task.deadline && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Due {task.deadline}</div>}
                    </div>
                    {task.notes && <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>📝</span>}
                    {desktop && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, flexShrink: 0, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>}
                    <ProgressCircle progress={task.progress || 0} onChange={val => updateProgress(task, val)} />
                  </div>
                )
              })
            }
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Click a task to view details & comments · Click circle to update progress</div>
        </div>
        <div style={{ marginTop: desktop ? 0 : 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Deadline calendar</div>
          <MiniCalendar tasks={tasks} onDayClick={(y, m, d) => setCalDayPopup({ year: y, month: m, day: d })} />
        </div>
      </div>
    </div>
  )
}

function Team() {
  const [staffUsers, setStaffUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([
      sb.from('users').select('id, name, role').eq('role', 'user').eq('is_active', true).order('name'),
      sb.from('tasks').select('*')
    ]).then(([{ data: u }, { data: t }]) => { setStaffUsers(u || []); setTasks(t || []); setLoading(false) })
  }, [])
  const userTasks = (uid) => tasks.filter(t => t.assigned_to === uid)
  const doneTasks = (uid) => tasks.filter(t => t.assigned_to === uid && t.status === 'done').length
  const pct = (uid) => { const tot = userTasks(uid).length; return tot ? Math.round((doneTasks(uid) / tot) * 100) : 0 }
  const statusStyle = (s) => ({ todo: { background: '#f1f1f1', color: '#555' }, in_progress: { background: ORANGE_LIGHT, color: ORANGE }, done: { background: '#e8f5e9', color: '#2e7d32' } }[s] || {})
  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (staffUsers.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No staff members found.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {staffUsers.map(user => {
        const uPct = pct(user.id)
        return (
          <div key={user.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: ORANGE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: ORANGE, flexShrink: 0 }}>{user.name?.slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Staff · {userTasks(user.id).length} tasks · {doneTasks(user.id)} done</div>
                <div style={{ height: 3, background: '#e8e8e8', borderRadius: 99, marginTop: 4, overflow: 'hidden', maxWidth: 140 }}><div style={{ height: '100%', width: `${uPct}%`, background: progressColor(uPct), borderRadius: 99 }} /></div>
              </div>
              <span style={{ fontSize: 13, color: progressColor(uPct), fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{uPct}%</span>
            </div>
            {userTasks(user.id).length === 0
              ? <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text3)' }}>No tasks assigned.</div>
              : userTasks(user.id).map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--surface2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: progressColor(task.progress||0), flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: task.status === 'done' ? 'var(--text3)' : 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                  <span style={{ fontSize: 11, color: progressColor(task.progress||0), fontWeight: 500 }}>{task.progress||0}%</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
                </div>
              ))
            }
          </div>
        )
      })}
    </div>
  )
}

function Meetings({ userId, isAdmin }) {
  const [meetings, setMeetings] = useState([])
  const [tasks, setTasks] = useState([])
  const [staffUsers, setStaffUsers] = useState([])
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
      sb.from('users').select('id, name').eq('role', 'user').eq('is_active', true).order('name'),
    ]).then(([{ data: m }, { data: t }, { data: u }]) => {
      setMeetings(m || []); setTasks(t || []); setStaffUsers(u || [])
      if (m?.length) { setActiveMeeting(m[0]); setNotes(m[0].notes || '') }
      setLoading(false)
    })
  }, [])
  const staffMap = {}; staffUsers.forEach(u => { staffMap[u.id] = u.name })
  const createMeeting = async () => {
    const payload = { date: new Date().toISOString().split('T')[0], notes: '' }
    if (userId) payload.created_by = userId
    const { data } = await sb.from('meetings').insert(payload).select().single()
    if (data) { setMeetings([data, ...meetings]); setActiveMeeting(data); setNotes('') }
  }
  const saveNotes = async () => {
    setSaving(true)
    await sb.from('meetings').update({ notes }).eq('id', activeMeeting.id)
    setMeetings(meetings.map(m => m.id === activeMeeting.id ? { ...m, notes } : m))
    setSaving(false); toast('Notes saved!')
  }
  const addTask = async (e) => {
    e.preventDefault()
    const payload = { ...newTask, meeting_id: activeMeeting.id, is_meeting_task: true, status: 'todo' }
    if (userId) payload.created_by = userId
    const { data } = await sb.from('tasks').insert(payload).select().single()
    if (data) {
      setTasks([...tasks, data])
      if (newTask.assigned_to) await sendNotification(newTask.assigned_to, 'meeting_added', 'New meeting task assigned', `Task: ${newTask.title}`, data.id)
    }
    setNewTask({ title: '', assigned_to: '', start_date: '', deadline: '' }); setShowNewTask(false)
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
        {!activeMeeting ? <div style={{ fontSize: 14, color: 'var(--text3)' }}>Select or create a meeting.</div> : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{new Date(activeMeeting.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              {isAdmin && <button className="btn btn-sm btn-primary" onClick={() => setShowNewTask(!showNewTask)}>+ Add task</button>}
            </div>
            {showNewTask && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div className="field"><label>Task title</label><input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title" required /></div>
                <div className="field"><label>Assign to (staff)</label>
                  <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} required>
                    <option value="">— Select staff member —</option>
                    {staffUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
                    <button onClick={() => toggleStatus(task)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.status === 'done' ? '#2e7d32' : 'var(--border)'}`, background: task.status === 'done' ? '#2e7d32' : 'transparent', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {task.status === 'done' && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{staffMap[task.assigned_to] || '—'} · {task.start_date} → {task.deadline}</div>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...statusStyle(task.status) }}>{task.status.replace('_', ' ')}</span>
                  </div>
                ))
              }
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Meeting notes</div>
              <textarea rows={4} style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes for this meeting..." />
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={saveNotes} disabled={saving}>{saving ? 'Saving…' : 'Save notes'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AssignOthers({ userId }) {
  const [staffUsers, setStaffUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState({ title: '', assigned_to: '', start_date: '', deadline: '', is_meeting_task: false })
  const [saving, setSaving] = useState(false)
  const { toast } = useAppStore()
  useEffect(() => {
    Promise.all([
      sb.from('users').select('id, name').eq('role', 'user').eq('is_active', true).order('name'),
      sb.from('tasks').select('*').order('created_at', { ascending: false })
    ]).then(([{ data: u }, { data: t }]) => { setStaffUsers(u || []); setTasks(t || []); setLoading(false) })
  }, [])
  const staffMap = {}; staffUsers.forEach(u => { staffMap[u.id] = u.name })
  const createTask = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...newTask, status: 'todo', progress: 0 }
      if (userId) payload.created_by = userId
      const { data, error } = await sb.from('tasks').insert(payload).select().single()
      if (error) throw error
      if (data) {
        setTasks([data, ...tasks])
        if (newTask.assigned_to) await sendNotification(newTask.assigned_to, 'task_assigned', 'You have a new task', `Task: ${newTask.title}`, data.id)
      }
      setNewTask({ title: '', assigned_to: '', start_date: '', deadline: '', is_meeting_task: false })
      toast('Task created!')
    } catch(err) { toast('Error: ' + (err?.message || 'Could not create task')) }
    setSaving(false)
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
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Create & assign a task</div>
        <div className="field"><label>Task title</label><input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title" required /></div>
        <div className="field"><label>Assign to (staff)</label>
          <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} required>
            <option value="">— Select staff member —</option>
            {staffUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="grid-2">
          <div className="field"><label>Start date</label><input type="date" value={newTask.start_date} onChange={e => setNewTask({ ...newTask, start_date: e.target.value })} required /></div>
          <div className="field"><label>Deadline</label><input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} required /></div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={newTask.is_meeting_task} onChange={e => setNewTask({ ...newTask, is_meeting_task: e.target.checked })} /> This is a meeting task
        </label>
        <button className="btn btn-primary" onClick={createTask} disabled={saving}>{saving ? 'Creating…' : 'Create & assign task'}</button>
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>All tasks ({tasks.length})</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {tasks.length === 0 ? <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text3)' }}>No tasks yet.</div>
            : tasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--surface2)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{staffMap[task.assigned_to] || 'Unassigned'} · {task.start_date} → {task.deadline}{task.is_meeting_task && <span style={{ color: BLUE, marginLeft: 8 }}>meeting task</span>}</div>
                  <div style={{ height: 3, background: '#e8e8e8', borderRadius: 99, overflow: 'hidden', maxWidth: 100 }}><div style={{ height: '100%', width: `${task.progress||0}%`, background: progressColor(task.progress||0), borderRadius: 99 }} /></div>
                </div>
                <span style={{ fontSize: 11, color: progressColor(task.progress||0), fontWeight: 600 }}>{task.progress||0}%</span>
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

function Chat({ userId }) {
  const [messages, setMessages] = useState([])
  const [staffMap, setStaffMap] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  useEffect(() => {
    Promise.all([
      sb.from('users').select('id, name, role').in('role', ['user', 'admin']).eq('is_active', true),
      sb.from('messages').select('*').order('sent_at', { ascending: true })
    ]).then(([{ data: u }, { data: m }]) => {
      const map = {}; (u || []).forEach(user => map[user.id] = user)
      setStaffMap(map); setMessages(m || []); setLoading(false)
    })
    const channel = sb.channel('pm_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()
    return () => sb.removeChannel(channel)
  }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const payload = { body: newMessage.trim() }
    if (userId) payload.sender_id = userId
    await sb.from('messages').insert(payload)
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
          const sender = staffMap[msg.sender_id]
          return (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: ORANGE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: ORANGE, flexShrink: 0 }}>{sender?.name?.slice(0, 2).toUpperCase() || 'A'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2, maxWidth: '70%' }}>
                {!isMe && <span style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 4 }}>{sender?.name || 'Staff'}</span>}
                <div style={{ padding: '8px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? BLUE : 'var(--surface2)', color: isMe ? 'white' : 'var(--text)', fontSize: 14 }}>{msg.body}</div>
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

export function NotificationPrefs({ userId }) {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useAppStore()
  useEffect(() => { if (userId) load() }, [userId])
  async function load() {
    const { data } = await sb.from('notification_prefs').select('*').eq('user_id', userId).maybeSingle()
    setPrefs(data || { task_comment: true, task_assigned: true, meeting_added: true, email_task_comment: false, email_task_assigned: false, email_meeting_added: false })
    setLoading(false)
  }
  async function save() {
    setSaving(true)
    await sb.from('notification_prefs').upsert({ ...prefs, user_id: userId })
    toast('Notification preferences saved ✓')
    setSaving(false)
  }
  if (!userId) return <div style={{ fontSize: 13, color: 'var(--text3)' }}>Log in to manage notification preferences.</div>
  if (loading) return <div style={{ padding: 16 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  const events = [
    { key: 'task_comment', label: 'New comment on my task' },
    { key: 'task_assigned', label: 'Task assigned to me' },
    { key: 'meeting_added', label: 'New meeting task assigned' },
  ]
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>🔔 Notification Preferences</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Choose how you want to be notified for each event.</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', padding: '10px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Event</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>In-app 🔔</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Email 📧</div>
        </div>
        {events.map(ev => (
          <div key={ev.key} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', padding: '14px 16px', borderBottom: '1px solid var(--surface2)', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.label}</div>
            <div style={{ textAlign: 'center' }}><input type="checkbox" checked={!!prefs[ev.key]} onChange={e => setPrefs({ ...prefs, [ev.key]: e.target.checked })} style={{ width: 'auto', cursor: 'pointer', transform: 'scale(1.2)' }} /></div>
            <div style={{ textAlign: 'center' }}><input type="checkbox" checked={!!prefs[`email_${ev.key}`]} onChange={e => setPrefs({ ...prefs, [`email_${ev.key}`]: e.target.checked })} style={{ width: 'auto', cursor: 'pointer', transform: 'scale(1.2)' }} /></div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Email notifications require email setup — contact your admin to configure.</div>
      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
    </div>
  )
}

export default function PM() {
  const { session } = useAppStore()
  const [activeTab, setActiveTab] = useState('tasks')
  const userId = session?.userId
  const isOwnerAdmin = !userId
  const isAdmin = session?.role === 'admin' || session?.role === 'user'
  const userName = session?.username || 'Staff'
  const tabs = [
    { key: 'tasks', label: 'My Tasks' },
    { key: 'team', label: 'Team' },
    { key: 'meetings', label: 'Meetings' },
    { key: 'chat', label: 'Chat' },
    { key: 'notifs', label: '🔔 Notifications' },
    ...(session?.role === 'admin' ? [{ key: 'assign', label: 'Assign others' }] : [])
  ]
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px' }}>Project Management</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>ICT — Staff workspace</div>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 16px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: activeTab === t.key ? BLUE : 'var(--text2)', borderBottom: `2px solid ${activeTab === t.key ? BLUE : 'transparent'}`, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === 'tasks'  && <MyTasks userId={userId} isAdmin={isAdmin} isOwnerAdmin={isOwnerAdmin} userName={userName} />}
      {activeTab === 'team'   && <Team />}
      {activeTab === 'meetings' && <Meetings userId={userId} isAdmin={isAdmin} />}
      {activeTab === 'chat'   && <Chat userId={userId} />}
      {activeTab === 'notifs' && <NotificationPrefs userId={userId} />}
      {activeTab === 'assign' && session?.role === 'admin' && <AssignOthers userId={userId} />}
    </div>
  )
}
