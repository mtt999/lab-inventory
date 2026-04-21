import { useAppStore } from './store/useAppStore'
import { sb } from './lib/supabase'
import { useState } from 'react'

export default function Login() {
  const { setSession } = useAppStore()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) { setError('Please enter your ID and password.'); return }
    setLoading(true); setError('')

    const identifierLower = identifier.trim().toLowerCase()

    const { data: adminSettings } = await sb.from('settings').select('value').eq('key', 'admin_email').maybeSingle()
    const adminEmail = adminSettings?.value || 'motlagh999@gmail.com'
    const { data: adminPass } = await sb.from('settings').select('value').eq('key', 'admin_password').maybeSingle()
    if (identifierLower === adminEmail.toLowerCase() && password === (adminPass?.value || 'Motlagh@2026')) {
      setSession({ role: 'admin', username: 'Admin', userId: null, adminLevel: 3 })
      setLoading(false); return
    }

    let user = null
    const { data: byEmail } = await sb.from('users').select('*').eq('is_active', true).ilike('email', identifierLower)
    if (byEmail?.length) user = byEmail[0]

    if (!user) {
      const { data: byName } = await sb.from('users').select('*').eq('is_active', true).ilike('name', identifier.trim())
      if (byName?.length) user = byName[0]
    }

    if (!user) { setError('No account found. Try your name or email.'); setLoading(false); return }
    if (!user.password) { setError('No password set for this account. Contact your admin.'); setLoading(false); return }
    if (user.password !== password) { setError('Incorrect password.'); setLoading(false); return }

    const adminLevel = user.admin_level || 0
    const role = user.role === 'admin' || adminLevel >= 1 ? 'admin' : user.role
    setSession({
      role, username: user.name, userId: user.id,
      email: user.email, adminLevel,
      photoUrl: user.photo_url, avatar: user.avatar,
    })
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo — replaces old iLab text + repeated lines */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <svg width="100" height="100" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <polygon points="256,4 468,126 468,378 256,500 44,378 44,126" fill="#ffb380"/>
            <polygon points="256,14 458,132 458,372 256,490 54,372 54,132" fill="#ff7f2a"/>
            <polygon points="256,30 450,140 450,362 256,472 62,362 62,140" fill="#000080"/>
            <polygon points="256,58 422,152 422,350 256,444 90,350 90,152" fill="none" stroke="#ff6b00" strokeWidth="1.2" opacity="0.25"/>
            <circle cx="256" cy="30"  r="9" fill="#ff6b00"/>
            <circle cx="450" cy="140" r="9" fill="#ff6b00"/>
            <circle cx="450" cy="362" r="9" fill="#ff6b00"/>
            <circle cx="256" cy="472" r="9" fill="#ff6b00"/>
            <circle cx="62"  cy="362" r="9" fill="#ff6b00"/>
            <circle cx="62"  cy="140" r="9" fill="#ff6b00"/>
            <ellipse cx="256" cy="224" rx="138" ry="44" fill="none" stroke="#ff6b00" strokeWidth="3.5" opacity="0.95"/>
            <circle cx="394" cy="224" r="16" fill="#ff6b00"/>
            <ellipse cx="256" cy="224" rx="138" ry="44" fill="none" stroke="#ff9a3c" strokeWidth="3" opacity="0.85" transform="rotate(60 256 224)"/>
            <circle cx="179.16718" cy="294.86069" r="15" fill="#ff9a3c"/>
            <ellipse cx="256" cy="224" rx="138" ry="44" fill="none" stroke="#ffba6e" strokeWidth="2.5" opacity="0.75" transform="rotate(-60 256 224)"/>
            <circle cx="325" cy="105" r="14" fill="#ffba6e"/>
            <circle cx="256" cy="224" r="38" fill="#ff6b00" opacity="0.10"/>
            <circle cx="256" cy="224" r="26" fill="#ff6b00" opacity="0.22"/>
            <circle cx="256" cy="224" r="16" fill="#ff8c00" opacity="0.80"/>
            <circle cx="256" cy="224" r="9"  fill="#ffb347"/>
            <text x="258.37772" y="415" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="92" fontWeight="700">
              <tspan fontStyle="italic" fill="#ff6b00">i</tspan>
              <tspan fill="#ffffff" dx="-5">Lab</tspan>
            </text>
          </svg>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Use your name or email with your password</div>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email address</label>
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
            <button type="submit" style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '12px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }} disabled={loading}>
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
          <div>iLab for Illinois Center for Transportation (ICT)</div>
          <div style={{ fontWeight: 500, color: 'var(--text2)', marginTop: 4 }}>App developed by Mohsen Motlagh</div>
          <div>© {new Date().getFullYear()} All rights reserved</div>
        </div>

      </div>
    </div>
  )
}
