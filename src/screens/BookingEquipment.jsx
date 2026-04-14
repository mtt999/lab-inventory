import { useState, useEffect, useRef, useCallback } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

function canEdit(s) { return s?.role === 'admin' || s?.role === 'user' }
function isAdmin(s) { return s?.role === 'admin' }

// ── Date helpers ──────────────────────────────────────────────
function startOfWeek(d) {
  const dt = new Date(d)
  const day = dt.getDay()
  dt.setDate(dt.getDate() - day)
  dt.setHours(0, 0, 0, 0)
  return dt
}
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt }
function addMonths(d, n) { const dt = new Date(d); dt.setMonth(dt.getMonth() + n); return dt }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function sameDay(a, b) { return a.toDateString() === b.toDateString() }
function fmt(d, opts) { return new Date(d).toLocaleDateString('en-US', opts) }
function fmtTime(d) { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
function fmtDateTime(d) { return `${fmt(d, { month: 'short', day: 'numeric' })} ${fmtTime(d)}` }

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const statusColor = { confirmed: '#1e4d39', pending: '#92400e', denied: '#a32d2d', cancelled: '#5f5e5a' }
const statusBg = { confirmed: '#e8f2ee', pending: '#fef3c7', denied: '#fcebeb', cancelled: '#f1efe8' }

// ── Booking Form Modal ────────────────────────────────────────
function BookingModal({ booking, equipmentList, selectedEquipment, session, onSave, onClose }) {
  const { toast } = useAppStore()
  const [form, setForm] = useState({
    equipment_id: booking?.equipment_id || selectedEquipment?.id || '',
    title: booking?.title || '',
    start_time: booking?.start_time ? new Date(booking.start_time).toISOString().slice(0,16) : (initialSlot?.start || ''),
    end_time: booking?.end_time ? new Date(booking.end_time).toISOString().slice(0,16) : (initialSlot?.end || ''),
    notes: booking?.notes || '',
    booked_on_behalf_of: booking?.booked_on_behalf_of || '',
  })
  const [students, setStudents] = useState([])
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(null)

  useEffect(() => {
    if (isAdmin(session)) {
      sb.from('users').select('id, name').eq('is_active', true).neq('role', 'admin').order('name')
        .then(({ data }) => setStudents(data || []))
    }
  }, [])

  useEffect(() => { if (form.equipment_id && form.start_time && form.end_time) checkConflict() }, [form.equipment_id, form.start_time, form.end_time])

  async function checkConflict() {
    const { data } = await sb.from('equipment_bookings')
      .select('*').eq('equipment_id', form.equipment_id)
      .neq('status', 'cancelled').neq('status', 'denied')
      .lt('start_time', form.end_time).gt('end_time', form.start_time)
    const conflicts = (data || []).filter(b => b.id !== booking?.id)
    setConflict(conflicts.length > 0 ? conflicts[0] : null)
  }

  async function save() {
    if (!form.equipment_id) { toast('Select equipment.'); return }
    if (!form.start_time || !form.end_time) { toast('Please drag on the calendar to select a time slot.'); return }
    if (conflict) { toast('This time slot conflicts with an existing booking.'); return }
    setSaving(true)
    // Check if equipment requires approval for this user
    const { data: settings } = await sb.from('equipment_booking_settings')
      .select('requires_approval').eq('equipment_id', form.equipment_id).single()
    const requiresApproval = settings?.requires_approval && !isAdmin(session)
    const payload = {
      equipment_id: form.equipment_id,
      user_id: session.userId,
      user_name: session.username,
      title: form.title || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      notes: form.notes || null,
      status: requiresApproval ? 'pending' : 'confirmed',
      requires_approval: !!requiresApproval,
      created_by: session.username,
      booked_on_behalf_of: form.booked_on_behalf_of || null,
      updated_at: new Date().toISOString(),
    }
    if (booking) {
      await sb.from('equipment_bookings').update(payload).eq('id', booking.id)
      toast('Booking updated ✓')
    } else {
      await sb.from('equipment_bookings').insert(payload)
      toast(requiresApproval ? 'Booking submitted — pending approval.' : 'Booking confirmed ✓')
    }
    setSaving(false); onSave(); onClose()
  }

  const eq = equipmentList.find(e => e.id === form.equipment_id)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 480, width: '100%', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>{booking ? 'Edit booking' : 'New booking'}</div>

        <div className="field"><label>Equipment *</label>
          <select value={form.equipment_id} onChange={e => setForm(f => ({ ...f, equipment_id: e.target.value }))}>
            <option value="">— Select equipment —</option>
            {equipmentList.map(e => <option key={e.id} value={e.id}>{e.nickname || e.equipment_name}</option>)}
          </select>
        </div>

        {isAdmin(session) && (
          <div className="field"><label>Book on behalf of (optional)</label>
            <select value={form.booked_on_behalf_of} onChange={e => setForm(f => ({ ...f, booked_on_behalf_of: e.target.value }))}>
              <option value="">— Myself (Admin) —</option>
              {students.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Read-only time info from drag selection */}
        {form.start_time && form.end_time && (
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>📅 Selected time</div>
            <div style={{ color: 'var(--text2)' }}>
              <span style={{ fontFamily: 'var(--mono)' }}>{fmtDateTime(form.start_time)}</span>
              <span style={{ margin: '0 8px', color: 'var(--text3)' }}>→</span>
              <span style={{ fontFamily: 'var(--mono)' }}>{fmtDateTime(form.end_time)}</span>
            </div>
          </div>
        )}

        <div className="field"><label>Title / Purpose (optional)</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Asphalt mix design testing" />
        </div>

        {conflict && (
          <div style={{ background: '#fcebeb', border: '1px solid #f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#a32d2d' }}>
            ⚠️ Conflict with <strong>{conflict.user_name}</strong>'s booking ({fmtDateTime(conflict.start_time)} – {fmtDateTime(conflict.end_time)})
          </div>
        )}

        <div className="field"><label>Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving || !!conflict}>{saving ? 'Saving…' : booking ? 'Update' : 'Book'}</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Week View Calendar ────────────────────────────────────────
function WeekView({ weekStart, bookings, selectedEquipment, onSlotClick, onBookingClick, session }) {
  const [drag, setDrag] = useState(null)
  const gridRef = useRef(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function getBookingsForSlot(day, hour) {
    return bookings.filter(b => {
      const start = new Date(b.start_time)
      const end = new Date(b.end_time)
      const slotStart = new Date(day); slotStart.setHours(hour, 0, 0, 0)
      const slotEnd = new Date(day); slotEnd.setHours(hour + 1, 0, 0, 0)
      return start < slotEnd && end > slotStart
    })
  }

  function handleMouseDown(day, hour) {
    const start = new Date(day); start.setHours(hour, 0, 0, 0)
    setDrag({ startDay: day, startHour: hour, endHour: hour, start })
  }

  function handleMouseEnter(hour) {
    if (drag) setDrag(d => ({ ...d, endHour: Math.max(d.startHour, hour) }))
  }

  function handleMouseUp(day, hour) {
    if (!drag) return
    const start = new Date(day); start.setHours(drag.startHour, 0, 0, 0)
    const end = new Date(day); end.setHours(Math.max(drag.startHour, hour) + 1, 0, 0, 0)
    setDrag(null)
    onSlotClick({ start: start.toISOString().slice(0,16), end: end.toISOString().slice(0,16) })
  }

  const today = new Date()

  return (
    <div style={{ overflowX: 'auto', userSelect: 'none' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', minWidth: 600 }}>
        {/* Header */}
        <div style={{ height: 44 }} />
        {days.map((day, i) => (
          <div key={i} style={{ height: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 12, borderBottom: '1px solid var(--border)', background: sameDay(day, today) ? 'var(--accent-light)' : 'var(--surface)' }}>
            <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{DAYS[day.getDay()]}</div>
            <div style={{ fontWeight: sameDay(day, today) ? 700 : 500, fontSize: 14, color: sameDay(day, today) ? 'var(--accent)' : 'var(--text)' }}>{day.getDate()}</div>
          </div>
        ))}

        {/* Time rows */}
        {HOURS.map(hour => (
          <>
            <div key={`h${hour}`} style={{ height: 48, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 2, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', borderTop: '1px solid var(--surface2)' }}>
              {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`}
            </div>
            {days.map((day, di) => {
              const isDragging = drag && sameDay(day, drag.startDay) && hour >= drag.startHour && hour <= drag.endHour
              // Only render booking block at its START hour
              const startingBookings = bookings.filter(b => {
                const s = new Date(b.start_time)
                return sameDay(s, day) && s.getHours() === hour
              })
              return (
                <div key={`${hour}-${di}`}
                  style={{ height: 48, borderTop: '1px solid var(--surface2)', borderLeft: '1px solid var(--surface2)', position: 'relative', background: isDragging ? 'var(--accent-light)' : 'transparent', cursor: 'pointer' }}
                  onMouseDown={() => handleMouseDown(day, hour)}
                  onMouseEnter={() => handleMouseEnter(hour)}
                  onMouseUp={() => handleMouseUp(day, hour)}>
                  {startingBookings.map(b => {
                    const startH = new Date(b.start_time)
                    const endH = new Date(b.end_time)
                    // Clamp to end of visible day
                    const dayEnd = new Date(day); dayEnd.setHours(24, 0, 0, 0)
                    const durationMins = Math.min((endH - startH), (dayEnd - startH)) / 60000
                    const topOffset = (startH.getMinutes() / 60) * 48
                    const height = Math.max(20, (durationMins / 60) * 48 - 2)
                    return (
                      <div key={b.id} onClick={e => { e.stopPropagation(); onBookingClick(b) }}
                        style={{ position: 'absolute', left: 2, right: 2, top: topOffset, height, background: statusBg[b.status], border: `1px solid ${statusColor[b.status]}40`, borderLeft: `3px solid ${statusColor[b.status]}`, borderRadius: 4, padding: '2px 4px', fontSize: 10, overflow: 'hidden', zIndex: 2, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, color: statusColor[b.status], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.booked_on_behalf_of || b.user_name}
                        </div>
                        {height > 30 && b.title && <div style={{ color: statusColor[b.status], opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>}
                        {height > 44 && <div style={{ color: statusColor[b.status], opacity: 0.6, fontSize: 9 }}>{fmtTime(b.start_time)}–{fmtTime(b.end_time)}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

// ── Month View Calendar ───────────────────────────────────────
function MonthView({ monthDate, bookings, onDayClick, onBookingClick }) {
  const start = startOfMonth(monthDate)
  const end = endOfMonth(monthDate)
  const gridStart = startOfWeek(start)
  const days = []
  let cur = new Date(gridStart)
  while (cur <= end || days.length % 7 !== 0) {
    days.push(new Date(cur))
    cur = addDays(cur, 1)
  }
  const today = new Date()

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--mono)', borderBottom: '1px solid var(--border)' }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === monthDate.getMonth()
          const isToday = sameDay(day, today)
          const dayBookings = bookings.filter(b => sameDay(new Date(b.start_time), day))
          return (
            <div key={i} onClick={() => onDayClick(day)}
              style={{ minHeight: 80, padding: '4px 6px', border: '0.5px solid var(--border)', background: isToday ? 'var(--accent-light)' : isCurrentMonth ? 'var(--surface)' : 'var(--surface2)', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = isCurrentMonth ? 'var(--surface)' : 'var(--surface2)' }}>
              <div style={{ fontWeight: isToday ? 700 : 400, fontSize: 13, color: isToday ? 'var(--accent)' : isCurrentMonth ? 'var(--text)' : 'var(--text3)', marginBottom: 2 }}>{day.getDate()}</div>
              {dayBookings.slice(0, 3).map(b => (
                <div key={b.id} onClick={e => { e.stopPropagation(); onBookingClick(b) }}
                  style={{ fontSize: 10, background: statusBg[b.status], color: statusColor[b.status], borderRadius: 3, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {fmtTime(b.start_time)} {b.booked_on_behalf_of || b.user_name}
                </div>
              ))}
              {dayBookings.length > 3 && <div style={{ fontSize: 10, color: 'var(--text3)' }}>+{dayBookings.length - 3} more</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Booking Detail Modal ──────────────────────────────────────
function BookingDetail({ booking, equipment, session, onEdit, onDelete, onDeny, onClose, onApprove }) {
  const [denyReason, setDenyReason] = useState('')
  const [showDenyForm, setShowDenyForm] = useState(false)

  const eq = equipment
  const isOwn = booking.user_id === session.userId || booking.user_name === session.username

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 440, width: '100%', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{eq?.nickname || eq?.equipment_name || 'Equipment'}</div>
            <span style={{ background: statusBg[booking.status], color: statusColor[booking.status], borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{booking.status}</span>
          </div>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text3)' }}>Booked by: </span><strong>{booking.booked_on_behalf_of ? `${booking.booked_on_behalf_of} (via ${booking.user_name})` : booking.user_name}</strong></div>
          <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text3)' }}>Start: </span>{fmtDateTime(booking.start_time)}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text3)' }}>End: </span>{fmtDateTime(booking.end_time)}</div>
          {booking.title && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text3)' }}>Purpose: </span>{booking.title}</div>}
          {booking.notes && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text3)' }}>Notes: </span>{booking.notes}</div>}
          {booking.denied_reason && <div style={{ fontSize: 13, color: '#a32d2d' }}><span style={{ color: 'var(--text3)' }}>Denied: </span>{booking.denied_reason}</div>}
        </div>

        {/* Deny form */}
        {showDenyForm && (
          <div style={{ marginBottom: 16 }}>
            <div className="field"><label>Reason for denial (optional)</label>
              <textarea rows={2} value={denyReason} onChange={e => setDenyReason(e.target.value)} style={{ resize: 'vertical' }} placeholder="e.g. Equipment under maintenance" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-danger" onClick={() => onDeny(booking, denyReason)}>Confirm deny</button>
              <button className="btn btn-sm" onClick={() => setShowDenyForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(isOwn || isAdmin(session)) && booking.status !== 'cancelled' && (
            <button className="btn btn-sm" onClick={() => onEdit(booking)}>✏️ Edit</button>
          )}
          {isAdmin(session) && booking.status === 'pending' && (
            <button className="btn btn-sm btn-primary" onClick={() => onApprove(booking)}>✓ Approve</button>
          )}
          {isAdmin(session) && booking.status !== 'denied' && booking.status !== 'cancelled' && !showDenyForm && (
            <button className="btn btn-sm btn-danger" onClick={() => setShowDenyForm(true)}>✕ Deny</button>
          )}
          {(isOwn || isAdmin(session)) && booking.status !== 'cancelled' && (
            <button className="btn btn-sm" style={{ color: 'var(--accent2)' }} onClick={() => onDelete(booking)}>🗑 Cancel</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — BOOKING CALENDAR
// ══════════════════════════════════════════════════════════════
function BookingCalendar({ session }) {
  const { toast } = useAppStore()
  const [equipment, setEquipment] = useState([])
  const [selectedEq, setSelectedEq] = useState([])
  const [bookings, setBookings] = useState([])
  const [calView, setCalView] = useState('week')
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
  const [monthDate, setMonthDate] = useState(new Date())
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingDraft, setBookingDraft] = useState(null)
  const [editBooking, setEditBooking] = useState(null)
  const [detailBooking, setDetailBooking] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])

  useEffect(() => { loadEquipment(); loadNotifications() }, [])
  useEffect(() => { loadBookings() }, [selectedEq, weekStart, monthDate, calView])

  async function loadEquipment() {
    const { data } = await sb.from('equipment_inventory').select('id, equipment_name, nickname, category, location').eq('is_active', true).order('nickname')
    setEquipment(data || [])
    setLoading(false)
  }

  async function loadBookings() {
    let start, end
    if (calView === 'week') {
      start = weekStart.toISOString()
      end = addDays(weekStart, 7).toISOString()
    } else {
      start = startOfMonth(monthDate).toISOString()
      end = addDays(endOfMonth(monthDate), 1).toISOString()
    }
    let query = sb.from('equipment_bookings').select('*')
      .gte('start_time', start).lt('start_time', end)
      .order('start_time')
    // Filter by selected equipment if any selected
    if (selectedEq.length > 0) {
      query = query.in('equipment_id', selectedEq)
    }
    const { data } = await query
    setBookings(data || [])
  }

  async function loadNotifications() {
    if (!session.userId) return
    const { data } = await sb.from('booking_notifications').select('*')
      .eq('user_id', session.userId).eq('read', false)
    setNotifications(data || [])
  }

  async function dismissNotification(id) {
    await sb.from('booking_notifications').update({ read: true }).eq('id', id)
    loadNotifications()
  }

  function toggleEquipment(id) {
    setSelectedEq(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  function handleSlotClick(slot) {
    setBookingDraft(slot)
    setEditBooking(null)
    setShowBookingModal(true)
  }

  function handleDayClick(day) {
    const start = new Date(day); start.setHours(9, 0, 0, 0)
    const end = new Date(day); end.setHours(17, 0, 0, 0)
    setBookingDraft({ start: start.toISOString().slice(0,16), end: end.toISOString().slice(0,16) })
    setEditBooking(null)
    setShowBookingModal(true)
  }

  async function handleDeny(booking, reason) {
    await sb.from('equipment_bookings').update({ status: 'denied', denied_by: session.username, denied_reason: reason, updated_at: new Date().toISOString() }).eq('id', booking.id)
    // Create notification
    await sb.from('booking_notifications').insert({ booking_id: booking.id, user_id: booking.user_id, type: 'denied', message: `Your booking for ${equipment.find(e => e.id === booking.equipment_id)?.nickname || 'equipment'} on ${fmtDateTime(booking.start_time)} was denied.${reason ? ` Reason: ${reason}` : ''}` })
    toast('Booking denied.'); setDetailBooking(null); loadBookings()
  }

  async function handleApprove(booking) {
    await sb.from('equipment_bookings').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', booking.id)
    await sb.from('booking_notifications').insert({ booking_id: booking.id, user_id: booking.user_id, type: 'approved', message: `Your booking for ${equipment.find(e => e.id === booking.equipment_id)?.nickname || 'equipment'} on ${fmtDateTime(booking.start_time)} was approved.` })
    toast('Booking approved ✓'); setDetailBooking(null); loadBookings()
  }

  async function handleCancel(booking) {
    if (!confirm('Cancel this booking?')) return
    await sb.from('equipment_bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', booking.id)
    toast('Booking cancelled.'); setDetailBooking(null); loadBookings()
  }

  const filteredEq = equipment.filter(e => {
    const q = search.toLowerCase()
    return !q || [e.equipment_name, e.nickname, e.category, e.location].some(f => f?.toLowerCase().includes(q))
  })

  const categories = [...new Set(equipment.map(e => e.category).filter(Boolean))]

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* ── Left: equipment selector ── */}
      <div style={{ width: 220, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search…" style={{ width: '100%', fontSize: 12 }} />
        </div>
        {selectedEq.length > 0 && (
          <div style={{ padding: '6px 12px', background: 'var(--accent-light)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{selectedEq.length} selected</span>
            <button onClick={() => setSelectedEq([])} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, padding: 0 }}>Clear</button>
          </div>
        )}
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {loading ? <div style={{ padding: 16, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            : categories.map(cat => {
              const catItems = filteredEq.filter(e => (e.category || 'Other') === cat)
              if (catItems.length === 0) return null
              return (
                <div key={cat}>
                  <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--surface2)', borderBottom: '0.5px solid var(--border)' }}>{cat}</div>
                  {catItems.map(e => (
              <div key={e.id} onClick={() => toggleEquipment(e.id)}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid var(--surface2)', background: selectedEq.includes(e.id) ? 'var(--accent-light)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={ev => { if (!selectedEq.includes(e.id)) ev.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={ev => { if (!selectedEq.includes(e.id)) ev.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${selectedEq.includes(e.id) ? 'var(--accent)' : 'var(--border)'}`, background: selectedEq.includes(e.id) ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedEq.includes(e.id) && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: selectedEq.includes(e.id) ? 600 : 500, color: selectedEq.includes(e.id) ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.nickname || e.equipment_name}
                  </div>
                  {e.location && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{e.location}</div>}
                </div>
              </div>
            ))}
                </div>
              )
            })
          }
        </div>
      </div>

      {/* ── Right: calendar ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Notifications */}
        {notifications.map(n => (
          <div key={n.id} style={{ background: n.type === 'denied' ? '#fcebeb' : '#e8f2ee', border: `1px solid ${n.type === 'denied' ? '#f09595' : '#9FE1CB'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: n.type === 'denied' ? '#a32d2d' : '#1e4d39' }}>{n.type === 'denied' ? '✕' : '✓'} {n.message}</span>
            <button onClick={() => dismissNotification(n.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
          </div>
        ))}

        {/* Calendar toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => { if (calView === 'week') setWeekStart(d => addDays(d, -7)); else setMonthDate(d => addMonths(d, -1)) }}>←</button>
            <div style={{ fontWeight: 600, fontSize: 15, minWidth: 180, textAlign: 'center' }}>
              {calView === 'week'
                ? `${fmt(weekStart, { month: 'short', day: 'numeric' })} – ${fmt(addDays(weekStart, 6), { month: 'short', day: 'numeric', year: 'numeric' })}`
                : `${MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`
              }
            </div>
            <button className="btn btn-sm" onClick={() => { if (calView === 'week') setWeekStart(d => addDays(d, 7)); else setMonthDate(d => addMonths(d, 1)) }}>→</button>
            <button className="btn btn-sm" onClick={() => { setWeekStart(startOfWeek(new Date())); setMonthDate(new Date()) }} style={{ fontSize: 11 }}>Today</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-sm" style={{ background: calView === 'week' ? 'var(--accent-light)' : 'transparent', color: calView === 'week' ? 'var(--accent)' : 'var(--text2)', fontWeight: calView === 'week' ? 600 : 400 }} onClick={() => setCalView('week')}>Week</button>
            <button className="btn btn-sm" style={{ background: calView === 'month' ? 'var(--accent-light)' : 'transparent', color: calView === 'month' ? 'var(--accent)' : 'var(--text2)', fontWeight: calView === 'month' ? 600 : 400 }} onClick={() => setCalView('month')}>Month</button>
            <button className="btn btn-sm btn-primary" onClick={() => { setBookingDraft(null); setEditBooking(null); setShowBookingModal(true) }}>+ Book</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          {Object.entries(statusColor).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: statusBg[s], border: `1px solid ${c}` }} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        {selectedEq.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-icon">📅</div>
            <div>Select equipment from the left to view and book</div>
          </div>
        ) : calView === 'week' ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxHeight: 600, overflowY: 'auto' }}>
            <WeekView weekStart={weekStart} bookings={bookings} selectedEquipment={selectedEq} onSlotClick={handleSlotClick} onBookingClick={b => setDetailBooking(b)} session={session} />
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <MonthView monthDate={monthDate} bookings={bookings} onDayClick={handleDayClick} onBookingClick={b => setDetailBooking(b)} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showBookingModal && (
        <BookingModal
          booking={editBooking}
          equipmentList={selectedEq.length > 0 ? equipment.filter(e => selectedEq.includes(e.id)) : equipment}
          selectedEquipment={selectedEq.length === 1 ? equipment.find(e => e.id === selectedEq[0]) : null}
          session={session}
          onSave={loadBookings}
          onClose={() => { setShowBookingModal(false); setBookingDraft(null); setEditBooking(null) }}
          initialSlot={bookingDraft}
        />
      )}

      {detailBooking && (
        <BookingDetail
          booking={detailBooking}
          equipment={equipment.find(e => e.id === detailBooking.equipment_id)}
          session={session}
          onEdit={b => { setEditBooking(b); setDetailBooking(null); setShowBookingModal(true) }}
          onDelete={handleCancel}
          onDeny={handleDeny}
          onApprove={handleApprove}
          onClose={() => setDetailBooking(null)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — HISTORY & MAINTENANCE
// ══════════════════════════════════════════════════════════════
function BookingHistory({ session }) {
  const [bookings, setBookings] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterEq, setFilterEq] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: eq }, { data: bk }] = await Promise.all([
      sb.from('equipment_inventory').select('id, equipment_name, nickname').eq('is_active', true).order('nickname'),
      isAdmin(session)
        ? sb.from('equipment_bookings').select('*').order('start_time', { ascending: false }).limit(500)
        : sb.from('equipment_bookings').select('*').eq('user_id', session.userId).order('start_time', { ascending: false })
    ])
    setEquipment(eq || [])
    setBookings(bk || [])
    setLoading(false)
  }

  const filtered = bookings.filter(b => {
    const eq = equipment.find(e => e.id === b.equipment_id)
    const q = search.toLowerCase()
    return (!filterStatus || b.status === filterStatus)
      && (!filterEq || b.equipment_id === filterEq)
      && (!q || [b.user_name, b.title, eq?.nickname, eq?.equipment_name].some(f => f?.toLowerCase().includes(q)))
  })

  // Usage stats per equipment
  const usageStats = {}
  bookings.filter(b => b.status === 'confirmed').forEach(b => {
    const eq = equipment.find(e => e.id === b.equipment_id)
    const name = eq?.nickname || eq?.equipment_name || 'Unknown'
    if (!usageStats[name]) usageStats[name] = { count: 0, hours: 0 }
    usageStats[name].count++
    usageStats[name].hours += (new Date(b.end_time) - new Date(b.start_time)) / 3600000
  })

  return (
    <div>
      {/* Usage summary */}
      {Object.keys(usageStats).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>📊 Usage Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {Object.entries(usageStats).sort((a,b) => b[1].hours - a[1].hours).slice(0, 6).map(([name, stats]) => (
              <div key={name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>{Math.round(stats.hours)}h</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{stats.count} booking{stats.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search…" style={{ flex: 1, minWidth: 160 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All statuses</option>
          {['confirmed','pending','denied','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterEq} onChange={e => setFilterEq(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All equipment</option>
          {equipment.map(e => <option key={e.id} value={e.id}>{e.nickname || e.equipment_name}</option>)}
        </select>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon">📅</div>No bookings found.</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Equipment</th>
                  {isAdmin(session) && <th>User</th>}
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th>Status</th>
                  {isAdmin(session) && <th>Notes</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const eq = equipment.find(e => e.id === b.equipment_id)
                  const hours = Math.round((new Date(b.end_time) - new Date(b.start_time)) / 360000) / 10
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 500 }}>{eq?.nickname || eq?.equipment_name || '—'}</td>
                      {isAdmin(session) && <td>{b.booked_on_behalf_of || b.user_name}</td>}
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmtDateTime(b.start_time)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmtDateTime(b.end_time)}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{hours}h</td>
                      <td><span style={{ background: statusBg[b.status], color: statusColor[b.status], borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{b.status}</span></td>
                      {isAdmin(session) && <td style={{ color: 'var(--text3)', fontSize: 12 }}>{b.denied_reason || b.title || '—'}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — ADMIN SETTINGS
// ══════════════════════════════════════════════════════════════
function BookingSettings({ session }) {
  const { toast } = useAppStore()
  const [equipment, setEquipment] = useState([])
  const [settings, setSettings] = useState({})
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: eq }, { data: s }, { data: u }] = await Promise.all([
      sb.from('equipment_inventory').select('id, equipment_name, nickname').eq('is_active', true).order('nickname'),
      sb.from('equipment_booking_settings').select('*'),
      sb.from('users').select('id, name, role').eq('is_active', true).neq('role', 'admin').order('name'),
    ])
    setEquipment(eq || [])
    const map = {}; (s || []).forEach(r => map[r.equipment_id] = r); setSettings(map)
    setUsers(u || [])
    setLoading(false)
  }

  async function toggleBookable(eqId) {
    const cur = settings[eqId]
    if (cur) {
      await sb.from('equipment_booking_settings').update({ bookable: !cur.bookable }).eq('equipment_id', eqId)
    } else {
      await sb.from('equipment_booking_settings').insert({ equipment_id: eqId, bookable: false })
    }
    toast('Setting updated.'); load()
  }

  async function toggleRequireApproval(eqId) {
    const cur = settings[eqId]
    if (cur) {
      await sb.from('equipment_booking_settings').update({ requires_approval: !cur.requires_approval }).eq('equipment_id', eqId)
    } else {
      await sb.from('equipment_booking_settings').insert({ equipment_id: eqId, requires_approval: true })
    }
    toast('Setting updated.'); load()
  }

  if (!isAdmin(session)) return <div className="empty-state"><div className="empty-icon">🔒</div>Admin only.</div>

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Equipment Booking Settings</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Control which equipment can be booked and whether approval is required.</div>
      {loading ? <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 13 }}>
              <thead><tr><th>Equipment</th><th>Bookable</th><th>Requires Approval</th></tr></thead>
              <tbody>
                {equipment.map(e => {
                  const s = settings[e.id]
                  const bookable = s ? s.bookable : true
                  const requiresApproval = s?.requires_approval || false
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.nickname || e.equipment_name}</td>
                      <td>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                          <input type="checkbox" checked={bookable} onChange={() => toggleBookable(e.id)} style={{ width: 'auto' }} />
                          <span style={{ color: bookable ? 'var(--accent)' : 'var(--text3)' }}>{bookable ? 'Yes' : 'No'}</span>
                        </label>
                      </td>
                      <td>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                          <input type="checkbox" checked={requiresApproval} onChange={() => toggleRequireApproval(e.id)} style={{ width: 'auto' }} />
                          <span style={{ color: requiresApproval ? '#92400e' : 'var(--text3)' }}>{requiresApproval ? 'Yes' : 'No'}</span>
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
export default function BookingEquipment() {
  const { session } = useAppStore()
  const [tab, setTab] = useState('calendar')

  const tabs = [
    { key: 'calendar', label: '📅 Book Equipment' },
    { key: 'history', label: '📋 History & Usage' },
    ...(isAdmin(session) ? [{ key: 'settings', label: '⚙️ Settings' }] : []),
  ]

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 20 }}>Booking Equipment</div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: tab === t.key ? 'var(--accent)' : 'var(--text2)', borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'calendar' && <BookingCalendar session={session} />}
      {tab === 'history' && <BookingHistory session={session} />}
      {tab === 'settings' && <BookingSettings session={session} />}
    </div>
  )
}
