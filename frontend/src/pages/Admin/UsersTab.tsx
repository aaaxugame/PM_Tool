import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usersApi, vendorsApi, clientsApi, type User, type Vendor, type Client } from '../../api/organizations'
import Modal from '../../components/Modal'

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'CONTRACTOR', 'VENDOR_CONTACT', 'CLIENT']

type UserType = 'internal' | 'vendor' | 'client'

interface FormState {
  email: string
  name: string
  jobTitle: string
  password: string
  roles: string[]
  isActive: boolean
  userType: UserType
  vendorId: number | null
  clientId: number | null
}

const EMPTY: FormState = {
  email: '', name: '', jobTitle: '', password: '',
  roles: [], isActive: true,
  userType: 'internal', vendorId: null, clientId: null,
}

function userTypeFromUser(u: User): UserType {
  if (u.vendor) return 'vendor'
  if (u.client) return 'client'
  return 'internal'
}

const TYPE_BADGE: Record<UserType, string> = {
  internal: '🏢',
  vendor: '🔧',
  client: '👤',
}

export default function UsersTab() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | User>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () =>
    Promise.all([
      usersApi.list().then(r => setUsers(r.data)),
      vendorsApi.list().then(r => setVendors(r.data)),
      clientsApi.list().then(r => setClients(r.data)),
    ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }

  const openEdit = (u: User) => {
    setForm({
      email: u.email,
      name: u.name,
      jobTitle: (u as any).jobTitle ?? '',
      password: '',
      roles: u.roles,
      isActive: u.isActive,
      userType: userTypeFromUser(u),
      vendorId: u.vendor?.id ?? null,
      clientId: u.client?.id ?? null,
    })
    setModal(u)
  }

  const closeModal = () => setModal(null)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const toggleRole = (role: string) =>
    setForm(p => ({
      ...p,
      roles: p.roles.includes(role) ? p.roles.filter(r => r !== role) : [...p.roles, role],
    }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        roles: form.roles,
        isActive: form.isActive,
        jobTitle: form.jobTitle || undefined,
        vendorId: form.userType === 'vendor' ? form.vendorId : null,
        clientId: form.userType === 'client' ? form.clientId : null,
      }
      if (form.password) payload.password = form.password

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
        <h2 className="text-base font-semibold text-gray-700">{t('admin.users')}</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + {t('common.create')}
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-400">{t('common.loading')}</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[t('common.name'), t('auth.email'), t('admin.company'), t('admin.roles'), t('common.status'), ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              ) : users.map(u => {
                const uType = userTypeFromUser(u)
                const companyName = u.vendor?.name ?? u.client?.name ?? t('admin.internal')
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{u.name}</p>
                      {(u as any).jobTitle && <p className="text-xs text-gray-400">{(u as any).jobTitle}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        <span>{TYPE_BADGE[uType]}</span>
                        <span>{companyName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0
                          ? <span className="text-gray-400 text-xs">{t('admin.noRoles')}</span>
                          : u.roles.map(r => (
                            <span key={r} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{r.replace(/_/g, ' ')}</span>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <Modal title={isEditing ? t('admin.editUser') : t('admin.newUser')} onClose={closeModal}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.name')} *</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.jobTitle')}</label>
                <input type="text" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)}
                  placeholder={t('admin.jobTitlePlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.email')} *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isEditing ? t('admin.passwordKeep') : `${t('auth.password')} *`}
              </label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* User Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">{t('admin.userType')} *</label>
              <div className="space-y-2">
                {(['internal', 'vendor', 'client'] as UserType[]).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="userType" value={type}
                      checked={form.userType === type}
                      onChange={() => set('userType', type)}
                      className="text-blue-600" />
                    <span className="text-sm text-gray-700 capitalize">
                      {TYPE_BADGE[type]}{' '}
                      {type === 'internal' ? t('admin.internal') : type === 'vendor' ? t('admin.vendorContractor') : t('admin.clientContact')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Vendor selector */}
            {form.userType === 'vendor' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.vendorOrg')} *</label>
                <select value={form.vendorId ?? ''} onChange={e => set('vendorId', Number(e.target.value) || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('admin.selectVendor')}</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            )}

            {/* Client selector */}
            {form.userType === 'client' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.clientOrg')} *</label>
                <select value={form.clientId ?? ''} onChange={e => set('clientId', Number(e.target.value) || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('admin.selectClient')}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {/* Roles */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">{t('admin.roles')}</label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map(role => (
                  <button key={role} type="button" onClick={() => toggleRole(role)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.roles.includes(role)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}>
                    {role.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
              {t('common.active')}
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleSave}
              disabled={
                saving || !form.name || !form.email ||
                (form.userType === 'vendor' && !form.vendorId) ||
                (form.userType === 'client' && !form.clientId)
              }
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
