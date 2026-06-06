import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi, milestonesApi, type ProjectDetail, type Milestone, type MilestoneStatus, type ProjectPriority } from '../../api/projects'
import { tasksApi, type Task, type TaskStatus } from '../../api/tasks'
import { usersApi, type User } from '../../api/organizations'
import { vendorQuotesApi, budgetsApi, type VendorQuote, type Budget, type QuoteStatus, type PaymentMode } from '../../api/quotesBudgets'
import { vendorsApi, type Vendor } from '../../api/organizations'
import Modal from '../../components/Modal'
import TaskModal from '../Tasks/TaskModal'
import DocumentManager from '../../components/DocumentManager'

// ── Color maps ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', ACTIVE: 'bg-green-50 text-green-700',
  ON_HOLD: 'bg-yellow-50 text-yellow-700', COMPLETED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-600', PENDING: 'bg-gray-100 text-gray-600',
}
const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-blue-50 text-blue-700',
  REVIEW: 'bg-yellow-50 text-yellow-700', DONE: 'bg-green-50 text-green-700',
}
const TASK_STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  TODO: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'DONE', DONE: 'TODO',
}
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-400', MEDIUM: 'text-blue-500', HIGH: 'text-orange-500', URGENT: 'text-red-600',
}
const PROJECT_PRIORITY_BADGE: Record<ProjectPriority, string> = {
  LOW: 'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-blue-50 text-blue-600',
  HIGH: 'bg-orange-50 text-orange-600',
  URGENT: 'bg-red-50 text-red-600',
}
const PRIORITY_ICON: Record<ProjectPriority, string> = {
  LOW: '↓', MEDIUM: '→', HIGH: '↑', URGENT: '⚠',
}
const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600', SUBMITTED: 'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-green-50 text-green-700', REJECTED: 'bg-red-50 text-red-600',
}

// ── Empty forms ──────────────────────────────────────────────────────────────
const MILESTONE_EMPTY = { name: '', description: '', dueDate: '', status: 'PENDING' as MilestoneStatus, triggersInvoice: false }
const QUOTE_EMPTY = {
  vendorId: 0, quotedPrice: '', estimatedHours: '', hourlyRate: '',
  paymentMode: 'TASK' as PaymentMode, peopleCount: '', expiryDate: '',
  taskId: 0, milestoneId: 0,
}
const BUDGET_EMPTY = { amount: '', notes: '', taskId: 0 }

