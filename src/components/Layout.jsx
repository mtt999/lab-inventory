import { useAppStore } from '../store/useAppStore'

export default function Layout({ children }) {
  const { session, setScreen, setSession, screen } = useAppStore()

  function logout() {
    setSession(null)
  }

  const navItems = [
    { label: 'Inventory', screen: 'home' },
    { label: 'Projects', screen: 'projects' },
    { label: 'History', screen: 'history' },
    ...(session?.role === 'admin' ? [{ label: 'Admin', screen: 'admin' }] : []),
  ]

  const activeScreen = ['home','inspection','results'].includes(screen) ? 'home'
    : ['projects','project-detail'].includes(screen) ? 'projects'
    : screen

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 16, letterSpacing: '-0.5px', color: 'var(--accent)' }}>
          Lab<span style={{ color: 'var(--text3)' }}>Stock</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <nav style={{ display: 'flex', gap: 4 }}>
            {navItems.map(item => (
              <button
                key={item.screen}
                className={'btn btn-sm' + (activeScreen === item.screen ? ' btn-primary' : '')}
                style={{ border: 'none', background: activeScreen === item.screen ? 'var(--accent-light)' : 'transparent', color: activeScreen === item.screen ? 'var(--accent)' : 'var(--text2)' }}
                onClick={() => setScreen(item.screen)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{session?.username}</span>
          <button className="btn btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: 720, margin: '0 auto', width: '100%', padding: '32px 20px' }}>
        {children}
      </main>
    </div>
  )
}
