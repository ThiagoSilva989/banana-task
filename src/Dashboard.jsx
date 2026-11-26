
import { useEffect, useMemo, useState } from 'react'
import {
  listTasks,
  createTask,
  updateTask,
  removeTask
} from './api.js'
import {
  LayoutDashboard, CalendarDays, CheckSquare, Settings,
  Search, Plus, Bell, ChevronLeft, ChevronRight,
  Clock3, ArrowUpRight, Sun, Moon, Coffee,
  BriefcaseBusiness, BookOpen, CircleCheck,
  Menu, X, LogOut, Trash2, Pencil, User,
  Save, Check
} from 'lucide-react'
import './App.css'

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const today = new Date()

const dateToString = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function App({ user, onLogout }) {
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [savingTask, setSavingTask] = useState(false)

  const [page, setPage] = useState('Dashboard')
  const [selectedDate, setSelectedDate] = useState(dateToString(today))
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [search, setSearch] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const [profileName, setProfileName] = useState(() =>
    localStorage.getItem('banana-profile-name') || ''
  )

  const [nameInput, setNameInput] = useState(profileName)

  const [theme, setTheme] = useState(() =>
    localStorage.getItem('banana-theme') || 'dark'
  )

  const [notifications, setNotifications] = useState(() =>
    localStorage.getItem('banana-notifications') !== 'false'
  )

  const [weekStart, setWeekStart] = useState(() =>
    localStorage.getItem('banana-week-start') || '0'
  )

  const [filter, setFilter] = useState('Todas')
  const [feedback, setFeedback] = useState('')

  function showFeedback(message) {
    setFeedback(message)
    window.setTimeout(() => setFeedback(''), 3500)
  }

  // CARREGAR TAREFAS DA AWS
  async function loadTasks() {
    setLoadingTasks(true)

    try {
      const data = await listTasks()
      setTasks(data)
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error)
      showFeedback(`Erro ao carregar tarefas: ${error.message}`)
    } finally {
      setLoadingTasks(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // SALVAR PREFERÊNCIAS
  useEffect(() => {
    localStorage.setItem('banana-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('banana-notifications', String(notifications))
  }, [notifications])

  useEffect(() => {
    localStorage.setItem('banana-week-start', weekStart)
  }, [weekStart])

  useEffect(() => {
    localStorage.setItem('banana-profile-name', profileName)
  }, [profileName])

  // INDICADORES
  const completed = tasks.filter(
    task => task.status === 'Concluída'
  ).length

  const pending = tasks.filter(
    task => task.status !== 'Concluída'
  ).length

  const inProgress = tasks.filter(
    task => task.status === 'Em andamento'
  ).length

  const progress = tasks.length
    ? Math.round(completed / tasks.length * 100)
    : 0

  const email =
    user?.signInDetails?.loginId ||
    user?.username ||
    'Conta autenticada'

  const displayName = profileName || email.split('@')[0]

  // FILTROS E PESQUISA
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = (task.title || '')
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesFilter =
        filter === 'Todas' || task.status === filter

      const matchesDate =
        page !== 'Calendário' || task.date === selectedDate

      const matchesToday =
        page !== 'Dashboard' || task.date === dateToString(today)

      return (
        matchesSearch &&
        matchesFilter &&
        matchesDate &&
        matchesToday
      )
    })
  }, [tasks, search, filter, page, selectedDate])

  // ABRIR FORMULÁRIOS
  function openNewTask() {
    setEditingTask(null)
    setShowModal(true)
  }

  function openEditTask(task) {
    setEditingTask(task)
    setShowModal(true)
  }

  // CRIAR E EDITAR TAREFAS NA AWS
  async function saveTask(event) {
    event.preventDefault()

    if (savingTask) return

    const form = new FormData(event.currentTarget)

    const title = String(form.get('title') || '').trim()

    if (!title) {
      showFeedback('Digite o nome da tarefa.')
      return
    }

    const taskData = {
      title,
      category: form.get('category'),
      time: form.get('time'),
      priority: form.get('priority'),
      date: form.get('date')
    }

    setSavingTask(true)

    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, {
          ...editingTask,
          ...taskData
        })

        setTasks(current =>
          current.map(task =>
            task.id === editingTask.id ? updated : task
          )
        )

        showFeedback('Tarefa atualizada na AWS!')
      } else {
        const created = await createTask({
          ...taskData,
          status: 'Pendente'
        })

        setTasks(current => [...current, created])

        showFeedback('Tarefa salva no DynamoDB!')
      }

      setSelectedDate(taskData.date)
      setShowModal(false)
      setEditingTask(null)

    } catch (error) {
      console.error('Erro ao salvar tarefa:', error)
      showFeedback(`Erro ao salvar: ${error.message}`)
    } finally {
      setSavingTask(false)
    }
  }

  // ALTERAR STATUS NA AWS
  async function toggleTask(id) {
    const task = tasks.find(item => item.id === id)

    if (!task) return

    const newStatus =
      task.status === 'Concluída'
        ? 'Pendente'
        : 'Concluída'

    try {
      const updated = await updateTask(id, {
        ...task,
        status: newStatus
      })

      setTasks(current =>
        current.map(item =>
          item.id === id ? updated : item
        )
      )

      showFeedback(
        newStatus === 'Concluída'
          ? 'Tarefa concluída!'
          : 'Tarefa reaberta!'
      )

    } catch (error) {
      console.error('Erro ao alterar tarefa:', error)
      showFeedback(`Erro ao atualizar: ${error.message}`)
    }
  }

  // EXCLUIR TAREFA NA AWS
  async function deleteTask(id) {
    const confirmed = window.confirm(
      'Deseja realmente excluir esta tarefa?'
    )

    if (!confirmed) return

    try {
      await removeTask(id)

      setTasks(current =>
        current.filter(task => task.id !== id)
      )

      showFeedback('Tarefa excluída do DynamoDB!')

    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
      showFeedback(`Erro ao excluir: ${error.message}`)
    }
  }

  // CALENDÁRIO
  function changeMonth(direction) {
    const date = new Date(year, month + direction, 1)
    setMonth(date.getMonth())
    setYear(date.getFullYear())
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarOffset =
    (firstDay - Number(weekStart) + 7) % 7

  const calendarWeekdays = weekdays
    .slice(Number(weekStart))
    .concat(weekdays.slice(0, Number(weekStart)))

  const userInitials = displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // PERFIL
  function saveProfile(event) {
    event.preventDefault()
    setProfileName(nameInput.trim())
    showFeedback('Perfil atualizado!')
  }

  // NAVEGAÇÃO
  function changePage(newPage) {
    setPage(newPage)
    setMobileMenu(false)
    setFilter('Todas')
  }

  // SAIR
  async function logout() {
    const confirmed = window.confirm(
      'Deseja realmente sair da sua conta?'
    )

    if (confirmed) {
      await onLogout()
    }
  }

  return (
    <div className={`app-shell ${theme === 'light' ? 'light-theme' : ''}`}>

      <style>{`
        .light-theme {
          background: #f4f4f4 !important;
          color: #202020 !important;
        }

        .light-theme .main-area,
        .light-theme .topbar,
        .light-theme .panel,
        .light-theme .stat-card {
          background: #fff !important;
          color: #202020 !important;
          border-color: #e4e4e4 !important;
        }

        .light-theme .breadcrumb,
        .light-theme .panel p,
        .light-theme .task-info,
        .light-theme .stat-card small {
          color: #555 !important;
        }

        .light-theme input,
        .light-theme select {
          background: #fff !important;
          color: #222 !important;
          border-color: #ddd !important;
        }

        .light-theme .task-row {
          border-color: #eee !important;
        }

        .light-theme .welcome h1,
        .light-theme .panel h2,
        .light-theme .panel h3 {
          color: #222 !important;
        }

        .logout-button {
          color: #ff7777 !important;
        }

        .settings-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 18px;
          margin-top: 22px;
        }

        .setting-card {
          border: 1px solid var(--border-color, #383838);
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .setting-card input,
        .setting-card select {
          width: 100%;
          padding: 11px;
          border-radius: 8px;
          border: 1px solid #555;
          background: #222;
          color: white;
        }

        .setting-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .setting-action button,
        .setting-save {
          border: 0;
          border-radius: 8px;
          padding: 10px 14px;
          background: #facc15;
          color: #171717;
          font-weight: 700;
          cursor: pointer;
        }

        .settings-description {
          color: #aaa;
          font-size: 13px;
          line-height: 1.5;
        }

        .notification-panel {
          position: absolute;
          right: 20px;
          top: 65px;
          z-index: 20;
          width: min(320px, calc(100vw - 35px));
          padding: 18px;
          border-radius: 12px;
          background: #242424;
          color: white;
          border: 1px solid #444;
          box-shadow: 0 12px 35px #0005;
        }

        .notification-panel p {
          font-size: 13px;
          color: #ccc;
        }

        .calendar-day.has-tasks {
          border-bottom: 3px solid #facc15;
        }

        .task-row .task-actions {
          display: flex;
          gap: 5px;
        }

        .task-row .task-actions button {
          background: transparent;
          border: 0;
          color: inherit;
          cursor: pointer;
          padding: 5px;
        }

        .feedback-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 100;
          background: #facc15;
          color: #171717;
          padding: 13px 18px;
          border-radius: 10px;
          font-weight: 700;
          box-shadow: 0 5px 25px #0004;
          max-width: calc(100vw - 48px);
        }

        .modal-heading button {
          cursor: pointer;
        }

        .loading-message {
          padding: 15px;
          margin-bottom: 18px;
          border-radius: 10px;
          background: #facc1518;
          color: #facc15;
        }

        .submit-task:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        @media(max-width: 600px) {
          .settings-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* MENU LATERAL */}

      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>

        <div className="brand">
          <div className="brand-icon">🍌</div>

          <div>
            <strong>banana<span>task</span></strong>
            <small>SEU DIA, NO SEU RITMO</small>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
          >
            <X />
          </button>
        </div>

        <div className="sidebar-label">MENU PRINCIPAL</div>

        <nav>
          {[
            [LayoutDashboard, 'Dashboard'],
            [CheckSquare, 'Tarefas'],
            [CalendarDays, 'Calendário']
          ].map(([Icon, name]) => (
            <button
              key={name}
              className={`nav-link ${page === name ? 'active' : ''}`}
              onClick={() => changePage(name)}
            >
              <Icon size={19} />

              {name === 'Tarefas' ? 'Minhas tarefas' : name}

              {name === 'Tarefas' && (
                <span className="nav-count">{pending}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-tip">
          <div className="tip-banana">🍌</div>
          <strong>Um passo de cada vez!</strong>
          <p>
            Pequenas tarefas, grandes conquistas.
            Continue avançando!
          </p>
        </div>

        <div className="sidebar-bottom">

          <button
            className={`nav-link ${page === 'Configurações' ? 'active' : ''}`}
            onClick={() => changePage('Configurações')}
          >
            <Settings size={19} />
            Configurações
          </button>

          <button
            className="nav-link logout-button"
            onClick={logout}
          >
            <LogOut size={19} />
            Sair da conta
          </button>

          <div className="profile">
            <div className="avatar">{userInitials || 'U'}</div>

            <div>
              <strong>{displayName}</strong>
              <small>{email}</small>
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}

      <main className="main-area">

        <header className="topbar">

          <button
            className="mobile-menu"
            onClick={() => setMobileMenu(true)}
          >
            <Menu />
          </button>

          <div className="breadcrumb">
            Meu espaço <span>/</span> <strong>{page}</strong>
          </div>

          <div className="top-actions">

            <div className="search-box">
              <Search size={17} />

              <input
                placeholder="Buscar tarefas..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />

              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Limpar busca"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>

              <button
                className="icon-button"
                onClick={() => setShowNotifications(value => !value)}
                aria-label="Notificações"
              >
                <Bell size={19} />
                {notifications && pending > 0 && <i />}
              </button>

              {showNotifications && (
                <div className="notification-panel">
                  <strong>Notificações</strong>

                  {notifications ? (
                    <p>
                      Você tem {pending} tarefas que ainda precisam de atenção.
                    </p>
                  ) : (
                    <p>
                      As notificações estão desativadas nas configurações.
                    </p>
                  )}

                  <button
                    className="setting-action"
                    onClick={() => {
                      setShowNotifications(false)
                      changePage('Configurações')
                    }}
                  >
                    Abrir configurações
                  </button>
                </div>
              )}
            </div>

            <div className="avatar top-avatar">
              {userInitials || 'U'}
            </div>
          </div>
        </header>

        <div className="content">

          {/* BOAS-VINDAS */}

          <section className="welcome">

            <div>
              <div className="eyebrow">
                <Sun size={15} />

                {today.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                }).toUpperCase()}
              </div>

              <h1>
                {page === 'Dashboard'
                  ? `Vamos fazer acontecer, ${displayName}!`
                  : page === 'Calendário'
                    ? 'Seu calendário'
                    : page}
              </h1>

              <p>
                Organize suas ideias, cuide do seu tempo
                e aproveite cada conquista.
              </p>
            </div>

            <div className="welcome-art">
              <span>🍌</span>
              <div className="art-spark">✦</div>
            </div>
          </section>

          {loadingTasks && (
            <div className="loading-message">
              <Clock3 size={16} />
              {' '}Carregando suas tarefas da AWS...
            </div>
          )}

          {/* CONFIGURAÇÕES */}

          {page === 'Configurações' ? (

            <section className="panel settings-panel">

              <h2>Configurações</h2>
              <p>Personalize seu espaço de organização.</p>

              <div className="settings-content">

                <form
                  className="setting-card"
                  onSubmit={saveProfile}
                >
                  <User size={23} />

                  <h3>Meu perfil</h3>

                  <p className="settings-description">
                    Altere como seu nome aparece no Banana Task.
                  </p>

                  <label>Nome de exibição</label>

                  <input
                    value={nameInput}
                    onChange={event => setNameInput(event.target.value)}
                    placeholder="Seu nome"
                  />

                  <label>E-mail da conta</label>

                  <input value={email} readOnly />

                  <button className="setting-save" type="submit">
                    <Save size={16} /> Salvar perfil
                  </button>
                </form>

                <div className="setting-card">

                  {theme === 'dark'
                    ? <Moon size={23} />
                    : <Sun size={23} />}

                  <h3>Aparência</h3>

                  <p className="settings-description">
                    Escolha a aparência do seu ambiente de trabalho.
                  </p>

                  <div className="setting-action">
                    <span>
                      {theme === 'dark' ? 'Tema escuro' : 'Tema claro'}
                    </span>

                    <button
                      onClick={() =>
                        setTheme(theme === 'dark' ? 'light' : 'dark')
                      }
                    >
                      Alternar tema
                    </button>
                  </div>
                </div>

                <div className="setting-card">

                  <Bell size={23} />

                  <h3>Notificações</h3>

                  <p className="settings-description">
                    Controle os avisos exibidos no painel.
                  </p>

                  <div className="setting-action">
                    <span>
                      {notifications ? 'Ativadas' : 'Desativadas'}
                    </span>

                    <button
                      onClick={() =>
                        setNotifications(value => !value)
                      }
                    >
                      {notifications ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>

                <div className="setting-card">

                  <CalendarDays size={23} />

                  <h3>Preferências do calendário</h3>

                  <p className="settings-description">
                    Escolha qual dia inicia sua semana.
                  </p>

                  <select
                    value={weekStart}
                    onChange={event => setWeekStart(event.target.value)}
                  >
                    <option value="0">Domingo</option>
                    <option value="1">Segunda-feira</option>
                  </select>

                  <p className="settings-description">
                    A preferência será aplicada ao calendário.
                  </p>
                </div>

                <div className="setting-card">

                  <LogOut size={23} />

                  <h3>Minha conta</h3>

                  <p className="settings-description">
                    Conta autenticada pelo Amazon Cognito.
                  </p>

                  <strong>{email}</strong>

                  <button
                    className="setting-save"
                    onClick={logout}
                  >
                    <LogOut size={16} /> Sair da conta
                  </button>
                </div>

              </div>
            </section>

          ) : (

            <>

              {/* INDICADORES */}

              <section className="stats-grid">

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Tarefas totais</span>
                    <div className="stat-icon yellow">
                      <CheckSquare />
                    </div>
                  </div>

                  <strong>
                    {tasks.length.toString().padStart(2, '0')}
                  </strong>

                  <small>Na sua lista pessoal</small>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Em andamento</span>
                    <div className="stat-icon orange">
                      <Clock3 />
                    </div>
                  </div>

                  <strong>
                    {inProgress.toString().padStart(2, '0')}
                  </strong>

                  <small>Continue no seu ritmo</small>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Concluídas</span>
                    <div className="stat-icon green">
                      <CircleCheck />
                    </div>
                  </div>

                  <strong>
                    {completed.toString().padStart(2, '0')}
                  </strong>

                  <small>Você está avançando!</small>
                </div>

                <div className="stat-card progress-card">
                  <div className="stat-top">
                    <span>Produtividade</span>
                    <div className="stat-icon dark">
                      <ArrowUpRight />
                    </div>
                  </div>

                  <strong>{progress}%</strong>

                  <div className="progress-track">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                </div>

              </section>

              {/* CALENDÁRIO */}

              {page === 'Calendário' ? (

                <section className="calendar-layout">

                  <div className="panel calendar-panel">

                    <div className="panel-heading">

                      <div>
                        <h2>{months[month]} {year}</h2>
                        <p>Escolha um dia para ver suas tarefas</p>
                      </div>

                      <div className="month-actions">
                        <button onClick={() => changeMonth(-1)}>
                          <ChevronLeft />
                        </button>

                        <button onClick={() => changeMonth(1)}>
                          <ChevronRight />
                        </button>
                      </div>

                    </div>

                    <div className="calendar-grid">

                      {calendarWeekdays.map(day => (
                        <div className="weekday" key={day}>
                          {day}
                        </div>
                      ))}

                      {Array.from(
                        { length: calendarOffset },
                        (_, index) => (
                          <div key={`empty-${index}`} />
                        )
                      )}

                      {Array.from(
                        { length: daysInMonth },
                        (_, index) => index + 1
                      ).map(day => {

                        const date =
                          `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                        const count = tasks.filter(
                          task => task.date === date
                        ).length

                        return (
                          <button
                            key={day}
                            className={`calendar-day ${
                              selectedDate === date ? 'selected' : ''
                            } ${
                              date === dateToString(today) ? 'today' : ''
                            } ${
                              count ? 'has-tasks' : ''
                            }`}
                            onClick={() => setSelectedDate(date)}
                          >
                            <span>{day}</span>

                            {count > 0 && (
                              <i className="day-dot">{count}</i>
                            )}
                          </button>
                        )
                      })}

                    </div>

                    <div className="calendar-legend">
                      <span>
                        <i className="legend-yellow" />
                        Dia selecionado
                      </span>

                      <span>
                        <i className="legend-black" />
                        Com tarefas
                      </span>
                    </div>

                  </div>

                  <TaskPanel
                    tasks={filteredTasks}
                    loading={loadingTasks}
                    onAdd={openNewTask}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onEdit={openEditTask}
                    title={`Tarefas de ${selectedDate.split('-').reverse().join('/')}`}
                  />

                </section>

              ) : (

                <section className="dashboard-grid">

                  <TaskPanel
                    tasks={filteredTasks}
                    loading={loadingTasks}
                    onAdd={openNewTask}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onEdit={openEditTask}
                    title={
                      page === 'Dashboard'
                        ? 'Tarefas de hoje'
                        : 'Todas as tarefas'
                    }
                  />

                  <div className="right-column">

                    <div className="panel focus-panel">

                      <div className="focus-emoji">🍌</div>

                      <span className="panel-kicker">
                        FOCO DO DIA
                      </span>

                      <h3>
                        Faça o seu melhor, sem pressa.
                      </h3>

                      <p>
                        O segredo não é fazer tudo de uma vez.
                        É começar!
                      </p>

                      <button onClick={() => changePage('Calendário')}>
                        Ver meu calendário
                        <ArrowUpRight size={16} />
                      </button>

                    </div>

                    <div className="panel category-panel">

                      <h3>Suas categorias</h3>

                      <Category
                        icon={<BookOpen />}
                        name="Estudos"
                        color="purple"
                        count={tasks.filter(
                          task => task.category === 'Estudos'
                        ).length}
                      />

                      <Category
                        icon={<BriefcaseBusiness />}
                        name="Projeto"
                        color="yellow"
                        count={tasks.filter(
                          task => task.category === 'Projeto'
                        ).length}
                      />

                      <Category
                        icon={<Coffee />}
                        name="Pessoal"
                        color="orange"
                        count={tasks.filter(
                          task => task.category === 'Pessoal'
                        ).length}
                      />

                    </div>
                  </div>

                </section>
              )}

            </>
          )}

        </div>
      </main>

      {/* MODAL DE TAREFAS */}

      {showModal && (

        <div
          className="modal-backdrop"
          onClick={() => !savingTask && setShowModal(false)}
        >

          <form
            className="task-modal"
            onSubmit={saveTask}
            onClick={event => event.stopPropagation()}
          >

            <div className="modal-heading">

              <div>
                <span className="panel-kicker">
                  {editingTask ? 'EDITAR TAREFA' : 'NOVA ORGANIZAÇÃO'}
                </span>

                <h2>
                  {editingTask
                    ? 'Editar tarefa'
                    : 'Adicionar tarefa 🍌'}
                </h2>
              </div>

              <button
                type="button"
                disabled={savingTask}
                onClick={() => setShowModal(false)}
              >
                <X />
              </button>

            </div>

            <label>
              Nome da tarefa

              <input
                name="title"
                placeholder="O que você precisa fazer?"
                defaultValue={editingTask?.title || ''}
                required
              />
            </label>

            <div className="form-row">

              <label>
                Categoria

                <select
                  name="category"
                  defaultValue={editingTask?.category || 'Estudos'}
                >
                  <option>Estudos</option>
                  <option>Projeto</option>
                  <option>Pessoal</option>
                  <option>Trabalho</option>
                </select>
              </label>

              <label>
                Prioridade

                <select
                  name="priority"
                  defaultValue={editingTask?.priority || 'Média'}
                >
                  <option>Alta</option>
                  <option>Média</option>
                  <option>Baixa</option>
                </select>
              </label>

            </div>

            <div className="form-row">

              <label>
                Horário

                <input
                  name="time"
                  type="time"
                  defaultValue={editingTask?.time || '09:00'}
                />
              </label>

              <label>
                Data

                <input
                  name="date"
                  type="date"
                  defaultValue={editingTask?.date || selectedDate}
                  required
                />
              </label>

            </div>

            <button
              className="submit-task"
              type="submit"
              disabled={savingTask}
            >
              <Save size={18} />

              {savingTask
                ? 'Salvando na AWS...'
                : editingTask
                  ? 'Salvar alterações'
                  : 'Salvar tarefa'}
            </button>

          </form>
        </div>
      )}

      {/* MENSAGEM DE FEEDBACK */}

      {feedback && (
        <div className="feedback-toast">
          <Check size={17} />
          {' '}{feedback}
        </div>
      )}

    </div>
  )
}

