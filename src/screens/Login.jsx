import { useAppStore } from '../store/useAppStore'
import { sb } from '../lib/supabase'
import { useState } from 'react'

export default function Login() {
  const { setSession, settings } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Please enter email and password.'); return }
    setLoading(true); setError('')

    const emailLower = email.trim().toLowerCase()

    // Check owner admin (hardcoded email from settings or env)
    const { data: adminSettings } = await sb.from('settings').select('value').eq('key', 'admin_email').maybeSingle()
    const adminEmail = adminSettings?.value || 'motlagh999@gmail.com'
    const { data: adminPass } = await sb.from('settings').select('value').eq('key', 'admin_password').maybeSingle()

    // Check users table
    const { data: users } = await sb.from('users')
      .select('*').eq('is_active', true)
      .eq('email', emailLower)

    const user = users?.[0]

    if (!user) {
      // Check if owner admin
      if (emailLower === adminEmail.toLowerCase() && password === (adminPass?.value || 'Motlagh@2026')) {
        setSession({ role: 'admin', username: 'Admin', userId: null, adminLevel: 3 })
        setLoading(false); return
      }
      setError('No account found with this email.'); setLoading(false); return
    }

    if (user.password !== password) {
      setError('Incorrect password.'); setLoading(false); return
    }

    // Determine role/level
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
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 28, letterSpacing: '-1px', color: 'var(--accent)', marginBottom: 6 }}>
  Intele<span style={{ color: 'var(--text3)' }}>Lab</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>I-Lab for Illinois Center for Transportation (UIUC-ICT)</div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Enter your email and password to continue</div>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="netid@illinois.edu"
                autoComplete="email"
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
              <div style={{ fontSize: 13, color: 'var(--accent2)', background: 'var(--accent2-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '12px' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            Forgot your password? Contact your ICT-RE or admin to reset it.
          </div>
        </div>

        {/* Copyright */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text3)', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text2)' }}>InteleLab (I-Lab)</div>
          <div>I-Lab for ICT</div>
          <div style={{ fontWeight: 500, color: 'var(--text2)', marginTop: 4 }}>App developed by Mohsen Motlagh</div>
          <div>© {new Date().getFullYear()} All rights reserved</div>
        </div>
      </div>
    </div>
  )
}
