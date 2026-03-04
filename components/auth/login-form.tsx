'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Use the explicit app URL env var so auth redirects work on Vercel.
  // Falls back to window.location.origin for local dev.
  function getRedirectUrl() {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    return `${base}/auth/callback`
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getRedirectUrl() },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectUrl() },
    })
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
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <h2 className="font-semibold text-[#e8e8f0] mb-1">Check your email</h2>
              <p className="text-sm text-[#8888a8]">
                We sent a magic link to <strong className="text-[#e8e8f0]">{email}</strong>
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-4"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleMagicLink} className="space-y-4">
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
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Sending...' : 'Continue with Email'}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2a2a3a]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#111118] px-3 text-xs text-[#8888a8]">or</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogle}>
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#4a4a6a] mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
