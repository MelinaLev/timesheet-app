'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type OwnerOp = {
  id: number
  name: string
}

type Truck = {
  id: number
  truck_number: string
  owner_op_company_id: number
  owner_op_companies: { name: string } | null
}

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [ownerOps, setOwnerOps] = useState<OwnerOp[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newTruckNumber, setNewTruckNumber] = useState('')
  const [newOwnerOpId, setNewOwnerOpId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTruckNumber, setEditTruckNumber] = useState('')
  const [editOwnerOpId, setEditOwnerOpId] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [trucksRes, ownerOpsRes] = await Promise.all([
      supabase
        .from('trucks')
        .select('id, truck_number, owner_op_company_id, owner_op_companies ( name )')
        .order('truck_number'),
      supabase.from('owner_op_companies').select('id, name').order('name'),
    ])

    if (trucksRes.data) setTrucks(trucksRes.data as unknown as Truck[])
    if (ownerOpsRes.data) setOwnerOps(ownerOpsRes.data)
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('trucks').insert({
      truck_number: newTruckNumber,
      owner_op_company_id: Number(newOwnerOpId),
    })

    setSaving(false)

    if (error) {
      setError('Could not add — truck number may already exist.')
      return
    }

    setNewTruckNumber('')
    setNewOwnerOpId('')
    setShowAddForm(false)
    loadData()
  }

  const startEdit = (truck: Truck) => {
    setEditingId(truck.id)
    setEditTruckNumber(truck.truck_number)
    setEditOwnerOpId(String(truck.owner_op_company_id))
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (id: number) => {
    setEditSaving(true)

    const { error } = await supabase
      .from('trucks')
      .update({
        truck_number: editTruckNumber,
        owner_op_company_id: Number(editOwnerOpId),
      })
      .eq('id', id)

    setEditSaving(false)

    if (!error) {
      setEditingId(null)
      loadData()
    }
  }

  const filtered = trucks.filter((t) =>
    t.truck_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trucks</h1>
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
            <label className="block text-sm font-semibold mb-1 text-gray-800">Truck Number</label>
            <input
              type="text"
              value={newTruckNumber}
              onChange={(e) => setNewTruckNumber(e.target.value)}
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
          placeholder="Search trucks..."
          className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
        />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-4 text-gray-600">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-gray-600">No trucks found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 text-gray-700 font-semibold">Truck Number</th>
                <th className="text-left p-3 text-gray-700 font-semibold">Owner Op Company</th>
                <th className="text-left p-3 text-gray-700 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-100">
                  {editingId === t.id ? (
                    <>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editTruckNumber}
                          onChange={(e) => setEditTruckNumber(e.target.value)}
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
                      <td className="p-3 flex gap-2">
                        <button
                          onClick={() => saveEdit(t.id)}
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
                      <td className="p-3 text-gray-900">{t.truck_number}</td>
                      <td className="p-3 text-gray-900">{t.owner_op_companies?.name || '—'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => startEdit(t)}
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