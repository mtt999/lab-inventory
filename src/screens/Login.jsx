import { useAppStore } from '../store/useAppStore'
import { sb } from '../lib/supabase'
import { useState } from 'react'

export default function Login() {
  const { setSession } = useAppStore()
  const [identifier, setIdentifier] = useState('') // email OR name
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) { setError('Please enter your ID and password.'); return }
    setLoading(true); setError('')

    const identifierLower = identifier.trim().toLowerCase()

    // 1. Check owner admin
    const { data: adminSettings } = await sb.from('settings').select('value').eq('key', 'admin_email').maybeSingle()
    const adminEmail = adminSettings?.value || 'motlagh999@gmail.com'
    const { data: adminPass } = await sb.from('settings').select('value').eq('key', 'admin_password').maybeSingle()
    if (identifierLower === adminEmail.toLowerCase() && password === (adminPass?.value || 'Motlagh@2026')) {
      setSession({ role: 'admin', username: 'Admin', userId: null, adminLevel: 3 })
      setLoading(false); return
    }

    // 2. Try matching by email first
    let user = null
    const { data: byEmail } = await sb.from('users').select('*').eq('is_active', true).ilike('email', identifierLower)
    if (byEmail?.length) user = byEmail[0]

    // 3. If no email match, try matching by name (case-insensitive)
    if (!user) {
      const { data: byName } = await sb.from('users').select('*').eq('is_active', true).ilike('name', identifier.trim())
      if (byName?.length) user = byName[0]
    }

    if (!user) {
      setError('No account found. Try your name or email.')
      setLoading(false); return
    }

    // 4. Check password
    if (!user.password) {
      setError('No password set for this account. Contact your admin.')
      setLoading(false); return
    }

    if (user.password !== password) {
      setError('Incorrect password.')
      setLoading(false); return
    }

    // 5. Set session
    const adminLevel = user.admin_level || 0
    const role = user.role === 'admin' || adminLevel >= 1 ? 'admin' : user.role
    setSession({
      role,
      username: user.name,
      userId: user.id,
      email: user.email,
      adminLevel,
      photoUrl: user.photo_url,
      avatar: user.avatar,
    })
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontWeight: 700, fontSize: 32, letterSpacing: '-1px', color: 'var(--accent)', marginBottom: 2, fontFamily: 'var(--sans)' }}>
            <span style={{ fontStyle: 'italic' }}>i</span>Lab
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500, marginBottom: 2 }}>iLab for ICT</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>iLab for Illinois Center for Transportation</div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Use your name or email with your password</div>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Name or Email address</label>
              <input
                type="text"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setError('') }}
                placeholder="Your name or netid@illinois.edu"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text3)', padding: 4 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ fontSize: 13, color: 'var(--accent2)', background: 'var(--accent2-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>⚠️ {error}</div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '12px' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 500, color: 'var(--text2)', marginBottom: 2 }}>Forgot User ID or Password?</div>
            <div>Contact Research Engineers at ICT</div>
            <a href="mailto:ictengineers@illinois.edu" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>ictengineers@illinois.edu</a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text3)', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text2)' }}>InteleLab (iLab)</div>
          <div>iLab for ICT · Illinois Center for Transportation</div>
          <div style={{ fontWeight: 500, color: 'var(--text2)', marginTop: 4 }}>App developed by Mohsen Motlagh</div>
          <div>© {new Date().getFullYear()} All rights reserved</div>
        </div>
      </div>
    </div>
  )
}
