'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Ticket = {
  id: number
  date: string
  ticket_number: string
  location: string
  start_time: string
  end_time: string
  hours: number
  new_company_name: string | null
  companies: { name: string } | null
  trucks: { truck_number: string } | null
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatLocalDate(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return formatLocalDate(d)
}

export default function MyTimesheetsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTickets(weekStart)
  }, [weekStart])

  const loadTickets = async (start: string) => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()

    if (!driver) {
      setLoading(false)
      return
    }

    const sunday = parseLocalDate(start)
    sunday.setDate(sunday.getDate() + 6)
    const sundayStr = formatLocalDate(sunday)

    const { data } = await supabase
      .from('timesheets')
      .select(`
        id, date, ticket_number, location, start_time, end_time, hours,
        new_company_name,
        companies ( name ),
        trucks ( truck_number )
      `)
      .eq('driver_id', driver.id)
      .gte('date', start)
      .lte('date', sundayStr)
      .order('date', { ascending: true })

    if (data) setTickets(data as unknown as Ticket[])
    setLoading(false)
  }

    const changeWeek = (direction: number) => {
        const current = parseLocalDate(weekStart)
        current.setDate(current.getDate() + direction * 7)
        setWeekStart(getMonday(current))
        }

  const totalHours = tickets.reduce((sum, t) => sum + Number(t.hours || 0), 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Timesheets</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200 flex items-center justify-between">
        <button
          onClick={() => changeWeek(-1)}
          className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 font-medium hover:bg-gray-300"
        >
          ← Previous Week
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-900">Week of {weekStart}</p>
          <p className="text-sm text-gray-600">Total hours: {totalHours.toFixed(2)}</p>
        </div>
        <button
          onClick={() => changeWeek(1)}
          className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 font-medium hover:bg-gray-300"
        >
          Next Week →
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        {loading ? (
          <p className="text-gray-600 text-sm">Loading...</p>
        ) : tickets.length === 0 ? (
          <p className="text-gray-600 text-sm">No tickets submitted this week.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-900">{t.date}</span>
                  <span className="text-sm font-medium text-gray-900">{t.hours} hrs</span>
                </div>
                <p className="text-sm text-gray-700">
                  {t.companies?.name || t.new_company_name} — {t.location}
                </p>
                <p className="text-xs text-gray-500">
                  Truck {t.trucks?.truck_number} · Ticket #{t.ticket_number} · {t.start_time}–{t.end_time}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}