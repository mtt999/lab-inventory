import { useAppStore } from '../store/useAppStore'

export default function Layout({ children }) {
  const { session, setScreen, setSession, screen } = useAppStore()

  function logout() { setSession(null) }

  const displayName = session?.role === 'admin' ? '' : session?.username

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div onClick={() => setScreen('dashboard')}
          style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, letterSpacing: '-0.5px', color: 'var(--accent)', cursor: 'pointer' }}>
          ICT-<span style={{ color: 'var(--text3)' }}>Lab</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {screen !== 'dashboard' && (
            <button className="btn btn-sm"
              style={{ border: 'none', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 500 }}
              onClick={() => setScreen('dashboard')}>
              ← Home
            </button>
          )}
          {displayName && <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{displayName}</span>}
          <button className="btn btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: 960, margin: '0 auto', width: '100%', padding: '32px 20px' }}>
        {children}
      </main>
    </div>
  )
}
