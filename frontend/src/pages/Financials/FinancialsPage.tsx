import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoicesApi, type FinancialRow } from '../../api/invoices'
import { vendorsApi, type Vendor } from '../../api/organizations'
import { clientsApi, type Client } from '../../api/organizations'

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const BILLING_LABELS: Record<string, string> = {
  TIME_AND_MATERIALS: 'T&M',
  FIXED:              'Fixed',
  MILESTONE:          'Milestone',
  MIXED:              'Mixed',
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  )
}

export default function FinancialsPage() {
  const navigate = useNavigate()

  const [rows, setRows]         = useState<FinancialRow[]>([])
  const [vendors, setVendors]   = useState<Vendor[]>([])
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [vendorFilter, setVendorFilter] = useState(0)
  const [clientFilter, setClientFilter] = useState(0)

  const load = () => {
    setLoading(true)
    invoicesApi.getFinancials({
      vendorId: vendorFilter || undefined,
      clientId: clientFilter || undefined,
    })
      .then(r => setRows(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([
      vendorsApi.list().then(r => setVendors(r.data)),
      clientsApi.list().then(r => setClients(r.data)),
    ])
  }, [])

  useEffect(() => { load() }, [vendorFilter, clientFilter])

  // Aggregate totals
  const totals = rows.reduce(
    (acc, r) => ({
      invoiced:    acc.invoiced    + r.invoiced,
      approved:    acc.approved    + r.approved,
      paid:        acc.paid        + r.paid,
      outstanding: acc.outstanding + r.outstanding,
      pending:     acc.pending     + r.pending,
    }),
    { invoiced: 0, approved: 0, paid: 0, outstanding: 0, pending: 0 },
  )

  const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Financials</h1>
          <p className="text-sm text-gray-500 mt-0.5">Invoice P&L across all projects</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select value={vendorFilter} onChange={e => setVendorFilter(Number(e.target.value))} className={inp}>
            <option value={0}>All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={clientFilter} onChange={e => setClientFilter(Number(e.target.value))} className={inp}>
            <option value={0}>All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(vendorFilter > 0 || clientFilter > 0) && (
            <button onClick={() => { setVendorFilter(0); setClientFilter(0) }}
              className="text-xs text-gray-400 hover:text-gray-600 underline">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Total Invoiced"   value={fmt(totals.invoiced)}    color="bg-white border-gray-200 text-gray-800" />
        <SummaryCard label="Pending Review"   value={fmt(totals.pending)}     sub={`${rows.filter(r => r.pending > 0).length} project(s)`} color="bg-blue-50 border-blue-200 text-blue-800" />
        <SummaryCard label="Approved"         value={fmt(totals.approved)}    color="bg-teal-50 border-teal-200 text-teal-800" />
        <SummaryCard label="Paid"             value={fmt(totals.paid)}        color="bg-green-50 border-green-200 text-green-800" />
        <SummaryCard label="Outstanding"      value={fmt(totals.outstanding)} sub="invoiced − paid" color="bg-orange-50 border-orange-200 text-orange-800" />
      </div>

      {/* Project table */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
          <p className="text-gray-400 text-sm">No financial data found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Project', 'Billing', 'Invoices', 'Invoiced', 'Approved', 'Paid', 'Outstanding', 'Pending Review'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => {
                const pctPaid = row.invoiced > 0 ? (row.paid / row.invoiced) * 100 : 0
                return (
                  <tr key={row.projectId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/projects/${row.projectId}`)}
                        className="font-medium text-blue-600 hover:underline text-left"
                      >
                        {row.projectName}
                      </button>
                      {/* Mini progress bar */}
                      <div className="mt-1.5 h-1 w-32 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all"
                          style={{ width: `${Math.min(pctPaid, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        {BILLING_LABELS[row.billingMethod] ?? row.billingMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-center">{row.invoiceCount}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{fmt(row.invoiced)}</td>
                    <td className="px-4 py-3 font-mono text-teal-700">{fmt(row.approved)}</td>
                    <td className="px-4 py-3 font-mono text-green-700">{fmt(row.paid)}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className={row.outstanding > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                        {fmt(row.outstanding)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {row.pending > 0 ? (
                        <button
                          onClick={() => navigate('/invoices')}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          {fmt(row.pending)}
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Totals footer */}
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-700" colSpan={3}>Totals</td>
                <td className="px-4 py-3 font-mono font-semibold text-gray-800">{fmt(totals.invoiced)}</td>
                <td className="px-4 py-3 font-mono font-semibold text-teal-700">{fmt(totals.approved)}</td>
                <td className="px-4 py-3 font-mono font-semibold text-green-700">{fmt(totals.paid)}</td>
                <td className="px-4 py-3 font-mono font-semibold text-orange-600">{fmt(totals.outstanding)}</td>
                <td className="px-4 py-3 font-mono font-semibold text-blue-600">{fmt(totals.pending)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