type ActiveTab = 'work' | 'quotes' | 'budget' | 'documents'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const projectId = Number(id)

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [quotes, setQuotes] = useState<VendorQuote[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('work')

  // Milestone modal
  const [mModal, setMModal] = useState<null | 'create' | Milestone>(null)
  const [mForm, setMForm] = useState<typeof MILESTONE_EMPTY>(MILESTONE_EMPTY)
  const [mSaving, setMSaving] = useState(false)

  // Task modal
  const [tModal, setTModal] = useState<null | 'create' | Task>(null)
  const [tMilestoneId, setTMilestoneId] = useState<number | undefined>(undefined)

  // Quote modal
  const [qModal, setQModal] = useState<null | 'create' | VendorQuote>(null)
  const [qForm, setQForm] = useState<typeof QUOTE_EMPTY>(QUOTE_EMPTY)
  const [qSaving, setQSaving] = useState(false)

  // Budget modal
  const [bModal, setBModal] = useState<null | 'create' | Budget>(null)
  const [bForm, setBForm] = useState<typeof BUDGET_EMPTY>(BUDGET_EMPTY)
  const [bSaving, setBSaving] = useState(false)

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadProject = () => projectsApi.get(projectId).then(r => setProject(r.data))
  const loadTasks = () => tasksApi.list({ projectId }).then(r => setTasks(r.data))
  const loadQuotes = () => vendorQuotesApi.list({ projectId }).then(r => setQuotes(r.data))
  const loadBudgets = () => budgetsApi.list({ projectId }).then(r => setBudgets(r.data))

  useEffect(() => {
    Promise.all([
      loadProject(), loadTasks(), loadQuotes(), loadBudgets(),
      usersApi.list().then(r => setUsers(r.data)),
      vendorsApi.list().then(r => setVendors(r.data)),
    ]).finally(() => setLoading(false))
  }, [projectId])

  // ── Milestone handlers ───────────────────────────────────────────────────
  const openMCreate = () => { setMForm(MILESTONE_EMPTY); setMModal('create') }
  const openMEdit = (m: Milestone) => {
    setMForm({ name: m.name, description: m.description ?? '', dueDate: m.dueDate ? m.dueDate.slice(0, 10) : '', status: m.status, triggersInvoice: m.triggersInvoice })
    setMModal(m)
  }
  const setM = (k: string, v: unknown) => setMForm(p => ({ ...p, [k]: v }))
  const handleMSave = async () => {
    setMSaving(true)
    try {
      const payload = Object.fromEntries(Object.entries(mForm).filter(([, v]) => v !== '' && v !== undefined))
      if (mModal === 'create') await milestonesApi.create(projectId, payload)
      else await milestonesApi.update(projectId, (mModal as Milestone).id, payload)
      await loadProject(); setMModal(null)
    } finally { setMSaving(false) }
  }
  const handleMDelete = async (mid: number) => {
    if (!confirm('Delete this milestone?')) return
    await milestonesApi.remove(projectId, mid); loadProject()
  }
  const handleMComplete = async (m: Milestone) => {
    await milestonesApi.update(projectId, m.id, { status: m.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' })
    loadProject()
  }

  // ── Task handlers ────────────────────────────────────────────────────────
  const handleTaskStatusCycle = async (task: Task) => {
    await tasksApi.update(task.id, { status: TASK_STATUS_CYCLE[task.status] }); loadTasks()
  }
  const handleTaskDelete = async (tid: number) => {
    if (!confirm('Delete this task?')) return
    await tasksApi.remove(tid); loadTasks()
  }
  const openTCreate = (milestoneId: number) => {
    setTMilestoneId(milestoneId)
    setTModal('create')
  }

  // ── Quote handlers ───────────────────────────────────────────────────────
  const openQCreate = () => { setQForm(QUOTE_EMPTY); setQModal('create') }
  const openQEdit = (q: VendorQuote) => {
    setQForm({
      vendorId: q.vendorId, quotedPrice: q.quotedPrice,
      estimatedHours: q.estimatedHours ?? '', hourlyRate: q.hourlyRate ?? '',
      paymentMode: q.paymentMode ?? 'TASK',
      peopleCount: q.peopleCount ? String(q.peopleCount) : '',
      expiryDate: q.expiryDate ? q.expiryDate.slice(0, 10) : '',
      taskId: q.taskId ?? 0, milestoneId: q.milestoneId ?? 0,
    })
    setQModal(q)
  }
  const setQ = (k: string, v: unknown) => setQForm(p => ({ ...p, [k]: v }))
  const handleQSave = async () => {
    setQSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries({ ...qForm, projectId, vendorId: qForm.vendorId }).filter(([, v]) => v !== '' && v !== 0 && v !== undefined)
      )
      if (qModal === 'create') await vendorQuotesApi.create(payload)
      else await vendorQuotesApi.update((qModal as VendorQuote).id, payload)
      await loadQuotes(); setQModal(null)
    } finally { setQSaving(false) }
  }
  const handleQDelete = async (qid: number) => {
    if (!confirm('Delete this quote?')) return
    await vendorQuotesApi.remove(qid); loadQuotes()
  }
  const handleQStatusChange = async (q: VendorQuote, status: QuoteStatus) => {
    await vendorQuotesApi.update(q.id, { status }); loadQuotes()
  }

  // ── Budget handlers ──────────────────────────────────────────────────────
  const openBCreate = () => { setBForm(BUDGET_EMPTY); setBModal('create') }
  const openBEdit = (b: Budget) => {
    setBForm({ amount: b.amount, notes: b.notes ?? '', taskId: b.taskId ?? 0 })
    setBModal(b)
  }
  const setB = (k: string, v: unknown) => setBForm(p => ({ ...p, [k]: v }))
  const handleBSave = async () => {
    setBSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries({ ...bForm, projectId }).filter(([, v]) => v !== '' && v !== 0 && v !== undefined)
      )
      if (bModal === 'create') await budgetsApi.create(payload)
      else await budgetsApi.update((bModal as Budget).id, payload)
      await loadBudgets(); setBModal(null)
    } finally { setBSaving(false) }
  }
  const handleBDelete = async (bid: number) => {
    if (!confirm('Delete this budget entry?')) return
    await budgetsApi.remove(bid); loadBudgets()
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount), 0)
  const approvedQuoteTotal = quotes.filter(q => q.status === 'APPROVED').reduce((s, q) => s + parseFloat(q.quotedPrice), 0)

  if (loading) return <p className="text-sm text-gray-400">{t('common.loading')}</p>
  if (!project) return <p className="text-sm text-red-500">Project not found.</p>

  const PRIORITY_DOT: Record<string, string> = {
    LOW: 'bg-gray-300', MEDIUM: 'bg-blue-400', HIGH: 'bg-orange-400', URGENT: 'bg-red-500',
  }

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'work', label: `Work (${project.milestones.length}M · ${tasks.length}T)` },
    { key: 'quotes', label: `Quotes (${quotes.length})` },
    { key: 'budget', label: `Budget (${budgets.length})` },
    { key: 'documents', label: 'Documents' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/projects')} className="text-sm text-blue-600 hover:underline mb-1 block">
            ← {t('nav.projects')}
          </button>
          <h1 className="text-2xl font-semibold text-gray-800">{project.name}</h1>
          {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[project.status]}`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('projects.client'), value: project.client ? `${project.client.name} · ${project.client.currency ?? 'USD'}` : '—' },
          { label: t('projects.billingMethod'), value: project.billingMethod.replace(/_/g, ' ') },
          { label: t('projects.startDate'), value: project.startDate ? project.startDate.slice(0, 10) : '—' },
          { label: t('projects.endDate'), value: project.endDate ? project.endDate.slice(0, 10) : '—' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">{card.label}</p>
            <p className="text-sm font-medium text-gray-800">{card.value}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">{t('projects.priority')}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${PROJECT_PRIORITY_BADGE[project.priority ?? 'MEDIUM']}`}>
            <span>{PRIORITY_ICON[project.priority ?? 'MEDIUM']}</span>
            <span>{t(`projects.priority_${project.priority ?? 'MEDIUM'}`)}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b border-gray-200 mb-4">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── WORK TAB (Project → Milestone → Task hierarchy) ── */}
        {activeTab === 'work' && (() => {
          const renderTaskRow = (task: Task) => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 pl-10 hover:bg-gray-50 border-t border-gray-100 first:border-t-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} title={task.priority} />
              <span className={`flex-1 text-sm min-w-0 truncate ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {task.name}
              </span>
              <span className="text-xs text-gray-400 w-24 truncate flex-shrink-0 hidden md:block">{task.assignee?.name ?? '—'}</span>
              <span className="text-xs text-gray-400 w-24 flex-shrink-0 hidden md:block">{task.dueDate ? task.dueDate.slice(0, 10) : '—'}</span>
              <button onClick={() => handleTaskStatusCycle(task)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap flex-shrink-0 ${TASK_STATUS_COLORS[task.status]}`}>
                {task.status.replace('_', ' ')}
              </button>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setTModal(task)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                <button onClick={() => handleTaskDelete(task.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
              </div>
            </div>
          )

          return (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-gray-700">Work Plan</h2>
                <button onClick={openMCreate} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  + Add Milestone
                </button>
              </div>

              {project.milestones.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">
                  <p className="text-gray-400 text-sm mb-3">No milestones yet — add one to start building your work plan.</p>
                  <button onClick={openMCreate} className="text-blue-600 text-sm hover:underline">+ Add Milestone</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.milestones.map(m => {
                    const mTasks = tasks.filter(t => t.milestoneId === m.id)
                    const doneCount = mTasks.filter(t => t.status === 'DONE').length
                    return (
                      <div key={m.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Milestone header */}
                        <div className={`flex items-center justify-between px-4 py-3 ${m.status === 'COMPLETED' ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <button onClick={() => handleMComplete(m)} title="Toggle complete"
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                m.status === 'COMPLETED'
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-400 hover:border-green-500'
                              }`}>
                              {m.status === 'COMPLETED' && <span className="text-xs leading-none">✓</span>}
                            </button>
                            <span className={`font-semibold text-sm ${m.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {m.name}
                            </span>
                            {m.dueDate && (
                              <span className="text-xs text-gray-400 flex-shrink-0">{m.dueDate.slice(0, 10)}</span>
                            )}
                            {m.triggersInvoice && (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs flex-shrink-0">💰 Invoice</span>
                            )}
                            <span className="text-xs text-gray-400 flex-shrink-0">{doneCount}/{mTasks.length} done</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button onClick={() => openMEdit(m)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                            <button onClick={() => handleMDelete(m.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                          </div>
                        </div>

                        {/* Tasks nested under this milestone */}
                        {mTasks.map(renderTaskRow)}

                        {/* Add task row */}
                        <div className={`px-10 py-2 ${mTasks.length > 0 ? 'border-t border-gray-100' : ''}`}>
                          <button onClick={() => openTCreate(m.id)}
                            className="text-blue-500 text-xs hover:text-blue-700 hover:underline">
                            + Add Task
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Unassigned tasks (no milestone) */}
                  {tasks.filter(t => !t.milestoneId).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                        <span className="font-semibold text-sm text-gray-500">Unassigned Tasks</span>
                      </div>
                      {tasks.filter(t => !t.milestoneId).map(renderTaskRow)}
                    </div>
                  )}
                </div>
              )}
            </>
          )
        })()}

        {/* ── QUOTES TAB ── */}
        {activeTab === 'quotes' && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-700">Vendor Quotes</h2>
              <button onClick={openQCreate} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700">+ Add Quote</button>
            </div>
            {approvedQuoteTotal > 0 && (
              <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                Approved quotes total: <span className="font-semibold">${approvedQuoteTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{[
                    t('admin.vendors'), t('quotes.quotedPrice'), t('quotes.hourlyRate'),
                    t('quotes.paymentMode'), t('quotes.estimatedHours'), t('quotes.peopleCount'),
                    'v', t('quotes.expiryDate'), t('common.status'), ''
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quotes.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
                  ) : quotes.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{q.vendor.name}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono">${parseFloat(q.quotedPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{q.hourlyRate ? `$${parseFloat(q.hourlyRate).toFixed(2)}/h` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {q.paymentMode === 'MILESTONE' ? t('quotes.byMilestone') : t('quotes.byTask')}
                        </span>
                        {q.milestone && <span className="ml-1 text-xs text-gray-400">{q.milestone.name}</span>}
                        {q.task && <span className="ml-1 text-xs text-gray-400">{q.task.name}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{q.estimatedHours ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{q.peopleCount ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">v{q.version}</td>
                      <td className="px-4 py-3 text-gray-500">{q.expiryDate ? q.expiryDate.slice(0, 10) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${QUOTE_STATUS_COLORS[q.status]}`}>{q.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        {q.status === 'PENDING' && (
                          <button onClick={() => handleQStatusChange(q, 'SUBMITTED')} className="text-yellow-600 hover:underline text-xs">{t('common.submit')}</button>
                        )}
                        {q.status === 'SUBMITTED' && <>
                          <button onClick={() => handleQStatusChange(q, 'APPROVED')} className="text-green-600 hover:underline text-xs">{t('common.approve')}</button>
                          <button onClick={() => handleQStatusChange(q, 'REJECTED')} className="text-red-500 hover:underline text-xs">{t('common.reject')}</button>
                        </>}
                        {q.status !== 'APPROVED' && (
                          <button onClick={() => openQEdit(q)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                        )}
                        <button onClick={() => handleQDelete(q.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── BUDGET TAB ── */}
        {activeTab === 'budget' && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-700">Budget</h2>
              <button onClick={openBCreate} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700">+ Add Budget Entry</button>
            </div>
            {budgets.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-4">
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 mb-0.5">Total Budget</p>
                  <p className="text-lg font-semibold text-blue-800">${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-600 mb-0.5">Approved Quotes</p>
                  <p className="text-lg font-semibold text-green-800">${approvedQuoteTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Amount', 'Task', 'Notes', 'Entered By', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {budgets.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
                  ) : budgets.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-800">${parseFloat(b.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-gray-500">{b.task?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{b.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{b.enteredBy.name}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => openBEdit(b)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                        <button onClick={() => handleBDelete(b.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Project Documents</h2>
            <DocumentManager filter={{ projectId }} />
          </div>
        )}
      </div>

      {/* ── MILESTONE MODAL ── */}
      {mModal !== null && (
        <Modal title={typeof mModal === 'string' ? 'New Milestone' : 'Edit Milestone'} onClose={() => setMModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input type="text" value={mForm.name} onChange={e => setM('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={mForm.description} onChange={e => setM('description', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input type="date" value={mForm.dueDate} onChange={e => setM('dueDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={mForm.status} onChange={e => setM('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="PENDING">PENDING</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={mForm.triggersInvoice} onChange={e => setM('triggersInvoice', e.target.checked)} />
              Triggers Invoice when completed
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setMModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleMSave} disabled={mSaving || !mForm.name}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {mSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}

      {/* ── TASK MODAL ── */}
      {tModal !== null && (
        <TaskModal
          task={tModal === 'create' ? null : tModal}
          projects={[project]}
          users={users}
          defaultProjectId={projectId}
          defaultMilestoneId={tModal === 'create' ? tMilestoneId : undefined}
          onClose={() => { setTModal(null); setTMilestoneId(undefined) }}
          onSaved={() => { loadTasks(); setTModal(null); setTMilestoneId(undefined) }}
        />
      )}

      {/* ── QUOTE MODAL ── */}
      {qModal !== null && (
        <Modal title={typeof qModal === 'string' ? t('quotes.newQuote') : `${t('common.edit')} Quote`} onClose={() => setQModal(null)}>
          <div className="space-y-3">
            {/* Vendor + Quoted Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('admin.vendors')} *</label>
                <select value={qForm.vendorId} onChange={e => setQ('vendorId', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>— select —</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.quotedPrice')} *</label>
                <input type="number" min="0" step="0.01" value={qForm.quotedPrice} onChange={e => setQ('quotedPrice', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {/* Hourly Rate + Payment Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.hourlyRate')}</label>
                <input type="number" min="0" step="0.01" value={qForm.hourlyRate} onChange={e => setQ('hourlyRate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.paymentMode')}</label>
                <select value={qForm.paymentMode} onChange={e => setQ('paymentMode', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="TASK">{t('quotes.byTask')}</option>
                  <option value="MILESTONE">{t('quotes.byMilestone')}</option>
                </select>
              </div>
            </div>
            {/* Est. Hours + People + Expiry */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.estimatedHours')}</label>
                <input type="number" min="0" step="0.5" value={qForm.estimatedHours} onChange={e => setQ('estimatedHours', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.peopleCount')}</label>
                <input type="number" min="0" step="1" value={qForm.peopleCount} onChange={e => setQ('peopleCount', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.expiryDate')}</label>
                <input type="date" value={qForm.expiryDate} onChange={e => setQ('expiryDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {/* Scope: Milestone (if paymentMode=MILESTONE) or Task (if paymentMode=TASK) */}
            {qForm.paymentMode === 'MILESTONE' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.milestones')} ({t('quotes.byMilestone')})</label>
                <select value={qForm.milestoneId} onChange={e => setQ('milestoneId', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>— project-level —</option>
                  {project.milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('projects.tasks')} ({t('quotes.byTask')})</label>
                <select value={qForm.taskId} onChange={e => setQ('taskId', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>— project-level —</option>
                  {tasks.map(task => <option key={task.id} value={task.id}>{task.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setQModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleQSave} disabled={qSaving || !qForm.vendorId || !qForm.quotedPrice}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {qSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}

      {/* ── BUDGET MODAL ── */}
      {bModal !== null && (
        <Modal title={typeof bModal === 'string' ? 'New Budget Entry' : 'Edit Budget Entry'} onClose={() => setBModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <input type="number" min="0" step="0.01" value={bForm.amount} onChange={e => setB('amount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Task (optional)</label>
              <select value={bForm.taskId} onChange={e => setB('taskId', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value={0}>— project-level —</option>
                {tasks.map(task => <option key={task.id} value={task.id}>{task.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={bForm.notes} onChange={e => setB('notes', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setBModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleBSave} disabled={bSaving || !bForm.amount}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {bSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
