'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Driver = {
  id: number
  name: string
  owner_operator_company_id: number
}

type Truck = {
  id: number
  truck_number: string
}

type Company = {
  id: number
  name: string
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

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export default function TimesheetPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [ownerOpName, setOwnerOpName] = useState('')
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  const [truckId, setTruckId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [isNewCompany, setIsNewCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [date, setDate] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [hours, setHours] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [startTimeText, setStartTimeText] = useState('')
  const [endTimeText, setEndTimeText] = useState('')
  const [notes, setNotes] = useState('')

  const [showStartOptions, setShowStartOptions] = useState(false)
  const [showEndOptions, setShowEndOptions] = useState(false)


  useEffect(() => {
    loadDriverInfo()
  }, [])

  useEffect(() => {
    if (startTime && endTime) {
        const [startH, startM] = startTime.split(':').map(Number)
        const [endH, endM] = endTime.split(':').map(Number)

        let startMinutes = startH * 60 + startM
        let endMinutes = endH * 60 + endM

        if (endMinutes < startMinutes) {
        endMinutes += 24 * 60 // handles shifts crossing midnight
        }

        const totalHours = (endMinutes - startMinutes) / 60
        setHours(totalHours.toFixed(2))
    }
    }, [startTime, endTime])


  useEffect(() => {
    const closeDropdowns = () => {
      setShowStartOptions(false)
      setShowEndOptions(false)
      }
      document.addEventListener('click', closeDropdowns)
      return () => document.removeEventListener('click', closeDropdowns)
    }, [])

  const loadDriverInfo = async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('id, name, owner_operator_company_id')
      .eq('auth_user_id', session.user.id)
      .single()

    if (driverError || !driverData) {
      setMessage('Could not find your driver record. Contact the office.')
      setLoading(false)
      return
    }

    setDriver(driverData)

    const { data: ownerOp } = await supabase
      .from('owner_op_companies')
      .select('name')
      .eq('id', driverData.owner_operator_company_id)
      .single()

    if (ownerOp) setOwnerOpName(ownerOp.name)

    const { data: truckData } = await supabase
      .from('trucks')
      .select('id, truck_number')
      .eq('owner_op_company_id', driverData.owner_operator_company_id)

    if (truckData) setTrucks(truckData)

    const { data: companyData } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')

    if (companyData) setCompanies(companyData)

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver) return
    setSubmitting(true)
    setMessage('')

    const { error } = await supabase.from('timesheets').insert({
      driver_id: driver.id,
      truck_id: truckId ? Number(truckId) : null,
      company_id: isNewCompany ? null : (companyId ? Number(companyId) : null),
      new_company_name: isNewCompany ? newCompanyName : null,
      date,
      ticket_number: ticketNumber,
      location,
      start_time: startTime,
      end_time: endTime,
      hours: Number(hours),
      notes: notes || null,
    })

    setSubmitting(false)

    if (error) {
      setMessage('Something went wrong submitting your ticket. Try again.')
      return
    }

    setMessage('Ticket submitted!')
    setTicketNumber('')
    setLocation('')
    setStartTime('')
    setEndTime('')
    setHours('')
    setCompanyId('')
    setIsNewCompany(false)
    setNewCompanyName('')
    setNotes('')
  }


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-700">Loading...</div>
  }


  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200">
          <p className="text-sm text-gray-600">Driver</p>
          <p className="font-semibold text-gray-900">{driver?.name}</p>
          <p className="text-sm text-gray-600 mt-2">Owner Op Company</p>
          <p className="font-semibold text-gray-900">{ownerOpName}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6 space-y-4 border border-gray-200"
        >
          <h1 className="text-xl font-bold text-gray-900">New Ticket</h1>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Truck</label>
            <select
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            >
              <option value="">Select truck</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>{t.truck_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Company</label>
            {!isNewCompany ? (
              <>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  required
                  className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setIsNewCompany(true); setCompanyId('') }}
                  className="text-sm text-blue-600 mt-1 underline"
                >
                  Company not listed?
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  required
                  placeholder="Enter company name"
                  className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => { setIsNewCompany(false); setNewCompanyName('') }}
                  className="text-sm text-blue-600 mt-1 underline"
                >
                  Choose from list instead
                </button>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Ticket Number</label>
            <input
              type="text"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <label className="block text-sm font-semibold mb-1 text-gray-800">Start Time</label>
              <input
                type="text"
                value={startTimeText}
                onFocus={() => setShowStartOptions(true)}
                onChange={(e) => {
                  const typed = e.target.value
                  setStartTimeText(typed)
                  setShowStartOptions(true)
                  const match = TIME_OPTIONS.find(t => t.label.toLowerCase() === typed.toLowerCase())
                  setStartTime(match ? match.value : '')
                }}
                placeholder="Type or select a time"
                required
                className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
              />
              {showStartOptions && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
                  {TIME_OPTIONS.filter(t =>
                    t.label.toLowerCase().includes(startTimeText.toLowerCase())
                  ).map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setStartTimeText(t.label)
                        setStartTime(t.value)
                        setShowStartOptions(false)
                      }}
                      className="block w-full text-left px-3 py-2 text-gray-900 hover:bg-blue-50"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <label className="block text-sm font-semibold mb-1 text-gray-800">End Time</label>
              <input
                type="text"
                value={endTimeText}
                onFocus={() => setShowEndOptions(true)}
                onChange={(e) => {
                  const typed = e.target.value
                  setEndTimeText(typed)
                  setShowEndOptions(true)
                  const match = TIME_OPTIONS.find(t => t.label.toLowerCase() === typed.toLowerCase())
                  setEndTime(match ? match.value : '')
                }}
                placeholder="Type or select a time"
                required
                className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
              />
              {showEndOptions && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
                  {TIME_OPTIONS.filter(t =>
                    t.label.toLowerCase().includes(endTimeText.toLowerCase())
                  ).map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setEndTimeText(t.label)
                        setEndTime(t.value)
                        setShowEndOptions(false)
                      }}
                      className="block w-full text-left px-3 py-2 text-gray-900 hover:bg-blue-50"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Total Hours</label>
            <input
              type="number"
              value={hours}
              readOnly
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">Calculated automatically from start and end time</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Notes (optional)</label>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Hazmat job, worked in New Mexico, etc."
                className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
            </div>

          {message && (
            <p className={message.includes('!') ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-blue-600 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  )
}