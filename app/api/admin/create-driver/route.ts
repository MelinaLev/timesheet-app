import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const { name, email, pin, ownerOpId } = await req.json()

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

  const { data: officeUser } = await supabaseAdmin
    .from('office_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!officeUser) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Create the auth user server-side — does NOT affect the admin's session
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
  })

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message || 'Could not create login.' }, { status: 400 })
  }

  const { error: driverError } = await supabaseAdmin.from('drivers').insert({
    name,
    active: true,
    owner_operator_company_id: Number(ownerOpId),
    auth_user_id: newUser.user.id,
  })

  if (driverError) {
    return NextResponse.json({ error: 'Login created, but driver record failed: ' + driverError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}