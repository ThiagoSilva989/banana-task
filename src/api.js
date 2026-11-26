
import { fetchAuthSession } from 'aws-amplify/auth'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error('Endereço da API não configurado.')
  }

  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken?.toString()

  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Erro na API: ${response.status}`
    )
  }

  return data
}

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.titulo,
    category: task.categoria || 'Estudos',
    time: task.horario || '09:00',
    date: task.data || new Date().toISOString().slice(0, 10),
    priority: task.prioridade || 'Média',
    status: task.status || 'Pendente',
  }
}

function toApiTask(task) {
  return {
    titulo: task.title,
    categoria: task.category,
    horario: task.time,
    data: task.date,
    prioridade: task.priority,
    status: task.status,
  }
}

export async function listTasks() {
  const data = await request('/tarefas')

  if (!Array.isArray(data)) {
    throw new Error('A API retornou uma lista inválida.')
  }

  return data.map(normalizeTask)
}

export async function createTask(task) {
  const data = await request('/tarefas', {
    method: 'POST',
    body: JSON.stringify(toApiTask(task)),
  })

  return normalizeTask(data)
}

export async function updateTask(id, task) {
  const data = await request(`/tarefas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(toApiTask(task)),
  })

  return normalizeTask(data)
}

export async function removeTask(id) {
  return request(`/tarefas/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
