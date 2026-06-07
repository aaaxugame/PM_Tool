import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardApi, type PMDashboard } from '../../api/dashboard'
import PendingQuotesPanel from './PendingQuotesPanel'
import { projectsApi, type Project } from '../../api/projects'

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  REVIEW: 'bg-yellow-500',
  DONE: 'bg-green-500',
}

const TASK_STATUS_TEXT: Record<string, string> = {
  TODO: 'text-gray-600 bg-gray-100',
  IN_PROGRESS: 'text-blue-700 bg-blue-100',
  REVIEW: 'text-yellow-700 bg-yellow-100',
  DONE: 'text-green-700 bg-green-100',
}

const HEALTH_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  ON_TRACK: 'bg-green-100 text-green-700',
  AT_RISK: 'bg-orange-100 text-orange-700',
  DELAYED: 'bg-red-100 text-red-700',
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-3/4 mb-3" />
            <div className="h-8 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-48" />
        ))}
      </div>
    </div>
  )
}

function PendingProjectRequestsPanel() {
  const navigate = useNavigate()
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Pending Vendor Project Requests</h2>
        {requests.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            {requests.length} awaiting review
          </span>
        )}
      </div>
      {loading ? (
        <div className="px-4 py-6 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">No pending project requests.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2 text-left font-medium">Project Name</th>
              <th className="px-4 py-2 text-left font-medium">Vendor</th>
              <th className="px-4 py-2 text-right font-medium">Proposed Cost</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  <button onClick={() => navigate('/projects')} className="text-blue-600 hover:underline">{r.name}</button>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.requestingVendor?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {r.proposedCost ? `$${parseFloat(r.proposedCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                </td>
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
      )}
    </div>
  )
}

export default function PMDashboard() {
  const [data, setData] = useState<PMDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.pmDashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />
  if (!data) return <p className="text-sm text-gray-400 text-center py-10">Failed to load dashboard.</p>

  const openTasks = (data.taskHealth['TODO'] ?? 0) + (data.taskHealth['IN_PROGRESS'] ?? 0) + (data.taskHealth['REVIEW'] ?? 0)
  const totalTasks = Object.values(data.taskHealth).reduce((s, v) => s + v, 0)

  const statCards = [
    { label: 'My Projects', value: data.projectCount, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Hours This Week', value: data.hoursThisWeek, color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Pending Timesheets', value: data.pendingTimesheets, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { label: 'Open Tasks', value: openTasks, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ]

  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{card.label}</p>
            <p className={`text-2xl font-bold px-2 py-1 rounded border w-fit ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Task Health + Project Health */}
      <div className="grid grid-cols-2 gap-6">
        {/* Task Health bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Task Health</h2>
          {totalTasks === 0 ? (
            <p className="text-sm text-gray-400">No tasks found.</p>
          ) : (
            <>
              {/* Horizontal stacked bar */}
              <div className="flex h-4 rounded-full overflow-hidden mb-4">
                {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const).map(status => {
                  const count = data.taskHealth[status] ?? 0
                  const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0
                  if (pct === 0) return null
                  return (
                    <div
                      key={status}
                      className={`${TASK_STATUS_COLORS[status]}`}
                      style={{ width: `${pct}%` }}
                      title={`${status}: ${count}`}
                    />
                  )
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const).map(status => {
                  const count = data.taskHealth[status] ?? 0
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TASK_STATUS_TEXT[status]}`}>
                        {status.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-semibold text-gray-600 ml-2">{count}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Project Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Project Health</h2>
          {Object.values(data.healthDist).every(v => v === 0) ? (
            <p className="text-sm text-gray-400">No projects found.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.healthDist).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${HEALTH_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Milestones + Overdue Tasks */}
      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming Milestones */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Upcoming Milestones (30 days)</h2>
          </div>
          {data.upcomingMilestones.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No upcoming milestones.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium">Milestone</th>
                  <th className="px-4 py-2 text-left font-medium">Project</th>
                  <th className="px-4 py-2 text-left font-medium">Due Date</th>
                  <th className="px-4 py-2 text-center font-medium">Invoice?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.upcomingMilestones.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.project.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.dueDate.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-center">
                      {m.triggersInvoice
                        ? <span className="text-green-600 text-xs font-medium">Yes</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Overdue Tasks</h2>
          </div>
          {data.overdueTasks.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No overdue tasks.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium">Task</th>
                  <th className="px-4 py-2 text-left font-medium">Project</th>
                  <th className="px-4 py-2 text-left font-medium">Due Date</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.overdueTasks.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.project.name}</td>
                    <td className="px-4 py-3 text-red-500">{t.dueDate.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TASK_STATUS_TEXT[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Budget Utilization */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Budget Utilization</h2>
        </div>
        {data.budgetUtilization.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No projects found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="px-4 py-2 text-left font-medium">Project</th>
                <th className="px-4 py-2 text-right font-medium">Estimated Hours</th>
                <th className="px-4 py-2 text-right font-medium">Logged Hours</th>
                <th className="px-4 py-2 text-left font-medium w-40">Usage %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.budgetUtilization.map(b => {
                const pct = b.estimatedHours > 0
                  ? Math.min(Math.round((b.loggedHours / b.estimatedHours) * 100), 100)
                  : 0
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500'
                return (
                  <tr key={b.projectId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.projectName}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{b.estimatedHours}h</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">{b.loggedHours}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <PendingQuotesPanel />
      <PendingProjectRequestsPanel />
    </div>
  )
}
