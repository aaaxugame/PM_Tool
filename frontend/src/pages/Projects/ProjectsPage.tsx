import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi, projectMembersApi, type Project, type ProjectStatus, type BillingMethod, type ProjectPriority, type RiskLevel, type ProjectFilters, type ProjectType } from '../../api/projects'
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
  billingMethod: 'TIME_AND_MATERIALS' as BillingMethod,
}

const BILLING_METHOD_LABELS: Record<BillingMethod, string> = {
  TIME_AND_MATERIALS: 'Time & Materials',
  FIXED: 'Fixed Price',
  MILESTONE: 'Milestone-Based',
  MIXED: 'Mixed',
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
    billingMethod: (project?.billingMethod ?? 'TIME_AND_MATERIALS') as BillingMethod,
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
        billingMethod: form.billingMethod,
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
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Billing Model *</label>
              <select
                value={form.billingMethod}
                onChange={e => set('billingMethod', e.target.value)}
                disabled={isApproved}
                className={fieldClass(isApproved)}
              >
                {(Object.entries(BILLING_METHOD_LABELS) as [BillingMethod, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
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
  projectType: 'INTERNAL' as ProjectType,
  priority: 'MEDIUM' as ProjectPriority,
  billingMethod: 'TIME_AND_MATERIALS' as BillingMethod,
  riskLevel: '' as RiskLevel | '',
  clientId: 0,
  assignedVendorId: 0,
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
  teamMembers,
  onClose,
  onSaved,
}: {
  project?: Project
  clients: Client[]
  vendors: Vendor[]
  pms: SimpleUser[]
  ams: SimpleUser[]
  teamMembers: SimpleUser[]
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
    projectType: project?.projectType ?? 'INTERNAL' as ProjectType,
    priority: project?.priority ?? 'MEDIUM' as ProjectPriority,
    billingMethod: project?.billingMethod ?? 'TIME_AND_MATERIALS' as BillingMethod,
    riskLevel: (project?.riskLevel ?? '') as RiskLevel | '',
    clientId: project?.clientId ?? 0,
    assignedVendorId: project?.assignedVendorId ?? 0,
    pmId: isEditing ? getPmId() : 0,
    amId: isEditing ? getAmId() : 0,
    startDate: project?.startDate ? project.startDate.slice(0, 10) : '',
    endDate: project?.endDate ? project.endDate.slice(0, 10) : '',
    proposedCost: project?.proposedCost ?? '',
    estimatedHours: project?.estimatedHours ?? '',
    proposedWorkers: project?.proposedWorkers?.toString() ?? '',
    requiredSkillSet: project?.requiredSkillSet ?? '',
  })
  const [selectedMembers, setSelectedMembers] = useState<number[]>(
    project?.members?.map(m => m.userId) ?? []
  )
  const [saving, setSaving] = useState(false)
  const set = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }))

  const toggleMember = (uid: number) =>
    setSelectedMembers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])

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
      if (form.projectType === 'VENDOR') {
        payload.assignedVendorId = form.assignedVendorId || undefined
      }
      let savedId: number
      if (isEditing) {
        const res = await projectsApi.update(project.id, payload)
        savedId = res.data.id
      } else {
        payload.projectType = form.projectType
        payload.approvalStatus = 'APPROVED'
        const res = await projectsApi.create(payload)
        savedId = res.data.id
      }

      // Sync team members for INTERNAL projects
      if (form.projectType === 'INTERNAL') {
        const prev = project?.members?.map(m => m.userId) ?? []
        const toAdd = selectedMembers.filter(id => !prev.includes(id))
        const toRemove = prev.filter(id => !selectedMembers.includes(id))
        await Promise.all([
          ...toAdd.map(uid => projectMembersApi.add(savedId, uid)),
          ...toRemove.map(uid => projectMembersApi.remove(savedId, uid)),
        ])
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

        {/* Project Type — create only, locked after creation */}
        {!isEditing && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Project Type</h3>
            <div className="flex gap-3">
              {(['INTERNAL', 'VENDOR'] as ProjectType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('projectType', t)}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    form.projectType === t
                      ? t === 'INTERNAL'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-purple-50 border-purple-500 text-purple-700'
                      : 'border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {t === 'INTERNAL' ? '🏢 Internal' : '🤝 Vendor'}
                </button>
              ))}
            </div>
          </div>
        )}

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
              {form.projectType === 'VENDOR' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Vendor</label>
                  {isEditing && project?.requestingVendorId ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-gray-500">Originated by: <span className="font-medium text-gray-700">{project.requestingVendor?.name}</span></p>
                      <select value={form.assignedVendorId} onChange={e => set('assignedVendorId', Number(e.target.value))} className={inp}>
                        <option value={0}>— select vendor —</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <select value={form.assignedVendorId} onChange={e => set('assignedVendorId', Number(e.target.value))} className={inp}>
                      <option value={0}>— select vendor —</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  )}
                </div>
              )}
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
                {(['TIME_AND_MATERIALS', 'FIXED', 'MILESTONE', 'MIXED'] as BillingMethod[]).map(m => (
                  <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                ))}
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
          <div className="space-y-3">
            {form.projectType === 'INTERNAL' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Team Members</label>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                  {teamMembers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">No team members found.</p>
                  ) : teamMembers.map(u => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{u.name}</span>
                      <span className="text-xs text-gray-400">{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Workers (count)</label>
                  <input type="number" min="0" value={form.proposedWorkers} onChange={e => set('proposedWorkers', e.target.value)} className={inp} />
                </div>
              </div>
            )}
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
              <td className="px-4 py-3 text-gray-500">{p.billingMethod.replace(/_/g, ' ')}</td>
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

// ─── Vendor Requests tab (PM / AM / Admin) ────────────────────────────────────

function VendorRequestsTab() {
  const [requests, setRequests] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    projectsApi.listPendingRequests().then(r => setRequests(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAction = async (id: number, approvalStatus: 'APPROVED' | 'REJECTED') => {
    setActing(id)
    try {
      await projectsApi.update(id, { approvalStatus })
      load()
    } finally { setActing(null) }
  }

  if (loading) return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Loading…</div>

  if (requests.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
      No pending vendor project requests.
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Project Name', 'Vendor', 'Category', 'Billing', 'Proposed Cost', 'Submitted', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requests.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
              <td className="px-4 py-3 text-gray-600">{r.requestingVendor?.name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{r.category ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{BILLING_METHOD_LABELS[r.billingMethod]}</td>
              <td className="px-4 py-3 font-mono text-gray-700">
                {r.proposedCost ? `$${parseFloat(r.proposedCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
              </td>
              <td className="px-4 py-3 text-gray-500">{r.createdAt.slice(0, 10)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    disabled={acting === r.id}
                    onClick={() => handleAction(r.id, 'APPROVED')}
                    className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={acting === r.id}
                    onClick={() => handleAction(r.id, 'REJECTED')}
                    className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </td>
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
  refreshKey,
}: {
  onEdit: (p: Project) => void
  onDelete: (id: number) => void
  refreshKey: number
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
  }, [filters, refreshKey])

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
  const [teamMembers, setTeamMembers] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | Project>(null)
  const [saving, setSaving] = useState(false)
  const [allProjectsRefreshKey, setAllProjectsRefreshKey] = useState(0)

  const isVendor = hasRole('VENDOR_CONTACT') || hasRole('CONTRACTOR')
  const isClient = hasRole('CLIENT')
  const canManage = hasRole('ADMIN') || hasRole('SUPER_ADMIN') || hasRole('ACCOUNT_MANAGER') || hasRole('PROJECT_MANAGER')

  const tabs = isClient
    ? [{ label: 'My Projects' }]
    : isVendor
    ? [{ label: 'Current Projects' }, { label: 'My Requests' }, { label: 'Archived Projects' }]
    : [{ label: 'My Projects' }, { label: 'All Projects' }, { label: 'Vendor Requests' }, { label: 'Archived Projects' }]

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
      else if (tabIndex === 3) request = projectsApi.list({ status: 'ARCHIVED' })
      else return // All Projects (tab 1) and Vendor Requests (tab 2) self-manage
    }

    request.then(r => setProjects(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isVendor && !isClient && (activeTab === 1 || activeTab === 2)) return
    loadProjects(activeTab)
  }, [activeTab, isVendor, isClient])

  useEffect(() => {
    if (canManage) {
      clientsApi.list().then(r => setClients(r.data))
      vendorsApi.list().then(r => setVendors(r.data))
      usersApi.listByRole('PROJECT_MANAGER').then(r => setPms(r.data))
      usersApi.listByRole('ACCOUNT_MANAGER').then(r => setAms(r.data))
      usersApi.listByRole('TEAM_MEMBER').then(r => setTeamMembers(r.data))
    }
  }, [canManage])

  const openCreate = () => setModal('create')
  const openEdit = (p: Project) => setModal(p)
  const closeModal = () => setModal(null)

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project? This will also delete all milestones and tasks.')) return
    await projectsApi.remove(id)
    setAllProjectsRefreshKey(k => k + 1)
    loadProjects(activeTab)
  }

  const isEditing = modal !== null && modal !== 'create'
  const isAllProjectsTab = !isClient && !isVendor && activeTab === 1
  const isVendorRequestsTab = !isClient && !isVendor && activeTab === 2

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
        <AllProjectsTab onEdit={openEdit} onDelete={handleDelete} refreshKey={allProjectsRefreshKey} />
      ) : isVendorRequestsTab ? (
        <VendorRequestsTab />
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
          onSaved={() => {
            if (!isEditing) {
              setActiveTab(1)
              loadProjects(1)
            } else {
              loadProjects(activeTab)
            }
          }}
        />
      )}
      {modal !== null && canManage && (
        <ProjectCreationModal
          project={isEditing ? (modal as Project) : undefined}
          clients={clients}
          vendors={vendors}
          pms={pms}
          ams={ams}
          teamMembers={teamMembers}
          onClose={closeModal}
          onSaved={() => { setAllProjectsRefreshKey(k => k + 1); loadProjects(activeTab) }}
        />
      )}
    </div>
  )
}
