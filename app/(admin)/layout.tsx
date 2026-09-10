'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Timesheets', href: '/timesheets' },
  { label: 'Owner Ops', href: '/owner-ops' },
  { label: 'Drivers', href: '/drivers' },
  { label: 'Trucks', href: '/trucks' },
  { label: 'Companies', href: '/companies' },
  { label: 'Reports', href: '/reports' },

]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [isOffice, setIsOffice] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: officeUser } = await supabase
      .from('office_users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()

    if (!officeUser) {
      setIsOffice(false)
      setChecking(false)
      return
    }

    setIsOffice(true)
    setChecking(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-gray-700">Loading...</div>
  }

  if (!isOffice) {
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
      <main className="flex-1 overflow-x-auto">{children}</main>
    </div>
  )
}