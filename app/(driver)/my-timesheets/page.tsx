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
  notes: string | null
  truck_id: number
  company_id: number | null
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

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4)
  const minutes = (i % 4) * 15
  const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  const ampm = hours < 12 ? 'AM' : 'PM'
  const label = `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`
  return { value, label }
})

export default function MyTimesheetsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTicketNumber, setEditTicketNumber] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editHours, setEditHours] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editStartTimeText, setEditStartTimeText] = useState('')
  const [editEndTimeText, setEditEndTimeText] = useState('')
  const [showEditStartOptions, setShowEditStartOptions] = useState(false)
  const [showEditEndOptions, setShowEditEndOptions] = useState(false)


  useEffect(() => {
    loadTickets(weekStart)
  }, [weekStart])

  useEffect(() => {
  const closeDropdowns = () => {
    setShowEditStartOptions(false)
    setShowEditEndOptions(false)
  }
  document.addEventListener('click', closeDropdowns)
  return () => document.removeEventListener('click', closeDropdowns)
}, [])

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
            id, date, ticket_number, location, start_time, end_time, hours, notes,
            truck_id, company_id, new_company_name,
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

    const startEdit = (t: Ticket) => {
        setEditingId(t.id)
        setEditDate(t.date)
        setEditTicketNumber(t.ticket_number)
        setEditLocation(t.location)
        setEditHours(String(t.hours))
        setEditNotes(t.notes || '')
        setEditStartTime(t.start_time)
        setEditEndTime(t.end_time)
        const startMatch = TIME_OPTIONS.find(o => o.value === t.start_time?.slice(0, 5))
        const endMatch = TIME_OPTIONS.find(o => o.value === t.end_time?.slice(0, 5))
        setEditStartTimeText(startMatch?.label || '')
        setEditEndTimeText(endMatch?.label || '')
        }

    useEffect(() => {
        if (editStartTime && editEndTime) {
            const [startH, startM] = editStartTime.split(':').map(Number)
            const [endH, endM] = editEndTime.split(':').map(Number)
            let startMinutes = startH * 60 + startM
            let endMinutes = endH * 60 + endM
            if (endMinutes < startMinutes) endMinutes += 24 * 60
            setEditHours(((endMinutes - startMinutes) / 60).toFixed(2))
        }
        }, [editStartTime, editEndTime])

        const cancelEdit = () => setEditingId(null)


        const saveEdit = async (id: number) => {
            setSaving(true)
            const { error } = await supabase
                .from('timesheets')
                .update({
                date: editDate,
                ticket_number: editTicketNumber,
                location: editLocation,
                start_time: editStartTime,
                end_time: editEndTime,
                hours: Number(editHours),
                notes: editNotes || null,
                })
                .eq('id', id)

            setSaving(false)
            if (!error) {
                setEditingId(null)
                loadTickets(weekStart)
            }
            }

        const handleDelete = async (id: number) => {
        setDeletingId(id)
        const { error } = await supabase.from('timesheets').delete().eq('id', id)
        setDeletingId(null)
        if (!error) {
            loadTickets(weekStart)
        }
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
                {editingId === t.id ? (
                    <div className="space-y-2">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700">Date</label>
                        <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700">Ticket Number</label>
                        <input
                        type="text"
                        value={editTicketNumber}
                        onChange={(e) => setEditTicketNumber(e.target.value)}
                        className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700">Location</label>
                        <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900 text-sm"
                        />
                    </div>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <label className="block text-xs font-semibold text-gray-700">Start Time</label>
                        <input
                            type="text"
                            value={editStartTimeText}
                            onFocus={() => setShowEditStartOptions(true)}
                            onChange={(e) => {
                            const typed = e.target.value
                            setEditStartTimeText(typed)
                            setShowEditStartOptions(true)
                            const match = TIME_OPTIONS.find(t => t.label.toLowerCase() === typed.toLowerCase())
                            setEditStartTime(match ? match.value : '')
                            }}
                            placeholder="Type or select a time"
                            className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900 text-sm"
                        />
                        {showEditStartOptions && (
                            <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
                            {TIME_OPTIONS.filter(t =>
                                t.label.toLowerCase().includes(editStartTimeText.toLowerCase())
                            ).map((t) => (
                                <button
                                key={t.value}
                                type="button"
                                onClick={() => {
                                    setEditStartTimeText(t.label)
                                    setEditStartTime(t.value)
                                    setShowEditStartOptions(false)
                                }}
                                className="block w-full text-left px-2 py-1.5 text-sm text-gray-900 hover:bg-blue-50"
                                >
                                {t.label}
                                </button>
                            ))}
                            </div>
                        )}
                        </div>

                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <label className="block text-xs font-semibold text-gray-700">End Time</label>
                        <input
                            type="text"
                            value={editEndTimeText}
                            onFocus={() => setShowEditEndOptions(true)}
                            onChange={(e) => {
                            const typed = e.target.value
                            setEditEndTimeText(typed)
                            setShowEditEndOptions(true)
                            const match = TIME_OPTIONS.find(t => t.label.toLowerCase() === typed.toLowerCase())
                            setEditEndTime(match ? match.value : '')
                            }}
                            placeholder="Type or select a time"
                            className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900 text-sm"
                        />
                        {showEditEndOptions && (
                            <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
                            {TIME_OPTIONS.filter(t =>
                                t.label.toLowerCase().includes(editEndTimeText.toLowerCase())
                            ).map((t) => (
                                <button
                                key={t.value}
                                type="button"
                                onClick={() => {
                                    setEditEndTimeText(t.label)
                                    setEditEndTime(t.value)
                                    setShowEditEndOptions(false)
                                }}
                                className="block w-full text-left px-2 py-1.5 text-sm text-gray-900 hover:bg-blue-50"
                                >
                                {t.label}
                                </button>
                            ))}
                            </div>
                        )}
                        </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700">Hours (auto-calculated)</label>
                        <input
                        type="number"
                        value={editHours}
                        readOnly
                        className="w-full rounded border border-gray-300 bg-gray-100 px-2 py-1 text-gray-900 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700">Notes</label>
                        <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900 text-sm"
                        />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                        onClick={() => saveEdit(t.id)}
                        disabled={saving}
                        className="text-sm text-white bg-blue-600 rounded px-3 py-1 font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                        {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                        onClick={cancelEdit}
                        className="text-sm text-gray-700 rounded px-3 py-1 font-medium hover:bg-gray-100"
                        >
                        Cancel
                        </button>
                    </div>
                    </div>
                ) : (
                    <>
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
                    {t.notes && <p className="text-xs text-gray-500 mt-1">Notes: {t.notes}</p>}
                    <div className="flex gap-3 mt-2">
                        <button
                        onClick={() => startEdit(t)}
                        className="text-sm text-blue-600 underline"
                        >
                        Edit
                        </button>
                        <button
                        onClick={() => {
                            if (confirm('Delete this ticket? This cannot be undone.')) {
                            handleDelete(t.id)
                            }
                        }}
                        disabled={deletingId === t.id}
                        className="text-sm text-red-600 underline disabled:opacity-50"
                        >
                        {deletingId === t.id ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                    </>
                )}
                </div>
            ))}
            </div>
            )}
      </div>
    </div>
  )
}