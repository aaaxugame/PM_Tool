import { useState, useEffect } from 'react'
import { dashboardApi, type ClientDashboard } from '../../api/dashboard'

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PROJECT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-600',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-700',
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-700',
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-28" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-40" />
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

export default function ClientDashboard() {
  const [data, setData] = useState<ClientDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.clientDashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />
  if (!data) return <p className="text-sm text-gray-400 text-center py-10">Failed to load dashboard.</p>

  return (
    <div className="space-y-6">
      {/* Billing summary (full width) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Billing Summary</h2>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Contracted</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(data.billing.totalContracted)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Invoiced</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(data.billing.totalInvoiced)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-600">{fmt(data.billing.totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Outstanding</p>
            <p className={`text-2xl font-bold ${data.billing.outstanding > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {fmt(data.billing.outstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* My Projects grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">My Projects</h2>
        {data.projectCards.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No projects found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {data.projectCards.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-sm leading-tight">{p.name}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROPOSAL_STATUS_COLORS[p.proposalStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.proposalStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{p.doneTasks}/{p.totalTasks} tasks</span>
                    <span>{p.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>

                {/* PM / AM */}
                <div className="text-xs text-gray-400 space-y-0.5">
                  {p.pm && <p>PM: <span className="text-gray-600">{p.pm.name}</span></p>}
                  {p.am && <p>AM: <span className="text-gray-600">{p.am.name}</span></p>}
                  {p.endDate && (
                    <p>Due: <span className="text-gray-600">{p.endDate.slice(0, 10)}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Invoices + Upcoming Milestones */}
      <div className="grid grid-cols-2 gap-6">
        {/* Open Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Open Invoices</h2>
          </div>
          {data.openInvoices.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No open invoices.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium">#ID</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Due Date</th>
                  <th className="px-4 py-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.openInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">#{String(inv.id).padStart(4, '0')}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.dueDate.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Upcoming Milestones</h2>
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
      </div>

      {/* Recent Activity + Team Members */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No recent activity.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.recentActivity.map(e => {
                const hrs = Math.floor(e.durationMinutes / 60)
                const mins = e.durationMinutes % 60
                const duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
                return (
                  <li key={e.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{e.user.name}</p>
                        {e.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{e.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {e.project?.name ?? 'No project'}
                          {e.task ? ` · ${e.task.name}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-xs font-mono text-gray-600">{duration}</span>
                        <p className="text-xs text-gray-400">{String(e.date).slice(0, 10)}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Team Members</h2>
          {data.teamMembers.length === 0 ? (
            <p className="text-sm text-gray-400">No team members found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.teamMembers.map(m => (
                <span
                  key={m.id}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                >
                  {m.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
