import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { vendorsApi, type Vendor } from '../../api/organizations'
import Modal from '../../components/Modal'
import { CURRENCIES } from '../../utils/currency'

const EMPTY: Partial<Vendor> = { name: '', contactEmail: '', contactPhone: '', currency: 'USD', isActive: true }

export default function VendorsTab() {
  const { t } = useTranslation()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | Vendor>(null)
  const [form, setForm] = useState<Partial<Vendor>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => vendorsApi.list().then(r => setVendors(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = (v: Vendor) => { setForm(v); setModal(v) }
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== undefined)
      )
      if (modal === 'create') await vendorsApi.create(payload)
      else await vendorsApi.update((modal as Vendor).id, payload)
      await load()
      closeModal()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this vendor?')) return
    await vendorsApi.remove(id)
    load()
  }

  const isEditing = modal !== null && modal !== 'create'

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-700">Vendors</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + {t('common.create')}
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-400">{t('common.loading')}</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'Phone', 'Default Rate', 'Currency', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              ) : vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500">{v.contactEmail || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.contactPhone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.defaultHourlyRate ? `$${v.defaultHourlyRate}/hr` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(v)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                    <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <Modal title={isEditing ? 'Edit Vendor' : 'New Vendor'} onClose={closeModal}>
          <div className="space-y-3">
            {[
              { label: 'Name *', key: 'name', type: 'text' },
              { label: 'Email', key: 'contactEmail', type: 'email' },
              { label: 'Phone', key: 'contactPhone', type: 'text' },
              { label: 'Address', key: 'address', type: 'text' },
              { label: 'Default Hourly Rate', key: 'defaultHourlyRate', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={(form as any)[f.key] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select
                value={form.currency ?? 'USD'}
                onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.isActive ?? true} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleSave} disabled={saving || !form.name} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
