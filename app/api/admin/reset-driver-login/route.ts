import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const { authUserId, newEmail, newPin } = await req.json()

  // Verify the requester is a logged-in office user
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

    const { data: officeUser, error: officeError } = await supabaseAdmin
    .from('office_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

    console.log('Checking auth_user_id:', user.id, 'Found:', officeUser, 'Error:', officeError)

    if (!officeUser) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Perform the actual reset
  const updates: { email?: string; password?: string } = {}
  if (newEmail) updates.email = newEmail
  if (newPin) updates.password = newPin

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, updates)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

