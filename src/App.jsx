import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import Login from './screens/Login'
import Layout from './components/Layout'
import Dashboard from './screens/Dashboard'
import Home from './screens/Home'
import Inspection from './screens/Inspection'
import Results from './screens/Results'
import Projects from './screens/Projects'
import ProjectDetail from './screens/ProjectDetail'
import History from './screens/History'
import Admin from './screens/Admin'
import TrainingRecords from './screens/TrainingRecords'
import Profile from './screens/Profile'
import EquipmentInventory from './screens/EquipmentInventory'
import EquipmentHub from './screens/EquipmentHub'
import Toast from './components/Toast'

export default function App() {
  const { session, screen, refreshCache, setScreen } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshCache().finally(() => setLoading(false))
  }, [])

  // On login, always start at dashboard
  useEffect(() => {
    if (session && screen === 'home') setScreen('dashboard')
  }, [session])

  // Redirect students away from restricted screens
  useEffect(() => {
    if (session?.role === 'student') {
      const allowed = ['dashboard', 'projects', 'project-detail', 'training', 'profile']
      if (!allowed.includes(screen)) setScreen('dashboard')
    }
  }, [session, screen])

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
    admin: <Admin />,
    training: <TrainingRecords />,
    profile: <Profile />,
    equipment: <EquipmentInventory />,
    equipmenthub: <EquipmentHub />,
  }

  return (
    <>
      <Layout>{screens[screen] || <Dashboard />}</Layout>
      <Toast />
    </>
  )
}
