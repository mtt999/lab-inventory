import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const ROLES = [
  { key: 'user',    label: 'Staff' },
  { key: 'student', label: 'Student' },
  { key: 'admin',   label: 'Admin' },
]

export default function Login() {
  const { settings, setSession } = useAppStore()
  const [role, setRole] = useState('user')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  function pressKey(d) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) setTimeout(() => tryLogin(next), 180)
  }

  async function tryLogin(p = pin) {
    setError('')
    if (role === 'admin') {
      if (p === (settings['admin_pin'] || '1234')) {
        setSession({ role: 'admin', username: 'Admin' })
      } else {
        setError('Incorrect admin PIN')
        setPin('')
      }
    } else {
      // staff and student both look up by PIN, but filter by role
      const { data } = await sb.from('users').select('*').eq('pin', p).eq('role', role).limit(1)
      if (data && data.length > 0) {
        setSession({ role: data[0].role, username: data[0].name, userId: data[0].id })
      } else {
        setError('Incorrect PIN')
        setPin('')
      }
    }
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length)

  // dot color per role
  const dotColor = role === 'admin' ? 'var(--accent2)' : role === 'student' ? 'var(--accent3)' : 'var(--accent)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px 32px', width: '100%', maxWidth: 380, textAlign: 'center' }}>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color: 'var(--accent)', marginBottom: 4 }}>ICT-Lab</div>
        <div style={{ marginBottom: 32 }}></div>

        {/* Role tabs — 3 tabs */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 3, marginBottom: 28, gap: 2 }}>
          {ROLES.map(r => (
            <button key={r.key} onClick={() => { setRole(r.key); setPin(''); setError('') }}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8,
                background: role === r.key ? 'var(--surface)' : 'transparent',
                fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                color: role === r.key ? 'var(--text)' : 'var(--text2)',
                boxShadow: role === r.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* PIN dots */}
        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          {dots.map((filled, i) => (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: '50%', margin: '0 5px',
              border: `2px solid ${filled ? dotColor : 'var(--border)'}`,
              background: filled ? dotColor : 'transparent',
              transition: 'all 0.15s'
            }} />
          ))}
        </div>

        {/* PIN pad */}
        <div className="pin-pad">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="pin-key" onClick={() => pressKey(String(n))}>{n}</button>
          ))}
          <button className="pin-key" style={{ fontSize: 13 }} onClick={() => { setPin(''); setError('') }}>CLR</button>
          <button className="pin-key" onClick={() => pressKey('0')}>0</button>
          <button className="pin-key" onClick={() => setPin(p => p.slice(0, -1))}>⌫</button>
        </div>

        {error && <div style={{ fontSize: 13, color: 'var(--accent2)', marginTop: 14 }}>{error}</div>}

        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>Contact ICT-Research Engineers for<br />registration or login issues</div>


      </div>
    </div>
  )
}
