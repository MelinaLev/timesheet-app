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
        companies ( name )
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

  // Duplicate detection: same driver + same ticket number more than once
  const keyOf = (r: TimesheetRow) => `${r.driver_id}|${r.ticket_number.trim().toLowerCase()}`
  const keyCounts = rows.reduce((acc, r) => {
    acc[keyOf(r)] = (acc[keyOf(r)] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const isDuplicate = (r: TimesheetRow) => keyCounts[keyOf(r)] > 1
  const duplicateCount = rows.filter(isDuplicate).length

  const totalHours =