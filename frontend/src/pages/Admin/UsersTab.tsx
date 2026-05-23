import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usersApi, type User } from '../../api/organizations'
import Modal from '../../components/Modal'

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'CONTRACTOR', 'VENDOR_CONTACT', 'CLIENT']
const EMPTY = { email: '', name: '', password: '', roles: [] as string[], isActive: true }

export default function UsersTab() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | User>(null)
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => usersApi.list().then(r => setUsers(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = (u: User) => { setForm({ email: u.email, name: u.name, password: '', roles: u.roles, isActive: u.isActive }); setModal(u) }
  const closeModal = () => setModal(null)

  const toggleRole = (role: string) => {
    setForm(p => ({
      ...p,
      roles: p.roles.includes(role) ? p.roles.filter(r => r !== role) : [...p.roles, role],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, ...(form.password ? {} : { password: undefined }) }
      if (modal === 'create') await usersApi.create(payload)
      else await usersApi.update((modal as User).id, payload)
      await load()
      closeModal()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return
    await usersApi.remove(id)
    load()
  }

  const isEditing = modal !== null && modal !== 'create'

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-700">Users</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + {t('common.create')}
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-400">{t('common.loading')}</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'Auth', 'Roles', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{u.authProvider}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? <span className="text-gray-400 text-xs">No roles</span> :
                        u.roles.map(r => (
                          <span key={r} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{r.replace('_', ' ')}</span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <Modal title={isEditing ? 'Edit User' : 'New User'} onClose={closeModal}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{isEditing ? 'Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Roles</label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map(role => (
                  <button key={role} type="button" onClick={() => toggleRole(role)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.roles.includes(role) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}>
                    {role.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleSave} disabled={saving || !form.name || !form.email} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
