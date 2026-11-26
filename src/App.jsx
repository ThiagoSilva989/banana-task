
import { useEffect, useState } from 'react'
import { getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function checkSession() {
    try {
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()

      if (session.tokens?.accessToken) {
        setUser(currentUser)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  async function handleLogin() {
    await checkSession()
  }

  async function handleLogout() {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      console.error('Erro ao sair:', error)
      alert('Não foi possível encerrar a sessão.')
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#111',
        color: '#facc15',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        🍌 Carregando Banana Task...
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
    />
  )
}
