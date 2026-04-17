import { useAppStore } from '../store/useAppStore'

export default function Layout({ children }) {
  const { session, setSession, setScreen, screen } = useAppStore()
  function logout() { setSession(null) }
  const displayName = session?.role === 'admin' && !session?.userId ? '' : session?.username

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Logo — two-line */}
        <div onClick={() => setScreen('dashboard')} style={{ cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', color: 'var(--accent)', lineHeight: 1.1 }}>
            InteleLab-ICT
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1.2 }}>
            The Intelligent Laboratory
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {screen !== 'dashboard' && (
            <button className="btn btn-sm" style={{ border: 'none', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 500 }} onClick={() => setScreen('dashboard')}>← Home</button>
          )}
          {session && (
            <button onClick={() => setScreen('profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 10px 4px 4px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {session.photoUrl
                  ? <img src={session.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : session.avatar
                    ? <span style={{ fontSize: 16 }}>{session.avatar}</span>
                    : <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{(session.username || 'A')[0].toUpperCase()}</span>
                }
              </div>
              {displayName && <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--mono)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>}
            </button>
          )}
          <button className="btn btn-sm" onClick={logout} style={{ flexShrink: 0 }}>Sign out</button>
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: screen === 'booking' ? '100%' : 960, margin: '0 auto', width: '100%', padding: screen === 'booking' ? '16px 10px' : '24px 16px' }}>
        {children}
      </main>
    </div>
  )
}
