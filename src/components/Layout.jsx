import { useAppStore } from '../store/useAppStore'

export default function Layout({ children }) {
  const { session, setScreen, setSession, screen } = useAppStore()

  function logout() { setSession(null) }

  const isAdmin = session?.role === 'admin'
  const isStudent = session?.role === 'student'

  // Only show Admin tab in nav — everything else is on the dashboard
  const navItems = [
    ...(isAdmin ? [{ label: 'Admin', screen: 'admin' }] : []),
  ]

  const displayName = session?.role === 'admin' ? 'Admin' : session?.username

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Logo — always goes home */}
        <div onClick={() => setScreen('dashboard')}
          style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, letterSpacing: '-0.5px', color: 'var(--accent)', cursor: 'pointer' }}>
          ICT-<span style={{ color: "var(--text3)" }}>Lab</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Back to home button when not on dashboard */}
          {screen !== 'dashboard' && (
            <button className="btn btn-sm"
              style={{ border: 'none', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 500 }}
              onClick={() => setScreen('dashboard')}>
              ← Home
            </button>
          )}

          {/* Admin tab only */}
          {navItems.map(item => (
            <button key={item.screen} className="btn btn-sm"
              style={{ border: 'none', background: screen === item.screen ? 'var(--accent-light)' : 'transparent', color: screen === item.screen ? 'var(--accent)' : 'var(--text2)', fontWeight: screen === item.screen ? 600 : 500 }}
              onClick={() => setScreen(item.screen)}>
              {item.label}
            </button>
          ))}

          {displayName && (
            <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{displayName}</span>
          )}
          <button className="btn btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 960, margin: '0 auto', width: '100%', padding: '32px 20px' }}>
        {children}
      </main>
    </div>
  )
}
