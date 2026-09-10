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
  const [menuOpen, setMenuOpen] = useState(false)

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
  <div className="min-h-screen bg-gray-100">
    {/* Mobile top bar */}
    <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
      <p className="font-bold text-lg text-gray-900">Long Star Trucking</p>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="text-gray-700 p-2"
        aria-label="Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>

    <div className="flex">
      {/* Sidebar: overlay on mobile when open, always visible on desktop */}
      <aside
        className={`${
          menuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-56 bg-white border-r border-gray-200 flex-col fixed md:static top-[57px] md:top-0 left-0 right-0 bottom-0 z-20 md:z-auto`}
      >
        <div className="hidden md:block p-5 border-b border-gray-200">
          <p className="font-bold text-lg text-gray-900">Long Star Trucking</p>
        </div>
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
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
  </div>
)
}