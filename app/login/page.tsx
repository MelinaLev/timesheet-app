'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    })

    setLoading(false)

    if (error) {
      setError('Incorrect email or PIN. Please try again.')
      return
    }

    router.push('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow-lg border border-gray-200"
      >
        <h1 className="text-2xl font-bold text-center text-gray-900">Login</h1>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-800">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-800">PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none"
          />
        </div>

        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  )
}