'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TimesheetRow = {
  id: number
  date: string
  ticket_number: string
  location: string
  start_time: string
  end_time: string
  hours: number
  status: string
  submitted_at: string
  drivers: { name: string } | null
  trucks: { truck_number: string } | null
  companies: { name: string } | null
  new_company_name: string | null
  notes: string | null
}

function getWeekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day // shift Sunday back to previous Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function DashboardPage() {
  const router = useRouter()
  const [rows, setRows] = useState<TimesheetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null)

  const [weekStart, setWeekStart] = useState(formatDate(getWeekStart(new Date())))

  

  const truckSummaries = rows.reduce((acc, r) => {
    const key = r.trucks?.truck_number || 'Unknown'
    if (!acc[key]) {
        acc[key] = { truckNumber: key, totalHours: 0, ticketCount: 0, rows: [] as TimesheetRow[] }
    }
    acc[key].totalHours += Number(r.hours || 0)
    acc[key].ticketCount += 1
    acc[key].rows.push(r)
    return acc
    }, {} as Record<string, { truckNumber: string; totalHours: number; ticketCount: number; rows: TimesheetRow[] }>)

    const truckList = Object.values(truckSummaries).sort((a, b) => a.truckNumber.localeCompare(b.truckNumber))

  const loadWeek = async (start: string) => {
    setLoading(true)
    const startDate = new Date(start)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)

    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        id, date, ticket_number, location, start_time, end_time, hours, status, submitted_at,
        new_company_name,
        drivers ( name ),
        trucks ( truck_number ),
        companies ( name ), 
        notes
      `)
      .gte('date', start)
      .lte('date', formatDate(endDate))
      .order('date', { ascending: true })

    if (!error && data) {
      setRows(data as unknown as TimesheetRow[])
    }
    setLoading(false)
  }

  const changeWeek = (direction: number) => {
    const current = new Date(weekStart)
    current.setDate(current.getDate() + direction * 7)
    const newStart = formatDate(current)
    setWeekStart(newStart)
    loadWeek(newStart)
  }



  const totalHours = rows.reduce((sum, r) => sum + Number(r.hours || 0), 0)

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
            <div className="flex gap-4 items-center">
                <a href="/reports" className="text-sm text-blue-600 underline">Reports</a>
            </div>
        </div>

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

        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {loading ? (
                <p className="p-4 text-gray-600">Loading timesheets...</p>
            ) : truckList.length === 0 ? (
                <p className="p-4 text-gray-600">No timesheets submitted for this week.</p>
            ) : (
                <div className="divide-y divide-gray-100">
                {truckList.map((t) => (
                    <div key={t.truckNumber}>
                    <button
                        onClick={() => setExpandedTruck(expandedTruck === t.truckNumber ? null : t.truckNumber)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                    >
                        <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-900">Truck {t.truckNumber}</span>
                        <span className="text-sm text-gray-600">{t.ticketCount} ticket{t.ticketCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-900">{t.totalHours.toFixed(2)} hrs</span>
                        <span className="text-gray-400">{expandedTruck === t.truckNumber ? '▲' : '▼'}</span>
                        </div>
                    </button>

                    {expandedTruck === t.truckNumber && (
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left p-3 text-gray-700 font-semibold">Date</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">Driver</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">Company</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">Location</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">Ticket #</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">Start</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">End</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">Hours</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">Notes</th>
                                <th className="text-left p-3 text-gray-700 font-semibold">Submitted</th>

                            </tr>
                            </thead>
                            <tbody>
                            {t.rows.map((r) => (
                                <tr key={r.id} className="border-b border-gray-100">
                                <td className="p-3 text-gray-900">{r.date}</td>
                                <td className="p-3 text-gray-900">{r.drivers?.name || '—'}</td>
                                <td className="p-3 text-gray-900">
                                    {r.companies?.name || r.new_company_name || '—'}
                                    {!r.companies?.name && r.new_company_name && (
                                    <span className="ml-1 text-xs text-orange-600 font-medium">(new)</span>
                                    )}
                                </td>
                                <td className="p-3 text-gray-900">{r.location}</td>
                                <td className="p-3 text-gray-900">{r.ticket_number}</td>
                                <td className="p-3 text-gray-900">{r.start_time}</td>
                                <td className="p-3 text-gray-900">{r.end_time}</td>
                                <td className="p-3 text-gray-900">{r.hours}</td>
                                <td className="p-3 text-gray-900">{r.notes || '—'}</td>
                                <td className="p-3 text-gray-600 text-xs">{new Date(r.submitted_at).toLocaleString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                    </div>
                ))}
                </div>
            )}
            </div>
      </div>
    </div>
  )
}