import { useState } from 'react'
import { motion } from 'framer-motion'
import { signup } from '../lib/auth'

export default function AuthGate({ onSignedUp }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = username.trim()
    if (trimmed.length < 2) {
      setError('2 caractères minimum.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signup(trimmed)
      onSignedUp()
    } catch (err) {
      setError(err.message || 'Inscription impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[var(--color-background)] flex flex-col justify-center px-6 py-12"
    >
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      <div className="max-w-sm mx-auto w-full">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
            <p className="text-xs font-semibold text-[#007AFF] uppercase tracking-widest">
              Neuro-Kaizen · Bienvenue
            </p>
          </div>
          <h1 className="text-[2.25rem] font-bold text-[var(--color-foreground)] leading-tight tracking-tight">
            Choisis<br />ton pseudo
          </h1>
          <p className="mt-3 text-[15px] text-[var(--color-muted-foreground)] leading-relaxed">
            Tes notes, cartes et progression te seront propres — invisibles aux autres testeurs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex : icey"
            maxLength={50}
            className="w-full px-5 py-4 rounded-2xl bg-[var(--color-secondary)] text-[var(--color-foreground)] text-[15px] outline-none focus:ring-2 focus:ring-[#007AFF]"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] disabled:opacity-50 transition-transform duration-200 active:scale-[0.98]"
          >
            {loading ? 'Création…' : 'Entrer'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}
