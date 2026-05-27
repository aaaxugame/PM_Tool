import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi, type Project, type ProjectStatus, type BillingMethod, type ProjectPriority } from '../../api/projects'
import { clientsApi, type Client } from '../../api/organizations'
import Modal from '../../components/Modal'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-50 text-green-700',
  ON_HOLD: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-600',
}

const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  LOW: 'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-blue-50 text-blue-600',
  HIGH: 'bg-orange-50 text-orange-600',
  URGENT: 'bg-red-50 text-red-600',
}

const PRIORITY_ICON: Record<ProjectPriority, string> = {
  LOW: '↓',
  MEDIUM: '→',
  HIGH: '↑',
  URGENT: '⚠',
}

const EMPTY = {
  name: '',
  description: '',
  status: 'DRAFT' as ProjectStatus,
  priority: 'MEDIUM' as ProjectPriority,
  billingMethod: 'HOURLY' as BillingMethod,
  clientId: 0,
  startDate: '',
  endDate: '',
}

export default function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | Project>(null)
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () =>
    Promise.all([
      projectsApi.list().then(r => setProjects(r.data)),
      clients.length === 0 ? clientsApi.list().then(r => setClients(r.data)) : Promise.resolve(),
    ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = (p: Project) => {
    setForm({
      name: p.name,
      description: p.description ?? '',
      status: p.status,
      priority: p.priority ?? 'MEDIUM',
      billingMethod: p.billingMethod,
      clientId: p.clientId,
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
    })
    setModal(p)
  }
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== 0 && v !== undefined)
      )
      if (modal === 'create') await projectsApi.create(payload)
      else await projectsApi.update((modal as Project).id, payload)
      await load()
      closeModal()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project? This will also delete all milestones and tasks.')) return
    await projectsApi.remove(id)
    load()
  }

  const isEditing = modal !== null && modal !== 'create'
  const set = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }))

  const PRIORITIES: ProjectPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('nav.projects')}</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + {t('common.create')}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  t('common.name'),
                  t('projects.client'),
                  t('common.status'),
                  t('projects.priority'),
                  t('projects.billingMethod'),
                  t('projects.startDate'),
                  t('projects.endDate'),
                  t('projects.milestones'),
                  t('projects.tasks'),
                  '',
                ].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              ) : projects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate(`/projects/${p.id}`)}>
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.client.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[p.priority ?? 'MEDIUM']}`}>
                      <span>{PRIORITY_ICON[p.priority ?? 'MEDIUM']}</span>
                      <span>{t(`projects.priority_${p.priority ?? 'MEDIUM'}`)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.billingMethod}</td>
                  <td className="px-4 py-3 text-gray-500">{p.startDate ? p.startDate.slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.endDate ? p.endDate.slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-center">{p._count.milestones}</td>
                  <td className="px-4 py-3 text-gray-500 text-center">{p._count.tasks}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <Modal title={isEditing ? t('projects.editProject') : t('projects.newProject')} onClose={closeModal}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.name')} *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.description')}</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.client')} *</label>
                <select value={form.clientId} onChange={e => set('clientId', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>— select —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.status')}</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as ProjectStatus[]).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.priority')}</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>
                      {PRIORITY_ICON[p]} {t(`projects.priority_${p}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.billingMethod')}</label>
                <select value={form.billingMethod} onChange={e => set('billingMethod', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['HOURLY', 'FIXED', 'MIXED'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.startDate')}</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.endDate')}</label>
                <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleSave} disabled={saving || !form.name || !form.clientId}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
