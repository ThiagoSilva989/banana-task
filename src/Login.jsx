
import { useState } from 'react'
import {
  signIn,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword
} from 'aws-amplify/auth'
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import './Login.css'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      if (mode === 'login') {
        const result = await signIn({ username: email, password })

        if (result.isSignedIn) {
          onLogin()
        } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
          setMode('confirm')
          setMessage('Confirme seu cadastro pelo código enviado ao e-mail.')
        } else {
          setMessage('A autenticação exige uma etapa adicional: ' + result.nextStep.signInStep)
        }
      }

      if (mode === 'register') {
        await signUp({
          username: email,
          password,
          options: { userAttributes: { email } }
        })
        setMode('confirm')
        setMessage('Enviamos um código de confirmação para seu e-mail.')
      }

      if (mode === 'confirm') {
        await confirmSignUp({ username: email, confirmationCode: code })
        setMode('login')
        setMessage('Conta confirmada! Agora você pode entrar.')
      }

      if (mode === 'forgot') {
        await resetPassword({ username: email })
        setMode('reset')
        setMessage('Código de recuperação enviado para seu e-mail.')
      }

      if (mode === 'reset') {
        await confirmResetPassword({
          username: email,
          confirmationCode: code,
          newPassword
        })
        setMode('login')
        setPassword('')
        setCode('')
        setMessage('Senha alterada com sucesso. Faça login.')
      }
    } catch (err) {
      setError(err.message || 'Não foi possível realizar a operação.')
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login: 'Bem-vindo de volta!',
    register: 'Crie sua conta',
    confirm: 'Confirme seu e-mail',
    forgot: 'Recuperar senha',
    reset: 'Criar nova senha'
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span>🍌</span>
          <strong>banana<span>task</span></strong>
        </div>

        <div className="login-heading">
          <h1>{titles[mode]}</h1>
          <p>Organize suas ideias, cuide do seu tempo e aproveite cada conquista.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>E-mail</label>
          <div className="login-input">
            <Mail size={18}/>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={mode === 'confirm' || mode === 'reset'}
            />
          </div>

          {['login', 'register'].includes(mode) && (
            <>
              <label>Senha</label>
              <div className="login-input">
                <Lock size={18}/>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </>
          )}

          {['confirm', 'reset'].includes(mode) && (
            <>
              <label>Código recebido por e-mail</label>
              <div className="login-input">
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Código de confirmação"
                  required
                />
              </div>
            </>
          )}

          {mode === 'reset' && (
            <>
              <label>Nova senha</label>
              <div className="login-input">
                <Lock size={18}/>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="Nova senha"
                />
              </div>
            </>
          )}

          {message && <p className="login-message">{message}</p>}
          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" disabled={loading}>
            {loading ? 'Aguarde...' : {
              login: 'Entrar na minha conta',
              register: 'Criar minha conta',
              confirm: 'Confirmar cadastro',
              forgot: 'Enviar código',
              reset: 'Alterar senha'
            }[mode]}
          </button>
        </form>

        {mode === 'login' && (
          <>
            <button className="login-link" onClick={() => setMode('forgot')}>Esqueci minha senha</button>
            <p className="login-register">Não tem uma conta? <button onClick={() => setMode('register')}>Cadastre-se</button></p>
          </>
        )}

        {mode === 'register' && (
          <p className="login-register">Já tem uma conta? <button onClick={() => setMode('login')}>Entrar</button></p>
        )}

        {mode !== 'login' && (
          <button className="login-back" onClick={() => { setMode('login'); setError(''); setMessage('') }}>
            <ArrowLeft size={16}/> Voltar ao login
          </button>
        )}
      </section>
    </main>
  )
}
