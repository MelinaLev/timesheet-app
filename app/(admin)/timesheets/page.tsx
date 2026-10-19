'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TimesheetRow = {
  id: number
  driver_id: number
  truck_id: number | null
  company_id: number | null
  date: string
  ticket_number: string
  location: string
  start_time: string
  end_time: string
  hours: number
  notes: string | null 
  verified: boolean
  new_company_name: string | null
  submitted_at: string
  drivers: { name: string } | null
  trucks: { truck_number: string } | null
  companies: { name: string } | null

}

type Truck = { id: number; truck_number: string }
type Company = { id: number; name: string }

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const displayHour = h % 12 === 0 ? 12 : h % 12
  const label = `${displayHour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  return { value, label }
})

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return formatLocalDate(d)
}

function calcHours(start: string, end: string) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let s = sh * 60 + sm
  let e = eh * 60 + em
  if (e < s) e += 24 * 60
  return ((e - s) / 60).toFixed(2)
}

export default function TimesheetsPage() {
  const [rows, setRows] = useState<TimesheetRow[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null)

  // edit modal state
  const [editing, setEditing] = useState<TimesheetRow | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTruckId, setEditTruckId] = useState('')
  const [editCompanyText, setEditCompanyText] = useState('')
  const [editTicketNumber, setEditTicketNumber] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    loadWeek(weekStart)
  }, [weekStart])

  useEffect(() => {
    const loadLists = async () => {
      const [trucksRes, companiesRes] = await Promise.all([
        supabase.from('trucks').select('id, truck_number').order('truck_number'),
        supabase.from('companies').select('id, name').order('name'),
      ])
      if (trucksRes.data) setTrucks(trucksRes.data)
      if (companiesRes.data) setCompanies(companiesRes.data)
    }
    loadLists()
  }, [])

  const loadWeek = async (start: string) => {
    setLoading(true)
    const end = parseLocalDate(start)
    end.setDate(end.getDate() + 6)

    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        id, driver_id, truck_id, company_id, date, ticket_number, location,
        start_time, end_time, hours, notes, new_company_name, submitted_at,
        drivers ( name ),
        trucks ( truck_number ),
        companies ( name ), verified
      `)
      .gte('date', start)
      .lte('date', formatLocalDate(end))

    if (!error && data) {
      const sorted = (data as unknown as TimesheetRow[]).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.ticket_number.localeCompare(b.ticket_number, undefined, { numeric: true })
      })
      setRows(sorted)
    }
    setLoading(false)
  }

  const changeWeek = (direction: number) => {
    const current = parseLocalDate(weekStart)
    current.setDate(current.getDate() + direction * 7)
    setWeekStart(getMonday(current))
  }

  const startEdit = (r: TimesheetRow) => {
    setEditing(r)
    setEditDate(r.date)
    setEditTruckId(r.truck_id ? String(r.truck_id) : '')
    setEditCompanyText(r.companies?.name || r.new_company_name || '')
    setEditTicketNumber(r.ticket_number)
    setEditLocation(r.location)
    setEditStart(r.start_time?.slice(0, 5) || '')
    setEditEnd(r.end_time?.slice(0, 5) || '')
    setEditNotes(r.notes || '')
    setEditError('')
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    setEditError('')

    const typed = editCompanyText.trim()
    const matched = companies.find((c) => c.name.toLowerCase() === typed.toLowerCase())

    const { error } = await supabase
      .from('timesheets')
      .update({
        date: editDate,
        truck_id: editTruckId ? Number(editTruckId) : null,
        company_id: matched ? matched.id : null,
        new_company_name: matched ? null : typed || null,
        ticket_number: editTicketNumber,
        location: editLocation,
        start_time: editStart,
        end_time: editEnd,
        hours: Number(calcHours(editStart, editEnd)),
        notes: editNotes || null,
      })
      .eq('id', editing.id)

    setSaving(false)

    if (error) {
      setEditError('Could not save: ' + error.message)
      return
    }

    setEditing(null)
    loadWeek(weekStart)
  }

  const handleDelete = async (r: TimesheetRow) => {
    const ok = confirm(
      `Delete ticket #${r.ticket_number} (${r.drivers?.name || 'unknown driver'}, ${r.date})? This cannot be undone.`
    )
    if (!ok) return

    setDeletingId(r.id)
    const { error } = await supabase.from('timesheets').delete().eq('id', r.id)
    setDeletingId(null)

    if (error) {
      alert('Could not delete: ' + error.message)
      return
    }
    loadWeek(weekStart)
  }

  const toggleVerified = async (r: TimesheetRow) => {
  const next = !r.verified
  setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, verified: next } : x)))

  const { error } = await supabase
    .from('timesheets')
    .update({ verified: next })
    .eq('id', r.id)

  if (error) {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, verified: !next } : x)))
    alert('Could not update: ' + error.message)
  }
}
  

  // Duplicate detection: same driver + same ticket number more than once
  const keyOf = (r: TimesheetRow) => `${r.driver_id}|${r.ticket_number.trim().toLowerCase()}`
  const keyCounts = rows.reduce((acc, r) => {
    acc[keyOf(r)] = (acc[keyOf(r)] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const isDuplicate = (r: TimesheetRow) => keyCounts[keyOf(r)] > 1
  const duplicateCount = rows.filter(isDuplicate).length

  const totalHours = rows.reduce((sum, r) => sum + Number(r.hours || 0), 0)

  const verifiedTotal = rows.filter((r) => r.verified).length

  const truckSummaries = rows.reduce((acc, r) => {
    const key = r.trucks?.truck_number || 'Unknown'
    if (!acc[key]) acc[key] = { truckNumber: key, totalHours: 0, ticketCount: 0, hasDuplicate: false, rows: [] as TimesheetRow[] }
    acc[key].totalHours += Number(r.hours || 0)
    acc[key].ticketCount += 1
    if (isDuplicate(r)) acc[key].hasDuplicate = true
    acc[key].rows.push(r)
    return acc
  }, {} as Record<string, { truckNumber: string; totalHours: number; ticketCount: number; hasDuplicate: boolean; rows: TimesheetRow[] }>)

  const truckList = Object.values(truckSummaries)
    .map((t) => {
      const verifiedCount = t.rows.filter((r) => r.verified).length
      return {
        ...t,
        verifiedCount,
        allVerified: t.rows.length > 0 && verifiedCount === t.rows.length,
      }
    })
    .sort((a, b) => a.truckNumber.localeCompare(b.truckNumber, undefined, { numeric: true }))

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Timesheets</h1>

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
          <p className="text-sm text-gray-600">Verified: {verifiedTotal} of {rows.length} tickets</p>
        </div>
        <button
          onClick={() => changeWeek(1)}
          className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 font-medium hover:bg-gray-300"
        >
          Next Week →
        </button>
      </div>

      {duplicateCount > 0 && (
        <div className="bg-orange-50 border border-orange-300 text-orange-800 rounded-lg p-3 mb-4 text-sm">
          {duplicateCount} tickets this week share a driver and ticket number with another ticket. They are marked
          &quot;Possible duplicate&quot; below. Expand the truck to review them.
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-4 text-gray-600">Loading timesheets...</p>
        ) : truckList.length === 0 ? (
          <p className="p-4 text-gray-600">No timesheets submitted for this week.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {truckList.map((t) => (
              <Fragment key={t.truckNumber}>
                <button
                  onClick={() => setExpandedTruck(expandedTruck === t.truckNumber ? null : t.truckNumber)}
                  className={`w-full flex items-center justify-between p-4 text-left ${
                    t.allVerified ? 'bg-green-100 hover:bg-green-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900">Truck {t.truckNumber}</span>
                    <span className="text-sm text-gray-600">
                      {t.ticketCount} ticket{t.ticketCount !== 1 ? 's' : ''}
                    </span>
                    {t.hasDuplicate && (
                      <span className="text-xs font-medium text-orange-700 bg-orange-100 rounded px-2 py-0.5">
                        Possible duplicate
                      </span>
                    )}
                    <span className={`text-xs font-medium rounded px-2 py-0.5 ${
                        t.allVerified ? 'text-green-800 bg-green-200' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {t.allVerified ? '✓ Complete' : `${t.verifiedCount}/${t.ticketCount} verified`}
                      </span>
                                        
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
                          {['Verified', 'Date', 'Driver', 'Company', 'Location', 'Ticket #', 'Start', 'End', 'Hours', 'Notes', 'Submitted', 'Actions'].map((h) => (
                            <th key={h} className="text-left p-3 text-gray-700 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.rows.map((r) => (
                          <tr
                            key={r.id}
                            className={`border-b border-gray-100 ${
                              r.verified ? 'bg-green-100' : isDuplicate(r) ? 'bg-orange-50' : ''
                            }`}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={r.verified}
                                onChange={() => toggleVerified(r)}
                                className="h-5 w-5 accent-green-600 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 text-gray-900">{r.date}</td>
                            <td className="p-3 text-gray-900">{r.drivers?.name || '—'}</td>
                            <td className="p-3 text-gray-900">
                              {r.companies?.name || r.new_company_name || '—'}
                              {!r.companies?.name && r.new_company_name && (
                                <span className="ml-1 text-xs text-orange-600 font-medium">(new)</span>
                              )}
                            </td>
                            <td className="p-3 text-gray-900">{r.location}</td>
                            <td className="p-3 text-gray-900">
                              {r.ticket_number}
                              {isDuplicate(r) && (
                                <span className="ml-1 text-xs text-orange-700 font-medium">Possible duplicate</span>
                              )}
                            </td>
                            <td className="p-3 text-gray-900">{r.start_time?.slice(0, 5)}</td>
                            <td className="p-3 text-gray-900">{r.end_time?.slice(0, 5)}</td>
                            <td className="p-3 text-gray-900">{r.hours}</td>
                            <td className="p-3 text-gray-900">{r.notes || '—'}</td>
                            <td className="p-3 text-gray-600 text-xs">{new Date(r.submitted_at).toLocaleString()}</td>
                            <td className="p-3 whitespace-nowrap">
                              <button onClick={() => startEdit(r)} className="text-sm text-blue-600 underline">
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(r)}
                                disabled={deletingId === r.id}
                                className="text-sm text-red-600 underline ml-3 disabled:opacity-50"
                              >
                                {deletingId === r.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Edit Ticket</h2>
            <p className="text-sm text-gray-600 mb-4">Driver: {editing.drivers?.name || '—'}</p>

            <datalist id="edit-company-options">
              {companies.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-800">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-800">Truck</label>
                <select
                  value={editTruckId}
                  onChange={(e) => setEditTruckId(e.target.value)}
                  className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                >
                  <option value="">No truck</option>
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>{t.truck_number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-800">Company</label>
                <input
                  type="text"
                  list="edit-company-options"
                  value={editCompanyText}
                  onChange={(e) => setEditCompanyText(e.target.value)}
                  placeholder="Type to search companies..."
                  className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A name that is not in the list saves as a new company for review.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-800">Ticket Number</label>
                <input
                  type="text"
                  value={editTicketNumber}
                  onChange={(e) => setEditTicketNumber(e.target.value)}
                  className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-800">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-800">Start Time</label>
                  <select
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                  >
                    <option value="">Select</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-800">End Time</label>
                  <select
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                  >
                    <option value="">Select</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-800">Hours (auto-calculated)</label>
                <input
                  type="text"
                  value={calcHours(editStart, editEnd)}
                  readOnly
                  className="w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-800">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                />
              </div>

              {editError && <p className="text-red-600 text-sm">{editError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveEdit}
                  disabled={saving || !editStart || !editEnd}
                  className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="rounded px-4 py-2 text-gray-700 font-medium hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}