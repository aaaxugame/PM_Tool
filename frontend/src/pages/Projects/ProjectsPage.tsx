import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi, type Project, type ProjectStatus, type BillingMethod, type ProjectPriority, type ProjectFilters } from '../../api/projects'
import { clientsApi, vendorsApi, usersApi, type Client, type Vendor, type SimpleUser } from '../../api/organizations'
import { useAuth } from '../../store/authContext'
import Modal from '../../components/Modal'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-50 text-green-700',
  ON_HOLD: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-600',
  ARCHIVED: 'bg-purple-50 text-purple-600',
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProjectTable({
  projects,
  loading,
  onEdit,
  onDelete,
  showActions,
}: {
  projects: Project[]
  loading: boolean
  onEdit?: (p: Project) => void
  onDelete?: (id: number) => void
  showActions?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (loading) return <p className="text-sm text-gray-400">{t('common.loading')}</p>

  return (
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
              ...(showActions ? [''] : []),
            ].map((h, i) => (
              <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {projects.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 10 : 9} className="px-4 py-8 text-center text-gray-400">
                {t('common.noData')}
              </td>
            </tr>
          ) : projects.map(p => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td
                className="px-4 py-3 font-medium text-blue-600 cursor-pointer hover:underline"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
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
              {showActions && (
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => onEdit?.(p)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                  <button onClick={() => onDelete?.(p.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── All Projects tab with filter bar ────────────────────────────────────────

function AllProjectsTab({
  onEdit,
  onDelete,
}: {
  onEdit: (p: Project) => void
  onDelete: (id: number) => void
}) {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [pms, setPms] = useState<SimpleUser[]>([])
  const [ams, setAms] = useState<SimpleUser[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filters, setFilters] = useState<ProjectFilters>({})

  useEffect(() => {
    Promise.all([
      usersApi.listByRole('PROJECT_MANAGER').then(r => setPms(r.data)),
      usersApi.listByRole('ACCOUNT_MANAGER').then(r => setAms(r.data)),
      clientsApi.list().then(r => setClients(r.data)),
      vendorsApi.list().then(r => setVendors(r.data)),
    ])
  }, [])

  useEffect(() => {
    setLoading(true)
    projectsApi.list(filters).then(r => setProjects(r.data)).finally(() => setLoading(false))
  }, [filters])

  const setFilter = (key: keyof ProjectFilters, val: string) =>
    setFilters(prev => ({ ...prev, [key]: val ? Number(val) : undefined }))

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Project Manager</label>
          <select
            value={filters.pmId ?? ''}
            onChange={e => setFilter('pmId', e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">All PMs</option>
            {pms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Account Manager</label>
          <select
            value={filters.amId ?? ''}
            onChange={e => setFilter('amId', e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">All AMs</option>
            {ams.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">{t('projects.client')}</label>
          <select
            value={filters.clientId ?? ''}
            onChange={e => setFilter('clientId', e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Vendor</label>
          <select
            value={filters.vendorId ?? ''}
            onChange={e => setFilter('vendorId', e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        {(filters.pmId || filters.amId || filters.clientId || filters.vendorId) && (
          <button
            onClick={() => setFilters({})}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <ProjectTable
        projects={projects}
        loading={loading}
        onEdit={onEdit}
        onDelete={onDelete}
        showActions
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | Project>(null)
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)
  const [saving, setSaving] = useState(false)

  const isVendor = hasRole('VENDOR_CONTACT') || hasRole('CONTRACTOR')
  const isClient = hasRole('CLIENT')
  const canManage = hasRole('ADMIN') || hasRole('SUPER_ADMIN') || hasRole('ACCOUNT_MANAGER') || hasRole('PROJECT_MANAGER')

  // Tabs definition per view type
  const tabs = isClient
    ? [{ label: 'My Projects' }]
    : isVendor
    ? [{ label: 'Active Projects' }, { label: 'Archived Projects' }]
    : [{ label: 'My Projects' }, { label: 'All Projects' }, { label: 'Archived Projects' }]

  const loadProjects = (tabIndex: number) => {
    setLoading(true)
    let request: Promise<{ data: Project[] }>

    if (isClient) {
      request = projectsApi.listClient()
    } else if (isVendor) {
      request = projectsApi.listVendor(tabIndex === 1)
    } else {
      // PM/AM/Admin view
      if (tabIndex === 0) request = projectsApi.listMine()
      else if (tabIndex === 2) request = projectsApi.list({ status: 'ARCHIVED' })
      else return // All Projects tab handles its own data fetching
    }

    request.then(r => setProjects(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isVendor && activeTab === 1 && !isClient) return // All Projects tab is self-managed
    loadProjects(activeTab)
  }, [activeTab, isVendor, isClient])

  useEffect(() => {
    if (canManage) {
      clientsApi.list().then(r => setClients(r.data))
    }
  }, [canManage])

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
      loadProjects(activeTab)
      closeModal()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project? This will also delete all milestones and tasks.')) return
    await projectsApi.remove(id)
    loadProjects(activeTab)
  }

  const isEditing = modal !== null && modal !== 'create'
  const set = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }))
  const PRIORITIES: ProjectPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  // "All Projects" tab for PM/AM view renders its own data-fetching component
  const isAllProjectsTab = !isClient && !isVendor && activeTab === 1

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('nav.projects')}</h1>
        {canManage && (
          <button onClick={openCreate} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
            + {t('common.create')}
          </button>
        )}
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === i
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* All Projects tab (PM/AM view) has its own filter-aware component */}
      {isAllProjectsTab ? (
        <AllProjectsTab onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <ProjectTable
          projects={projects}
          loading={loading}
          onEdit={canManage ? openEdit : undefined}
          onDelete={canManage ? handleDelete : undefined}
          showActions={canManage}
        />
      )}

      {/* Create / Edit modal */}
      {modal !== null && (
        <Modal title={isEditing ? t('projects.editProject') : t('projects.newProject')} onClose={closeModal}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.name')} *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.description')}</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.client')} *</label>
                <select
                  value={form.clientId}
                  onChange={e => set('clientId', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>— select —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.status')}</label>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as ProjectStatus[]).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.priority')}</label>
                <select
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>{PRIORITY_ICON[p]} {t(`projects.priority_${p}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.billingMethod')}</label>
                <select
                  value={form.billingMethod}
                  onChange={e => set('billingMethod', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['HOURLY', 'FIXED', 'MIXED'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.startDate')}</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => set('startDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.endDate')}</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => set('endDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.clientId}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