// COMPONENTE DE LISTAGEM DE TAREFAS

function TaskPanel({
  tasks,
  loading,
  onAdd,
  onToggle,
  onDelete,
  onEdit,
  title
}) {
  const [filter, setFilter] = useState('Todas')

  const filtered = tasks.filter(task =>
    filter === 'Todas' || task.status === filter
  )

  return (

    <div className="panel tasks-panel">

      <div className="panel-heading">

        <div>
          <h2>{title}</h2>
          <p>Pequenos passos fazem a diferença</p>
        </div>

        <button
          className="add-button"
          onClick={onAdd}
          disabled={loading}
        >
          <Plus size={17} />
          Nova tarefa
        </button>

      </div>

      <div className="task-filters">

        {['Todas', 'Pendente', 'Em andamento', 'Concluída'].map(status => (

          <button
            key={status}
            className={filter === status ? 'filter-active' : ''}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>

        ))}

      </div>

      <div className="task-list">

        {loading ? (

          <div className="empty-state">
            <span>🍌</span>
            <strong>Carregando tarefas...</strong>
            <p>Buscando seus dados na AWS.</p>
          </div>

        ) : filtered.length === 0 ? (

          <div className="empty-state">
            <span>🍌</span>
            <strong>Nenhuma tarefa por aqui!</strong>
            <p>Adicione uma nova tarefa para começar.</p>
          </div>

        ) : (

          filtered.map(task => (

            <div
              className={`task-row ${
                task.status === 'Concluída' ? 'task-done' : ''
              }`}
              key={task.id}
            >

              <button
                className={`task-check ${
                  task.status === 'Concluída' ? 'checked' : ''
                }`}
                onClick={() => onToggle(task.id)}
                title="Alterar conclusão"
              >
                {task.status === 'Concluída' && (
                  <Check size={13} />
                )}
              </button>

              <div className="task-info">

                <strong>{task.title}</strong>

                <div>

                  <span className={`category-tag ${
                    (task.category || 'Estudos').toLowerCase()
                  }`}>
                    {task.category}
                  </span>

                  <span className="task-time">
                    <Clock3 size={12} />
                    {task.time}
                  </span>

                  <span className="task-time">
                    {task.date
                      ? task.date.split('-').reverse().join('/')
                      : ''}
                  </span>

                </div>
              </div>

              <span className={`priority ${
                (task.priority || 'Média').toLowerCase()
              }`}>
                {task.priority}
              </span>

              <div className="task-actions">

                <button
                  title="Editar tarefa"
                  onClick={() => onEdit(task)}
                >
                  <Pencil size={15} />
                </button>

                <button
                  title="Excluir tarefa"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 size={15} />
                </button>

              </div>

            </div>

          ))

        )}

      </div>

      <div className="task-footer">
        <span>{filtered.length} tarefas exibidas</span>
        <span>🍌 Um dia de cada vez</span>
      </div>

    </div>
  )
}

// COMPONENTE DE CATEGORIAS

function Category({ icon, name, color, count }) {
  return (
    <div className="category-row">

      <div className={`category-icon ${color}`}>
        {icon}
      </div>

      <strong>{name}</strong>

      <span>{count} tarefas</span>

    </div>
  )
}

export default App
