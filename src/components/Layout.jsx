import { useAppStore } from '../store/useAppStore'
import NotificationBell from './NotificationBell'

function ILabLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
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
  )
}

export default function Layout({ children }) {
  const { session, setSession, setScreen, screen } = useAppStore()
  function logout() { setSession(null) }
  const displayName = session?.role === 'admin' && !session?.userId ? '' : session?.username

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ background: '#0d47a1', borderBottom: '1px solid #0a3d91', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div onClick={() => setScreen('dashboard')} style={{ cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ILabLogo size={42} />
          <div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', color: '#ffffff', lineHeight: 1.1 }}>InteleLab-ICT</div>
            <div style={{ fontSize: 10, color: '#ffb380', fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1.2 }}>The Intelligent Laboratory</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {screen !== 'dashboard' && (
            <button className="btn btn-sm" style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#ffffff', fontWeight: 500 }} onClick={() => setScreen('dashboard')}>← Home</button>
          )}
          {/* Notification bell — shown to logged-in users with a real userId */}
          {session?.userId && <NotificationBell />}
          {session && (
            <button onClick={() => setScreen('profile')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 99, padding: '4px 10px 4px 4px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {session.photoUrl
                  ? <img src={session.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : session.avatar
                    ? <span style={{ fontSize: 16 }}>{session.avatar}</span>
                    : <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{(session.username || 'A')[0].toUpperCase()}</span>
                }
              </div>
              {displayName && <span style={{ fontSize: 13, color: '#e3f2fd', fontFamily: 'var(--mono)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>}
            </button>
          )}
          <button className="btn btn-sm" onClick={logout} style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#ffffff', flexShrink: 0 }}>Sign out</button>
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: screen === 'booking' ? '100%' : 960, margin: '0 auto', width: '100%', padding: screen === 'booking' ? '16px 10px' : '24px 16px' }}>
        {children}
      </main>
    </div>
  )
}
