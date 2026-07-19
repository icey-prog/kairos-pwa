import { API } from './api'

const TOKEN_KEY = 'mile_user_token'
const USERNAME_KEY = 'mile_username'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const getUsername = () => localStorage.getItem(USERNAME_KEY)

export const signup = async (username) => {
  const res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `${res.status} ${res.statusText}`)
  }
  const user = await res.json()
  localStorage.setItem(TOKEN_KEY, user.token)
  localStorage.setItem(USERNAME_KEY, user.username)
  return user
}

// Connexion par token existant (ex: compte admin migré, changement d'appareil).
// Valide le token via /auth/me avant de le stocker.
export const loginWithToken = async (token) => {
  const res = await fetch(`${API}/auth/me`, { headers: { 'X-User-Token': token.trim() } })
  if (!res.ok) throw new Error(res.status === 401 ? 'Token invalide.' : `${res.status} ${res.statusText}`)
  const user = await res.json()
  localStorage.setItem(TOKEN_KEY, token.trim())
  localStorage.setItem(USERNAME_KEY, user.username)
  return user
}

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  // ponytail: pas de flag "onboarded" séparé — l'onboarding se redérive de
  // l'état réel (GET /user/disciplines vide) au prochain login.
  window.location.reload()
}
