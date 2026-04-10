import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

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
      const { data } = await sb.from('users').select('*').eq('pin', p).limit(1)
      if (data && data.length > 0) {
        setSession({ role: data[0].role || 'user', username: data[0].name, userId: data[0].id })
      } else {
        setError('Incorrect PIN')
        setPin('')
      }
    }
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px 32px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color: 'var(--accent)', marginBottom: 4 }}>LabStock</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 32 }}>Weekly Supply Inventory System</div>

        {/* Role tabs */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 3, marginBottom: 24 }}>
          {['user','admin'].map((r,i) => (
            <button key={r} onClick={() => { setRole(r); setPin(''); setError('') }}
              style={{ flex: 1, padding: 8, border: 'none', borderRadius: 8, background: role === r ? 'var(--surface)' : 'transparent', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: role === r ? 'var(--text)' : 'var(--text2)', boxShadow: role === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
              {i === 0 ? 'Staff' : 'Admin'}
            </button>
          ))}
        </div>

        {/* PIN dots */}
        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          {dots.map((filled, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border)', margin: '0 4px', background: filled ? 'var(--accent)' : 'transparent', borderColor: filled ? 'var(--accent)' : 'var(--border)', transition: 'all 0.15s' }} />
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

        {error && <div style={{ fontSize: 13, color: 'var(--accent2)', marginTop: 12 }}>{error}</div>}
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>Admin PIN: 1234 · Staff PIN: 0000</div>
      </div>
    </div>
  )
}
