'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type OwnerOp = {
  id: number
  name: string
}

export default function OwnerOpsPage() {
  const [ownerOps, setOwnerOps] = useState<OwnerOp[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadOwnerOps()
  }, [])

  const loadOwnerOps = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('owner_op_companies')
      .select('id, name')
      .order('name')

    if (data) setOwnerOps(data)
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('owner_op_companies')
      .insert({ name: newName })

    setSaving(false)

    if (error) {
      setError('Could not add — name may already exist.')
      return
    }

    setNewName('')
    setShowAddForm(false)
    loadOwnerOps()
  }

  const filtered = ownerOps.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Owner Ops</h1>
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
          className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4 flex items-end gap-3"
        >
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-800">Company Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setShowAddForm(false); setNewName(''); setError('') }}
            className="rounded px-4 py-2 text-gray-700 font-medium hover:bg-gray-100"
          >
            Cancel
          </button>
        </form>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search owner op companies..."
          className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
        />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-4 text-gray-600">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-gray-600">No owner op companies found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 text-gray-700 font-semibold">Name</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-gray-100">
                  <td className="p-3 text-gray-900">{o.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}