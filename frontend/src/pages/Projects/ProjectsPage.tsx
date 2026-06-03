import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi, type Project, type ProjectStatus, type BillingMethod, type ProjectPriority, type RiskLevel, type ProjectFilters } from '../../api/projects'
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

const APPROVAL_COLORS = {
  PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  APPROVED: 'bg-green-50 text-green-700 border border-green-200',
  REJECTED: 'bg-red-50 text-red-600 border border-red-200',
}

// ─── Project Request Form (Vendor) ────────────────────────────────────────────

const VENDOR_EMPTY = {
  name: '',
  category: '',
  description: '',
  startDate: '',
  endDate: '',
  proposedWorkers: '',
  requiredSkillSet: '',
  proposedCost: '',
  estimatedHours: '',
}

function ProjectRequestModal({
  project,
  vendorId,
  onClose,
  onSaved,
}: {
  project?: Project
  vendorId: number
  onClose: () => void
  onSaved: () => void
}) {
  const isApproved = project?.approvalStatus === 'APPROVED'
  const isEditing = !!project

  const [form, setForm] = useState({
    name: project?.name ?? '',
    category: project?.category ?? '',
    description: project?.description ?? '',
    startDate: project?.startDate ? project.startDate.slice(0, 10) : '',
    endDate: project?.endDate ? project.endDate.slice(0, 10) : '',
    proposedWorkers: project?.proposedWorkers?.toString() ?? '',
    requiredSkillSet: project?.requiredSkillSet ?? '',
    proposedCost: project?.proposedCost ?? '',
    estimatedHours: project?.estimatedHours ?? '',
  })
  const [saving, setSaving] = useState(false)

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const handleSave = async (submit: boolean) => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        category: form.category || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        proposedWorkers: form.proposedWorkers ? parseInt(form.proposedWorkers) : undefined,
        requiredSkillSet: form.requiredSkillSet || undefined,
        proposedCost: form.proposedCost || undefined,
        estimatedHours: form.estimatedHours || undefined,
      }
      if (!isEditing) {
        payload.requestingVendorId = vendorId
        payload.approvalStatus = submit ? 'PENDING' : 'PENDING'
        payload.status = submit ? 'ACTIVE' : 'DRAFT'
      }
      if (isEditing) {
        await projectsApi.update(project.id, payload)
      } else {
        await projectsApi.create(payload)
      }
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  const fieldClass = (locked: boolean) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      locked ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'
    }`

  return (
    <Modal title={isEditing ? 'Edit Project Request' : 'New Project Request'} onClose={onClose}>
      {isApproved && (
        <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
          This request has been approved. Fields are locked — contact your Project Manager to request changes.
        </div>
      )}

      <div className="space-y-4">
        {/* Basic Information */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Basic Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                disabled={isApproved}
                className={fieldClass(isApproved)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Type / Category</label>
              <input
                type="text"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                disabled={isApproved}
                placeholder="e.g. Web Development, Data Migration…"
                className={fieldClass(isApproved)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                disabled={isApproved}
                rows={3}
                className={fieldClass(isApproved)}
              />
            </div>
          </div>
        </div>

        {/* Proposed Timeline */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Proposed Timeline</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Proposed Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                disabled={isApproved}
                className={fieldClass(isApproved)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Proposed End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                disabled={isApproved}
                className={fieldClass(isApproved)}
              />
            </div>
          </div>
        </div>

        {/* Staffing */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Staffing</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Proposed Number of Workers</label>
              <input
                type="number"
                min="1"
                value={form.proposedWorkers}
                onChange={e => set('proposedWorkers', e.target.value)}
                disabled={isApproved}
                className={fieldClass(isApproved)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Required Skill Set</label>
              <input
                type="text"
                value={form.requiredSkillSet}
                onChange={e => set('requiredSkillSet', e.target.value)}
                disabled={isApproved}
                placeholder="e.g. React, Node.js, AWS…"
                className={fieldClass(isApproved)}
              />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Financial</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.proposedCost}
                onChange={e => set('proposedCost', e.target.value)}
                disabled={isApproved}
                className={fieldClass(isApproved)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.estimatedHours}
                onChange={e => set('estimatedHours', e.target.value)}
                disabled={isApproved}
                className={fieldClass(isApproved)}
              />
            </div>
          </div>
        </div>
      </div>

      {!isApproved && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-4 mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !form.name}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !form.name}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Submit Request'}
          </button>
        </div>
      )}
      {isApproved && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-4 mt-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Close
          </button>
        </div>
      )}
    </Modal>
  )
}

// ─── Project Creation Form (PM / AM / Admin) ──────────────────────────────────

const PM_EMPTY = {
  name: '',
  category: '',
  description: '',
  status: 'DRAFT' as ProjectStatus,
  priority: 'MEDIUM' as ProjectPriority,
  billingMethod: 'HOURLY' as BillingMethod,
  riskLevel: '' as RiskLevel | '',
  clientId: 0,
  vendorId: 0,
  pmId: 0,
  amId: 0,
  startDate: '',
  endDate: '',
  proposedCost: '',
  estimatedHours: '',
  proposedWorkers: '',
  requiredSkillSet: '',
}

function ProjectCreationModal({
  project,
  clients,
  vendors,
  pms,
  ams,
  onClose,
  onSaved,
}: {
  project?: Project
  clients: Client[]
  vendors: Vendor[]
  pms: SimpleUser[]
  ams: SimpleUser[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEditing = !!project

  const getPmId = () => project?.assignments?.find(a => a.assignmentRole === 'PROJECT_MANAGER')?.user?.id ?? 0
  const getAmId = () => project?.assignments?.find(a => a.assignmentRole === 'ACCOUNT_MANAGER')?.user?.id ?? 0

  const [form, setForm] = useState({
    name: project?.name ?? '',
    category: project?.category ?? '',
    description: project?.description ?? '',
    status: project?.status ?? 'DRAFT' as ProjectStatus,
    priority: project?.priority ?? 'MEDIUM' as ProjectPriority,
    billingMethod: project?.billingMethod ?? 'HOURLY' as BillingMethod,
    riskLevel: (project?.riskLevel ?? '') as RiskLevel | '',
    clientId: project?.clientId ?? 0,
    vendorId: project?.requestingVendorId ?? 0,
    pmId: isEditing ? getPmId() : 0,
    amId: isEditing ? getAmId() : 0,
    startDate: project?.startDate ? project.startDate.slice(0, 10) : '',
    endDate: project?.endDate ? project.endDate.slice(0, 10) : '',
    proposedCost: project?.proposedCost ?? '',
    estimatedHours: project?.estimatedHours ?? '',
    proposedWorkers: project?.proposedWorkers?.toString() ?? '',
    requiredSkillSet: project?.requiredSkillSet ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }))

  const handleSave = async (draft: boolean) => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        category: form.category || undefined,
        status: draft ? 'DRAFT' : form.status,
        priority: form.priority,
        billingMethod: form.billingMethod,
        riskLevel: form.riskLevel || undefined,
        clientId: form.clientId || undefined,
        pmId: form.pmId || undefined,
        amId: form.amId || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        proposedCost: form.proposedCost || undefined,
        estimatedHours: form.estimatedHours || undefined,
        proposedWorkers: form.proposedWorkers ? parseInt(form.proposedWorkers) : undefined,
        requiredSkillSet: form.requiredSkillSet || undefined,
      }
      if (!isEditing) {
        payload.approvalStatus = 'APPROVED'
      }
      if (isEditing) {
        await projectsApi.update(project.id, payload)
      } else {
        await projectsApi.create(payload)
      }
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const PRIORITIES: ProjectPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
  const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH']

  return (
    <Modal title={isEditing ? 'Edit Project' : 'Create Project'} onClose={onClose}>
      <div className="space-y-5">

        {/* Basic Information */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Basic Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
                <select value={form.clientId} onChange={e => set('clientId', Number(e.target.value))} className={inp}>
                  <option value={0}>— select client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
                <select value={form.vendorId} onChange={e => set('vendorId', Number(e.target.value))} className={inp}>
                  <option value={0}>— select vendor —</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                placeholder="e.g. Web Development, Data Migration…"
                className={inp}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inp} />
            </div>
          </div>
        </div>

        {/* Ownership */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ownership</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Manager</label>
              <select value={form.pmId} onChange={e => set('pmId', Number(e.target.value))} className={inp}>
                <option value={0}>— select PM —</option>
                {pms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Manager</label>
              <select value={form.amId} onChange={e => set('amId', Number(e.target.value))} className={inp}>
                <option value={0}>— select AM —</option>
                {ams.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Timeline</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Financial</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Billing Model *</label>
              <select value={form.billingMethod} onChange={e => set('billingMethod', e.target.value)} className={inp}>
                {(['HOURLY', 'FIXED', 'MIXED'] as BillingMethod[]).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Cost ($)</label>
              <input type="number" min="0" step="0.01" value={form.proposedCost} onChange={e => set('proposedCost', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Hours</label>
              <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        {/* Resources */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Resources</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Workers</label>
              <input type="number" min="0" value={form.proposedWorkers} onChange={e => set('proposedWorkers', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Required Skill Set</label>
              <input type="text" value={form.requiredSkillSet} onChange={e => set('requiredSkillSet', e.target.value)} placeholder="e.g. React, Node.js…" className={inp} />
            </div>
          </div>
        </div>

        {/* Project Settings */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Project Settings</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
                {(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as ProjectStatus[]).map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inp}>
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{PRIORITY_ICON[p]} {p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Risk Level</label>
              <select value={form.riskLevel} onChange={e => set('riskLevel', e.target.value)} className={inp}>
                <option value="">— none —</option>
                {RISK_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 py-4 mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || !form.name}
          className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button
          onClick={() => handleSave(false)}
          disabled={saving || !form.name || !form.billingMethod}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Project Table ────────────────────────────────────────────────────────────

function ProjectTable({
  projects,
  loading,
  onEdit,
  onDelete,
  showActions,
  showApprovalStatus,
}: {
  projects: Project[]
  loading: boolean
  onEdit?: (p: Project) => void
  onDelete?: (id: number) => void
  showActions?: boolean
  showApprovalStatus?: boolean
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
              showApprovalStatus ? 'Approval' : t('common.status'),
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
              <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
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
              <td className="px-4 py-3 text-gray-500">{p.client?.name ?? '—'}</td>
              <td className="px-4 py-3">
                {showApprovalStatus ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${APPROVAL_COLORS[p.approvalStatus]}`}>
                    {p.approvalStatus}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                )}
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

