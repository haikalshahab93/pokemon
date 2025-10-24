const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getToken() {
  try { return localStorage.getItem('token') || '' } catch { return '' }
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const auth = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${method} ${path} gagal: ${res.status} ${text}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export const api = {
  async getUser(username) {
    if (!username) throw new Error('username kosong')
    return request(`/users/${encodeURIComponent(username)}`)
  },
  async upsertUser(username) {
    if (!username) throw new Error('username kosong')
    return request(`/users`, { method: 'POST', body: { username } })
  },
  async applyReward(username, payload) {
    if (!username) throw new Error('username kosong')
    return request(`/users/${encodeURIComponent(username)}/reward`, { method: 'POST', body: payload })
  },
  async register(username, password) {
    return request(`/auth/register`, { method: 'POST', body: { username, password } })
  },
  async login(username, password) {
    const res = await request(`/auth/login`, { method: 'POST', body: { username, password } })
    const token = res?.token
    if (token) localStorage.setItem('token', token)
    return res
  },
}