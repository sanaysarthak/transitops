'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '../actions'
import { Lock, Mail, AlertTriangle, Truck, UserCheck, Shield, DollarSign, User } from 'lucide-react'

const ROLES = [
  {
    value: 'fleet_manager',
    label: 'Fleet Manager',
    description: 'Full CRUD access to monitor & operate all vehicles and trips.',
    icon: Truck,
  },
  {
    value: 'driver',
    label: 'Driver',
    description: 'View assigned trips and update distance and fuel records.',
    icon: User,
  },
  {
    value: 'safety_officer',
    label: 'Safety Officer',
    description: 'Manage drivers, license expirations, and safety scores.',
    icon: Shield,
  },
  {
    value: 'financial_analyst',
    label: 'Financial Analyst',
    description: 'Read-only access to view charts, ROI, and export reports.',
    icon: DollarSign,
  },
]

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState('fleet_manager')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    formData.set('role', selectedRole)

    const result = await signup(formData)

    if (result && result.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 mb-4">
            <UserCheck className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Choose your profile type to register on TransitOps
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3 pl-10 pr-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3 pl-10 pr-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Select Your Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ROLES.map((role) => {
                const Icon = role.icon
                const isSelected = selectedRole === role.value
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`flex flex-col items-start text-left p-4 rounded-xl border transition-all duration-200 group ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-indigo-500/10 shadow-lg'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg mb-3 border ${
                      isSelected
                        ? 'bg-indigo-500 text-white border-indigo-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 group-hover:text-slate-300'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold mb-1">{role.label}</span>
                    <span className="text-xs text-slate-400 leading-normal">{role.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
