'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV_ITEMS = [
  { label: 'New Ticket', href: '/timesheet' },
  { label: 'My Timesheets', href: '/my-timesheets' },
]

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [isDriver, setIsDriver] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()

    if (!driver) {
      setIsDriver(false)
      setChecking(false)
      return
    }

    setIsDriver(true)
    setChecking(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-gray-700">Loading...</div>
  }

  if (!isDriver) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-600 font-medium">
        You do not have access to this page.
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <p className="font-bold text-lg text-gray-900">Long Star Trucking</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 text-sm font-medium ${
                pathname === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full text-left rounded px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto px-4 py-8">{children}</main>
    </div>
  )
}