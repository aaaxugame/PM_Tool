import { useState, useEffect } from 'react'
import { dashboardApi, type AMDashboard } from '../../api/dashboard'
import PendingQuotesPanel from './PendingQuotesPanel'

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-3/4 mb-3" />
            <div className="h-8 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-32" />
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-48" />
        ))}
      </div>
    </div>
  )
}

export default function AMDashboard() {
  const [data, setData] = useState<AMDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.amDashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />
  if (!data) return <p className="text-sm text-gray-400 text-center py-10">Failed to load dashboard.</p>

  const statCards = [
    { label: 'Total Projects', value: data.totalProjects, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Active Projects', value: data.activeProjects, color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Total Clients', value: data.totalClients, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Total Contract Value', value: fmt(data.totalContractValue), color: 'bg-blue-50 text-blue-800 border-blue-200' },
  ]

  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{card.label}</p>
            <p className={`text-xl font-bold px-2 py-1 rounded border w-fit ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue pipeline (full width) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Revenue Pipeline</h2>
          <div className="flex items-center gap-2">
            {data.pendingQuotes > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                {data.pendingQuotes} Quote{data.pendingQuotes !== 1 ? 's' : ''} Pending
              </span>
            )}
            {data.pendingApprovals > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                {data.pendingApprovals} Approval{data.pendingApprovals !== 1 ? 's' : ''} Pending
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Billed</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(data.revenue.totalBilled)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Collected</p>
            <p className="text-2xl font-bold text-green-600">{fmt(data.revenue.totalCollected)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Outstanding</p>
            <p className={`text-2xl font-bold ${data.revenue.outstanding > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {fmt(data.revenue.outstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio by Client + Invoices Requiring Action */}
      <div className="grid grid-cols-2 gap-6">
        {/* Portfolio by Client */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Portfolio by Client</h2>
          </div>
          {data.byClient.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No clients found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium">Client</th>
                  <th className="px-4 py-2 text-right font-medium">Projects</th>
                  <th className="px-4 py-2 text-right font-medium">Active</th>
                  <th className="px-4 py-2 text-right font-medium">Contract Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.byClient.map(c => (
                  <tr key={c.clientId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.clientName}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.totalProjects}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {c.activeProjects}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(c.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invoices Requiring Action */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Invoices Requiring Action</h2>
          </div>
          {data.actionableInvoices.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No invoices require action.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium">#ID</th>
                  <th className="px-4 py-2 text-left font-medium">Client</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-center font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.actionableInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">#{String(inv.id).padStart(4, '0')}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{inv.dueDate ? inv.dueDate.slice(0, 10) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upcoming Milestone Invoice Triggers + Vendor Quote Pipeline */}
      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming Milestone Invoice Triggers */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Upcoming Milestone Invoice Triggers</h2>
          </div>
          {data.upcomingMilestoneTriggers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No upcoming invoice triggers.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium">Milestone</th>
                  <th className="px-4 py-2 text-left font-medium">Project</th>
                  <th className="px-4 py-2 text-left font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.upcomingMilestoneTriggers.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.project.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.dueDate.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <PendingQuotesPanel />
      </div>
    </div>
  )
}
