import { useState, useEffect } from 'react'
import { dashboardApi, type VendorDashboard } from '../../api/dashboard'

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const HEALTH_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  ON_TRACK: 'bg-green-100 text-green-700',
  AT_RISK: 'bg-orange-100 text-orange-700',
  DELAYED: 'bg-red-100 text-red-700',
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-3/4 mb-3" />
            <div className="h-8 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-40" />
        ))}
      </div>
    </div>
  )
}

export default function VendorDashboard() {
  const [data, setData] = useState<VendorDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.vendorDashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />
  if (!data) return <p className="text-sm text-gray-400 text-center py-10">Failed to load dashboard.</p>

  const metricCards = [
    { label: 'Total Contract Value', value: fmt(data.totalContractValue), color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Invoiced', value: fmt(data.invoicedAmount), color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Paid', value: fmt(data.paidAmount), color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Outstanding', value: fmt(data.outstandingAmount), color: 'bg-red-50 text-red-700 border-red-200' },
  ]

  return (
    <div className="space-y-6">
      {/* Header row: vendor info + metric cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Vendor info card */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Vendor</p>
          <p className="text-lg font-semibold text-gray-800">{data.vendor?.name ?? 'Unknown'}</p>
          {data.vendor?.contactEmail && (
            <p className="text-sm text-gray-500 mt-1">{data.vendor.contactEmail}</p>
          )}
          {data.vendor?.contactPhone && (
            <p className="text-sm text-gray-500">{data.vendor.contactPhone}</p>
          )}
          <p className="text-xs text-gray-400 mt-3">{data.totalProjects} project{data.totalProjects !== 1 ? 's' : ''}</p>
        </div>

        {/* Metric cards */}
        {metricCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{card.label}</p>
            <p className={`text-xl font-bold px-2 py-1 rounded border w-fit ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Distribution cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Project Approval Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Project Approval Status</h2>
          {Object.entries(data.approvalDist).length === 0 ? (
            <p className="text-sm text-gray-400">No data</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.approvalDist).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${APPROVAL_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {status}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Project Health</h2>
          {Object.values(data.healthDist).every(v => v === 0) ? (
            <p className="text-sm text-gray-400">No data</p>
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

      {/* Bottom tables */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pending Quotes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Pending Quotes</h2>
          </div>
          <div className="p-5">
            {data.pendingQuotes === 0 ? (
              <p className="text-sm text-gray-400">No pending quotes at this time.</p>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-blue-600">{data.pendingQuotes}</span>
                <span className="text-sm text-gray-500">quote{data.pendingQuotes !== 1 ? 's' : ''} awaiting review</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent Invoices</h2>
          </div>
          {data.recentInvoices.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No invoices found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium">Invoice #</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">#{String(inv.id).padStart(4, '0')}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.invoiceDate.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {fmt(parseFloat(inv.total))}
                    </td>
                    <td className="px-4 py-3 text-right">
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
      </div>
    </div>
  )
}
