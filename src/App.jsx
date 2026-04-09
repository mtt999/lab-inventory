import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import Login from './screens/Login'
import Layout from './components/Layout'
import Home from './screens/Home'
import Inspection from './screens/Inspection'
import Results from './screens/Results'
import Projects from './screens/Projects'
import ProjectDetail from './screens/ProjectDetail'
import History from './screens/History'
import Admin from './screens/Admin'
import Toast from './components/Toast'

export default function App() {
  const { session, screen, refreshCache } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshCache().finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 999 }}>
      <div className="spinner" />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text3)' }}>Connecting to database…</div>
    </div>
  )

  if (!session) return <Login />

  const screens = {
    home: <Home />,
    inspection: <Inspection />,
    results: <Results />,
    projects: <Projects />,
    'project-detail': <ProjectDetail />,
    history: <History />,
    admin: <Admin />,
  }

  return (
    <>
      <Layout>
        {screens[screen] || <Home />}
      </Layout>
      <Toast />
    </>
  )
}
