import { useAppStore } from '../store/useAppStore'

export default function Home() {
  const { rooms, supplies, setScreen, setInspection, settings, toast } = useAppStore()

  // Reminder banner
  const today = new Date().getDay()
  const due = parseInt(settings['due_day'] || 5)
  const dayBefore = (due - 1 + 7) % 7
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const showReminder = today === dayBefore

  function startInspection(roomId) {
    const room = rooms.find(r => r.id === roomId)
    const items = supplies.filter(s => s.room_id === roomId)
    if (!items.length) { toast('No supplies in this room. Ask admin to add items.'); return }
    setInspection({ roomId, room, items, index: 0, results: [] })
    setScreen('inspection')
  }

  return (
    <div>
      {showReminder && (
        <div style={{ background: 'var(--warn-light)', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#92400e' }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          Reminder: Supply inventory is due tomorrow ({days[due]}). Please complete your inspection today.
        </div>
      )}

      <div className="section-header">
        <div className="section-title">Select a room</div>
      </div>

      {rooms.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏠</div>No rooms yet. Ask admin to add rooms.</div>
      ) : (
        <div className="room-grid">
          {rooms.map(r => {
            const cnt = supplies.filter(s => s.room_id === r.id).length
            return (
              <div key={r.id} className="room-card" onClick={() => startInspection(r.id)}
                style={r.photo_url ? { paddingTop: 0, overflow: 'hidden' } : {}}>
                {r.photo_url
                  ? <img src={r.photo_url} style={{ width: 'calc(100% + 32px)', height: 90, objectFit: 'cover', borderRadius: '10px 10px 0 0', margin: '-20px -16px 12px' }} />
                  : <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon || '🧪'}</div>
                }
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{cnt} item{cnt !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
