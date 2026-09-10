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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [driversRes, ownerOpsRes] = await Promise.all([
      supabase
        .from('drivers')
        .select('id, name, active, owner_operator_company_id, owner_op_companies ( name )')
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

    // Step 1: create the Auth login
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPin,
    })

    if (authError || !authData.user) {
      setSaving(false)
      setError(authError?.message || 'Could not create login.')
      return
    }

    // Step 2: create the driver record linked to that login
    const { error: driverError } = await supabase.from('drivers').insert({
      name: newName,
      active: true,
      owner_operator_company_id: Number(newOwnerOpId),
      auth_user_id: authData.user.id,
    })

    setSaving(false)

    if (driverError) {
      setError('Login created, but driver record failed: ' + driverError.message)
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
                    </td>
                    </>
                )}
                </tr>
            ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}