import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { sb } from './lib/supabase'
import Login from './screens/Login'
import Layout from './components/Layout'
import Dashboard from './screens/Dashboard'
import REMessages from './screens/REMessages'
import Home from './screens/Home'
import Inspection from './screens/Inspection'
import Results from './screens/Results'
import Projects from './screens/Projects'
import ProjectDetail from './screens/ProjectDetail'
import History from './screens/History'
import TrainingRecords from './screens/TrainingRecords'
import Profile from './screens/Profile'
import EquipmentInventory from './screens/EquipmentInventory'
import EquipmentHub from './screens/EquipmentHub'
import BookingEquipment from './screens/BookingEquipment'
import PM from './screens/PM'
import Toast from './components/Toast'

export default function App() {
  const { session, screen, refreshCache, setScreen } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [userAccess, setUserAccess] = useState(null)

  useEffect(() => {
    refreshCache().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (session?.userId && (session?.role === 'user' || session?.role === 'admin')) {
      sb.from('user_screen_access').select('screen_key').eq('user_id', session.userId)
        .then(({ data }) => {
          if (data?.length) setUserAccess(new Set(data.map(r => r.screen_key)))
          else setUserAccess(null)
        })
    } else {
      setUserAccess(null)
    }
  }, [session?.userId])

  useEffect(() => {
    if (session && screen === 'home') setScreen('dashboard')
  }, [session])

  useEffect(() => {
    if (session?.role === 'student') {
      const allowed = ['dashboard', 'projects', 'project-detail', 'training', 'profile', 'equipmenthub', 'booking', 'remessages']
      if (!allowed.includes(screen)) setScreen('dashboard')
    }
    // pm is only for admin and user (staff)
    if (screen === 'pm' && session?.role === 'student') setScreen('dashboard')
    if ((session?.role === 'user' || session?.role === 'admin') && userAccess && screen !== 'dashboard' && screen !== 'profile') {
      if (!userAccess.has(screen)) setScreen('dashboard')
    }
  }, [session, screen, userAccess])

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 999 }}>
      <div className="spinner" />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text3)' }}>Connecting to database…</div>
    </div>
  )

  if (!session) return <Login />

  const screens = {
    dashboard: <Dashboard />,
    home: <Home />,
    inspection: <Inspection />,
    results: <Results />,
    projects: <Projects />,
    'project-detail': <ProjectDetail />,
    history: <History />,
    training: <TrainingRecords />,
    profile: <Profile />,
    equipment: <EquipmentInventory />,
    equipmenthub: <EquipmentHub />,
    booking: <BookingEquipment />,
    remessages: <REMessages />,
    pm: <PM />,
  }

  return (
    <>
      <Layout>{screens[screen] || <Dashboard />}</Layout>
      <Toast />
    </>
  )
}
