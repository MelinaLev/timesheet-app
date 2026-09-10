'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Company = {
  id: number
  name: string
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')

    if (data) setCompanies(data)
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('companies')
      .insert({ name: newName })

    setSaving(false)

    if (error) {
      setError('Could not add — name may already exist.')
      return
    }

    setNewName('')
    setShowAddForm(false)
    loadCompanies()
  }

  const startEdit = (company: Company) => {
    setEditingId(company.id)
    setEditName(company.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (id: number) => {
    setEditSaving(true)

    const { error } = await supabase
      .from('companies')
      .update({ name: editName })
      .eq('id', id)

    setEditSaving(false)

    if (!error) {
      setEditingId(null)
      loadCompanies()
    }
  }

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
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
          placeholder="Search companies..."
          className="w-full rounded border border-gray-400 px-3 py-2 text-gray-900"
        />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-4 text-gray-600">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-gray-600">No companies found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 text-gray-700 font-semibold">Name</th>
                <th className="text-left p-3 text-gray-700 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-100">
                  {editingId === c.id ? (
                    <>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded border border-gray-400 px-2 py-1 text-gray-900"
                        />
                      </td>
                      <td className="p-3 flex gap-2">
                        <button
                          onClick={() => saveEdit(c.id)}
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
                      <td className="p-3 text-gray-900">{c.name}</td>
                      <td className="p-3">
                        <button
                          onClick={() => startEdit(c)}
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