// ─── All Projects tab (PM / AM / Admin) with filter bar ───────────────────────

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
          <button onClick={() => setFilters({})} className="text-xs text-gray-400 hover:text-gray-600 underline">
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
  const { hasRole, user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [pms, setPms] = useState<SimpleUser[]>([])
  const [ams, setAms] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | Project>(null)
  const [saving, setSaving] = useState(false)

  const isVendor = hasRole('VENDOR_CONTACT') || hasRole('CONTRACTOR')
  const isClient = hasRole('CLIENT')
  const canManage = hasRole('ADMIN') || hasRole('SUPER_ADMIN') || hasRole('ACCOUNT_MANAGER') || hasRole('PROJECT_MANAGER')

  const tabs = isClient
    ? [{ label: 'My Projects' }]
    : isVendor
    ? [{ label: 'Current Projects' }, { label: 'My Requests' }, { label: 'Archived Projects' }]
    : [{ label: 'My Projects' }, { label: 'All Projects' }, { label: 'Archived Projects' }]

  const loadProjects = (tabIndex: number) => {
    setLoading(true)
    let request: Promise<{ data: Project[] }>

    if (isClient) {
      request = projectsApi.listClient()
    } else if (isVendor) {
      if (tabIndex === 0) request = projectsApi.listVendor(false)
      else if (tabIndex === 1) request = projectsApi.listVendorRequests()
      else request = projectsApi.listVendor(true)
    } else {
      if (tabIndex === 0) request = projectsApi.listMine()
      else if (tabIndex === 2) request = projectsApi.list({ status: 'ARCHIVED' })
      else return // All Projects tab self-manages
    }

    request.then(r => setProjects(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isVendor && !isClient && activeTab === 1) return
    loadProjects(activeTab)
  }, [activeTab, isVendor, isClient])

  useEffect(() => {
    if (canManage) {
      clientsApi.list().then(r => setClients(r.data))
      vendorsApi.list().then(r => setVendors(r.data))
      usersApi.listByRole('PROJECT_MANAGER').then(r => setPms(r.data))
      usersApi.listByRole('ACCOUNT_MANAGER').then(r => setAms(r.data))
    }
  }, [canManage])

  const openCreate = () => setModal('create')
  const openEdit = (p: Project) => setModal(p)
  const closeModal = () => setModal(null)

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project? This will also delete all milestones and tasks.')) return
    await projectsApi.remove(id)
    loadProjects(activeTab)
  }

  const isEditing = modal !== null && modal !== 'create'
  const isAllProjectsTab = !isClient && !isVendor && activeTab === 1

  // Vendor ID for request form
  const vendorId = (user as any)?.vendor?.id ?? (user as any)?.vendorId ?? 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('nav.projects')}</h1>
        {(canManage || isVendor) && (
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {isVendor ? '+ New Request' : `+ ${t('common.create')}`}
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

      {isAllProjectsTab ? (
        <AllProjectsTab onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <ProjectTable
          projects={projects}
          loading={loading}
          onEdit={canManage || (isVendor && activeTab === 1) ? openEdit : undefined}
          onDelete={canManage || (isVendor && activeTab === 1) ? handleDelete : undefined}
          showActions={canManage || (isVendor && activeTab === 1)}
          showApprovalStatus={isVendor && activeTab === 1}
        />
      )}

      {/* Modals */}
      {modal !== null && isVendor && (
        <ProjectRequestModal
          project={isEditing ? (modal as Project) : undefined}
          vendorId={vendorId}
          onClose={closeModal}
          onSaved={() => loadProjects(activeTab)}
        />
      )}
      {modal !== null && canManage && (
        <ProjectCreationModal
          project={isEditing ? (modal as Project) : undefined}
          clients={clients}
          vendors={vendors}
          pms={pms}
          ams={ams}
          onClose={closeModal}
          onSaved={() => loadProjects(activeTab)}
        />
      )}
    </div>
  )
}
