'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        window.location.href = '/today'
      }
    } else {
      // Use server-side admin route so no confirmation email is sent (avoids rate limits).
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Signup failed.')
      } else {
        // Sign in immediately after account creation.
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) {
          setSuccess('Account created! Please sign in.')
          setMode('login')
        } else {
          window.location.href = '/today'
        }
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 mb-4">
            <Flame size={28} className="text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#e8e8f0]">GrindKeeper</h1>
          <p className="text-sm text-[#8888a8] mt-1">Build habits. Keep streaks. Own your day.</p>
        </div>

        {/* Card */}
        <div className="bg-[#111118] border border-[#2a2a3a] rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-[#e8e8f0] mb-4">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          {success && <p className="text-sm text-green-400 mb-3">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-[#8888a8] mt-4">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              className="text-indigo-400 hover:text-indigo-300"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-[#4a4a6a] mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
