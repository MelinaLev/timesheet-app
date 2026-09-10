'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type OwnerOp = {
  id: number
  name: string
}

type Driver = {
  id: number
  name: string
  active: boolean
  owner_operator_company_id: number
  auth_user_id: string
  owner_op_companies: { name: string } | null
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [ownerOps, setOwnerOps] = useState<OwnerOp[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newOwnerOpId, setNewOwnerOpId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editOwnerOpId, setEditOwnerOpId] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editSaving, setEditSaving] = useState(false)


  const [resetDriverId, setResetDriverId] = useState<number | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetPin, setResetPin] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [driversRes, ownerOpsRes] = await Promise.all([
      supabase
        .from('drivers')
        .select('id, name, active, owner_operator_company_id, auth_user_id, owner_op_companies ( name )')
        .order('name'),
      supabase.from('owner_op_companies').select('id, name').order('name'),
    ])

    if (driversRes.data) setDrivers(driversRes.data as unknown as Driver[])
    if (ownerOpsRes.data) setOwnerOps(ownerOpsRes.data)
    setLoading(false)
  }

    const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/admin/create-driver', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
        name: newName,
        email: newEmail,
        pin: newPin,
        ownerOpId: newOwnerOpId,
        }),
    })

    const result = await res.json()
    setSaving(false)

    if (!res.ok) {
        setError(result.error || 'Something went wrong.')
        return
    }

    setNewName('')
    setNewEmail('')
    setNewPin('')
    setNewOwnerOpId('')
    setShowAddForm(false)
    loadData()
    }

  const startEdit = (driver: Driver) => {
    setEditingId(driver.id)
    setEditName(driver.name)
    setEditOwnerOpId(String(driver.owner_operator_company_id))
    setEditActive(driver.active)
    }

    const cancelEdit = () => {
    setEditingId(null)
    }

    const saveEdit = async (id: number) => {
    setEditSaving(true)

    const { error } = await supabase
        .from('drivers')
        .update({
        name: editName,
        owner_operator_company_id: Number(editOwnerOpId),
        active: editActive,
        })
        .eq('id', id)

    setEditSaving(false)

    if (!error) {
        setEditingId(null)
        loadData()
    }
    }

  const filtered = drivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

    const handleReset = async (driver: Driver) => {
    setResetSaving(true)
    setResetError('')
    setResetSuccess('')

    try {
        const { data: { session } } = await supabase.auth.getSession()

        const res = await fetch('/api/admin/reset-driver-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
            authUserId: driver.auth_user_id,
            newEmail: resetEmail || undefined,
            newPin: resetPin || undefined,
        }),
        })

        const result = await res.json()

        if (!res.ok) {
        setResetError(result.error || 'Something went wrong.')
        return
        }

        setResetSuccess('Login updated successfully.')
        setResetEmail('')
        setResetPin('')
    } catch (err) {
        setResetError('Request failed. Check your connection and try again.')
    } finally {
        setResetSaving(false)
    }
    }

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
        >
          + Add New
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-3"
        >
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Owner Op Company</label>
            <select
              value={newOwnerOpId}
              onChange={(e) => setNewOwnerOpId(e.target.value)}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            >
              <option value="">Select company</option>
              {ownerOps.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-800">PIN</label>
            <input
              type="text"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>

          {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}

          <div className="col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setError('') }}
              className="rounded px-4 py-2 text-gray-700 font-medium hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drivers..."
          className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
        />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-4 text-gray-600">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-gray-600">No drivers found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
                <th className="text-left p-3 text-gray-700 font-semibold">Name</th>
                <th className="text-left p-3 text-gray-700 font-semibold">Owner Op Company</th>
                <th className="text-left p-3 text-gray-700 font-semibold">Active</th>
                <th className="text-left p-3 text-gray-700 font-semibold">Actions</th>
            </tr>
            </thead>
            <tbody>
            {filtered.map((d) => (
                <tr key={d.id} className="border-b border-gray-100">
                {editingId === d.id ? (
                    <>
                    <td className="p-3">
                        <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900"
                        />
                    </td>
                    <td className="p-3">
                        <select
                        value={editOwnerOpId}
                        onChange={(e) => setEditOwnerOpId(e.target.value)}
                        className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900"
                        >
                        {ownerOps.map((o) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                        </select>
                    </td>
                    <td className="p-3">
                        <select
                        value={editActive ? 'yes' : 'no'}
                        onChange={(e) => setEditActive(e.target.value === 'yes')}
                        className="rounded border border-gray-400 px-2 py-1 text-gray-900"
                        >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        </select>
                    </td>
                    <td className="p-3 flex gap-2">
                        <button
                        onClick={() => saveEdit(d.id)}
                        disabled={editSaving}
                        className="text-sm text-white bg-blue-600 rounded px-3 py-1 font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                        {editSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                        onClick={cancelEdit}
                        className="text-sm text-gray-700 rounded px-3 py-1 font-medium hover:bg-gray-100"
                        >
                        Cancel
                        </button>
                    </td>
                    </>
                ) : (
                    <>
                    <td className="p-3 text-gray-900">{d.name}</td>
                    <td className="p-3 text-gray-900">{d.owner_op_companies?.name || '—'}</td>
                    <td className="p-3 text-gray-900">{d.active ? 'Yes' : 'No'}</td>
                    <td className="p-3">
                        <button
                        onClick={() => startEdit(d)}
                        className="text-sm text-blue-600 underline"
                        >
                        Edit
                        </button>
                        <button
                        onClick={() => { setResetDriverId(d.id); setResetEmail(''); setResetPin(''); setResetError(''); setResetSuccess('') }}
                        className="text-sm text-orange-600 underline ml-3"
                        >
                        Reset Login
                        </button>
                    </td>
                    </>
                )}
                </tr>
            ))}
            </tbody>
          </table>
        )}
      </div>
        {resetDriverId !== null && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Reset Driver Login</h2>
                <div className="space-y-3">
                    <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-800">New Email (optional)</label>
                    <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-800">New PIN (optional)</label>
                    <input
                        type="text"
                        value={resetPin}
                        onChange={(e) => setResetPin(e.target.value)}
                        minLength={6}
                        placeholder="Leave blank to keep current"
                        className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
                    />
                    </div>
                    {resetError && <p className="text-red-600 text-sm">{resetError}</p>}
                    {resetSuccess && <p className="text-green-600 text-sm">{resetSuccess}</p>}
                    <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => {
                        const driver = drivers.find(d => d.id === resetDriverId)
                        if (driver) handleReset(driver)
                        }}
                        disabled={resetSaving}
                        className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {resetSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={() => setResetDriverId(null)}
                        className="rounded px-4 py-2 text-gray-700 font-medium hover:bg-gray-100"
                    >
                        Close
                    </button>
                    </div>
                </div>
                </div>
            </div>
            )}

    </div>
  )
}