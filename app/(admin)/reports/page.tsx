'use client'

import { useEffect, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'


type TimesheetRow = {
  id: number
  date: string
  hours: number
  location: string
  drivers: { name: string } | null
  companies: { name: string } | null
  new_company_name: string | null
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}


function getDefaultStart() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return formatDate(d)
}

export default function ReportsPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isOffice, setIsOffice] = useState(false)
  const [rows, setRows] = useState<TimesheetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

  const [startDate, setStartDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reports_start_date')
      if (saved) return saved
    }
    return getDefaultStart()
  })
  const [endDate, setEndDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reports_end_date')
      if (saved) return saved
    }
    return formatDate(new Date())
  })



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
    loadData(startDate, endDate)
  }

  const loadData = async (start: string, end: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        id, date, hours, location, 
        new_company_name,
        drivers ( name ),
        companies ( name )
      `)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })

    if (!error && data) {
      setRows(data as unknown as TimesheetRow[])
    }
    setLoading(false)
  }



  const handleFilter = () => {
  localStorage.setItem('reports_start_date', startDate)
  localStorage.setItem('reports_end_date', endDate)
  loadData(startDate, endDate)
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

  // Hours per day
  const hoursByDay = rows.reduce((acc, r) => {
    acc[r.date] = (acc[r.date] || 0) + Number(r.hours || 0)
    return acc
  }, {} as Record<string, number>)
  const dayList = Object.entries(hoursByDay).sort(([a], [b]) => a.localeCompare(b))
  const maxDayHours = Math.max(...dayList.map(([, h]) => h), 1)

  // Hours by driver
  const byDriver = rows.reduce((acc, r) => {
    const key = r.drivers?.name || 'Unknown'
    if (!acc[key]) acc[key] = { hours: 0, tickets: 0 }
    acc[key].hours += Number(r.hours || 0)
    acc[key].tickets += 1
    return acc
  }, {} as Record<string, { hours: number; tickets: number }>)
  const driverList = Object.entries(byDriver).sort(([, a], [, b]) => b.hours - a.hours)

  const getDriverDailyBreakdown = (driverName: string) => {
    const driverRows = rows.filter((r) => (r.drivers?.name || 'Unknown') === driverName)
    const byDay = driverRows.reduce((acc, r) => {
      acc[r.date] = (acc[r.date] || 0) + Number(r.hours || 0)
      return acc
    }, {} as Record<string, number>)
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
  }

  const getCompanyLocationBreakdown = (companyName: string) => {
    const companyRows = rows.filter((r) => (r.companies?.name || r.new_company_name || 'Unlisted') === companyName)
    const byLocation = companyRows.reduce((acc, r) => {
      if (!acc[r.location]) acc[r.location] = { hours: 0, tickets: 0 }
      acc[r.location].hours += Number(r.hours || 0)
      acc[r.location].tickets += 1
      return acc
    }, {} as Record<string, { hours: number; tickets: number }>)
    return Object.entries(byLocation).sort(([, a], [, b]) => b.hours - a.hours)
  }

  // Jobs by company
  const byCompany = rows.reduce((acc, r) => {
    const key = r.companies?.name || r.new_company_name || 'Unlisted'
    if (!acc[key]) acc[key] = { hours: 0, tickets: 0 }
    acc[key].hours += Number(r.hours || 0)
    acc[key].tickets += 1
    return acc
  }, {} as Record<string, { hours: number; tickets: number }>)
  const companyList = Object.entries(byCompany).sort(([, a], [, b]) => b.hours - a.hours)

  const totalHours = rows.reduce((sum, r) => sum + Number(r.hours || 0), 0)

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <div className="flex gap-4 items-center">
            <a href="/dashboard" className="text-sm text-blue-600 underline">Dashboard</a>
            <button onClick={handleLogout} className="text-sm text-blue-600 underline">Log out</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>
          <button
            onClick={handleFilter}
            className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
          >
            Apply
          </button>
          <div className="ml-auto text-sm text-gray-700">
            Total hours in range: <span className="font-semibold">{totalHours.toFixed(2)}</span>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading report data...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hours per day */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Hours Per Day</h2>
              {dayList.length === 0 ? (
                <p className="text-gray-600 text-sm">No data in this range.</p>
              ) : (
                <div className="space-y-2">
                  {dayList.map(([date, hours]) => (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-24 shrink-0">{date}</span>
                      <div className="flex-1 bg-gray-100 rounded h-5 relative">
                        <div
                          className="bg-blue-600 h-5 rounded"
                          style={{ width: `${(hours / maxDayHours) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-14 text-right">{hours.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jobs by company */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Jobs by Company</h2>
              {companyList.length === 0 ? (
                <p className="text-gray-600 text-sm">No data in this range.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 text-gray-700 font-semibold">Company</th>
                      <th className="text-right py-2 text-gray-700 font-semibold">Tickets</th>
                      <th className="text-right py-2 text-gray-700 font-semibold">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyList.map(([name, data]) => (
                      <Fragment key={name}>
                        <tr
                          onClick={() => setExpandedCompany(expandedCompany === name ? null : name)}
                          className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                        >
                          <td className="py-2 text-gray-900">{name}</td>
                          <td className="py-2 text-right text-gray-900">{data.tickets}</td>
                          <td className="py-2 text-right text-gray-900">{data.hours.toFixed(2)}</td>
                        </tr>
                        {expandedCompany === name && (
                          <tr>
                            <td colSpan={3} className="bg-gray-50 p-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2">By location</p>
                              <div className="space-y-1">
                                {getCompanyLocationBreakdown(name).map(([location, data]) => (
                                  <div key={location} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{location || '(no location)'}</span>
                                    <span className="text-gray-900 font-medium">
                                      {data.tickets} ticket{data.tickets !== 1 ? 's' : ''} · {data.hours.toFixed(2)} hrs
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Hours by driver */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Hours by Driver</h2>
              {driverList.length === 0 ? (
                <p className="text-gray-600 text-sm">No data in this range.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 text-gray-700 font-semibold">Driver</th>
                      <th className="text-right py-2 text-gray-700 font-semibold">Tickets</th>
                      <th className="text-right py-2 text-gray-700 font-semibold">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverList.map(([name, data]) => (
                      <Fragment key={name}>
                        <tr
                          onClick={() => setExpandedDriver(expandedDriver === name ? null : name)}
                          className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                        >
                          <td className="py-2 text-gray-900">{name}</td>
                          <td className="py-2 text-right text-gray-900">{data.tickets}</td>
                          <td className="py-2 text-right text-gray-900">{data.hours.toFixed(2)}</td>
                        </tr>
                        {expandedDriver === name && (
                          <tr>
                            <td colSpan={3} className="bg-gray-50 p-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Daily breakdown</p>
                              <div className="space-y-1">
                                {getDriverDailyBreakdown(name).map(([date, hours]) => (
                                  <div key={date} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{date}</span>
                                    <span className="text-gray-900 font-medium">{hours.toFixed(2)} hrs</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>

                          
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}