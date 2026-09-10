'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    checkAndRedirect()
  }, [])

  const checkAndRedirect = async () => {
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

    if (officeUser) {
      router.push('/dashboard')
    } else {
      router.push('/timesheet')
    }
  }

  return <div className="flex min-h-screen items-center justify-center text-gray-700">Loading...</div>
}