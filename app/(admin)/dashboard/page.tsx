'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalTrucks: 0,
    totalCompanies: 0,
    hoursThisWeek: 0,
    ticketsThisWeek: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(monday.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    const mondayStr = monday.toISOString().split('T')[0]

    const [driversRes, trucksRes, companiesRes, timesheetsRes] = await Promise.all([
      supabase.from('drivers').select('id', { count: 'exact', head: true }),
      supabase.from('trucks').select('id', { count: 'exact', head: true }),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('timesheets').select('hours').gte('date', mondayStr),
    ])

    const hoursThisWeek = (timesheetsRes.data || []).reduce(
      (sum, r) => sum + Number(r.hours || 0),
      0
    )

    setStats({
      totalDrivers: driversRes.count || 0,
      totalTrucks: trucksRes.count || 0,
      totalCompanies: companiesRes.count || 0,
      hoursThisWeek,
      ticketsThisWeek: (timesheetsRes.data || []).length,
    })
    setLoading(false)
  }

  const cards = [
    { label: 'Total Drivers', value: stats.totalDrivers },
    { label: 'Total Trucks', value: stats.totalTrucks },
    { label: 'Total Companies', value: stats.totalCompanies },
    { label: 'Tickets This Week', value: stats.ticketsThisWeek },
    { label: 'Hours This Week', value: stats.hoursThisWeek.toFixed(1) },
  ]

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-600 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}