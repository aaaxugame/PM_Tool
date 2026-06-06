import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { dashboardApi, type TimeReport, type InvoiceReport } from '../../api/dashboard'
import { projectsApi, type Project } from '../../api/projects'
import { clientsApi, type Client } from '../../api/organizations'
import { fmtMoney } from '../../utils/currency'

type ReportTab = 'time' | 'invoices'

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-yellow-50 text-yellow-700',
  PAID: 'bg-green-50 text-green-700', OVERDUE: 'bg-red-50 text-red-600',
}

function fmtMinutes(m: number) {
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function pct(part: number, total: number) {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ReportTab>('time')

  // Filters
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [timeFilters, setTimeFilters] = useState({ projectId: 0, from: '', to: '' })
  const [invoiceFilters, setInvoiceFilters] = useState({ clientId: 0, from: '', to: '' })

  // Data
  const [timeReport, setTimeReport] = useState<TimeReport | null>(null)
  const [invoiceReport, setInvoiceReport] = useState<InvoiceReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    projectsApi.list().then(r => setProjects(r.data))
    clientsApi.list().then(r => setClients(r.data))
    // Load both reports on mount
    loadTimeReport()
    loadInvoiceReport()
  }, [])

  const loadTimeReport = (overrides?: Partial<typeof timeFilters>) => {
    const f = { ...timeFilters, ...overrides }
    setLoading(true)
    const filters: Record<string, unknown> = {}
    if (f.projectId) filters.projectId = f.projectId
    if (f.from) filters.from = f.from
    if (f.to) filters.to = f.to
    dashboardApi.timeReport(filters as any)
      .then(r => setTimeReport(r.data))
      .finally(() => setLoading(false))
  }

  const loadInvoiceReport = (overrides?: Partial<typeof invoiceFilters>) => {
    const f = { ...invoiceFilters, ...overrides }
    setLoading(true)
    const filters: Record<string, unknown> = {}
    if (f.clientId) filters.clientId = f.clientId
    if (f.from) filters.from = f.from
    if (f.to) filters.to = f.to
    dashboardApi.invoiceReport(filters as any)
      .then(r => setInvoiceReport(r.data))
      .finally(() => setLoading(false))
  }

  const setTF = (k: string, v: unknown) => {
    const next = { ...timeFilters, [k]: v }
    setTimeFilters(next as typeof timeFilters)
    loadTimeReport(next as typeof timeFilters)
  }

  const setIF = (k: string, v: unknown) => {
    const next = { ...invoiceFilters, [k]: v }
    setInvoiceFilters(next as typeof invoiceFilters)
    loadInvoiceReport(next as typeof invoiceFilters)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">{t('reports.title')}</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([['time', t('reports.timeReport')], ['invoices', t('reports.invoiceReport')]] as [ReportTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TIME REPORT ── */}
      {tab === 'time' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select value={timeFilters.projectId}
              onChange={e => setTF('projectId', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">From</label>
              <input type="date" value={timeFilters.from}
                onChange={e => setTF('from', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">To</label>
              <input type="date" value={timeFilters.to}
                onChange={e => setTF('to', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => { setTimeFilters({ projectId: 0, from: '', to: '' }); loadTimeReport({ projectId: 0, from: '', to: '' }) }}
              className="text-sm text-gray-500 hover:text-gray-700 underline">Clear</button>
          </div>

          {/* Summary cards */}
          {timeReport && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-600 mb-0.5">{t('reports.totalTime')}</p>
                <p className="text-xl font-semibold font-mono text-blue-800">{timeReport.totalHours}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 mb-0.5">Projects</p>
                <p className="text-xl font-semibold text-gray-800">{timeReport.byProject.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 mb-0.5">Entries</p>
                <p className="text-xl font-semibold text-gray-800">{timeReport.entries.length}</p>
              </div>
            </div>
          )}

          {/* By-project breakdown */}
          {timeReport && timeReport.byProject.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">By Project</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Project', 'Entries', 'Hours', 'Share'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {timeReport.byProject.map(row => (
                    <tr key={row.projectId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.projectName}</td>
                      <td className="px-4 py-3 text-gray-500">{row.entries}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{fmtMinutes(row.totalMinutes)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct(row.totalMinutes, timeReport.totalMinutes)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">
                            {pct(row.totalMinutes, timeReport.totalMinutes)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Entry log */}
          {timeReport && timeReport.entries.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Entry Log</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Date', 'User', 'Project', 'Task', 'Duration', 'Description'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {timeReport.entries.slice(0, 50).map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{e.date.slice(0, 10)}</td>
                      <td className="px-4 py-2.5 text-gray-700">{e.user.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{e.project?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{e.task?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{fmtMinutes(e.durationMinutes)}</td>
                      <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{e.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {timeReport.entries.length > 50 && (
                <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                  Showing first 50 of {timeReport.entries.length} entries
                </p>
              )}
            </div>
          )}

          {timeReport && timeReport.entries.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">{t('common.noData')}</p>
          )}

          {loading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}
        </div>
      )}

      {/* ── INVOICE REPORT ── */}
      {tab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select value={invoiceFilters.clientId}
              onChange={e => setIF('clientId', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">From</label>
              <input type="date" value={invoiceFilters.from}
                onChange={e => setIF('from', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">To</label>
              <input type="date" value={invoiceFilters.to}
                onChange={e => setIF('to', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => { setInvoiceFilters({ clientId: 0, from: '', to: '' }); loadInvoiceReport({ clientId: 0, from: '', to: '' }) }}
              className="text-sm text-gray-500 hover:text-gray-700 underline">Clear</button>
          </div>

          {/* Summary cards */}
          {invoiceReport && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-600 mb-0.5">{t('reports.totalBilled')}</p>
                <p className="text-xl font-semibold font-mono text-blue-800">
                  {fmtMoney(invoiceReport.totalBilled)}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-xs text-green-600 mb-0.5">{t('reports.collected')}</p>
                <p className="text-xl font-semibold font-mono text-green-800">
                  {fmtMoney(invoiceReport.totalCollected)}
                </p>
              </div>
              <div className={`rounded-xl px-4 py-3 border ${invoiceReport.outstanding > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs mb-0.5 ${invoiceReport.outstanding > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{t('reports.outstanding')}</p>
                <p className={`text-xl font-semibold font-mono ${invoiceReport.outstanding > 0 ? 'text-orange-800' : 'text-gray-700'}`}>
                  {fmtMoney(invoiceReport.outstanding)}
                </p>
              </div>
            </div>
          )}

          {/* By-status breakdown */}
          {invoiceReport && (
            <div className="grid grid-cols-4 gap-3">
              {(['DRAFT', 'SENT', 'PAID', 'OVERDUE'] as const).map(s => (
                <div key={s} className={`rounded-xl border px-4 py-3 ${INVOICE_STATUS_COLORS[s]}`}>
                  <p className="text-xs font-medium mb-1">{s}</p>
                  <p className="text-lg font-semibold font-mono">
                    ${invoiceReport.byStatus[s].toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Invoice table */}
          {invoiceReport && invoiceReport.invoices.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Invoices ({invoiceReport.invoices.length})</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['#', 'Client', 'Date', 'Due', 'Total', 'Collected', 'Balance', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoiceReport.invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">#{String(inv.id).padStart(4, '0')}</td>
                      <td className="px-4 py-2.5 text-gray-800">{inv.client?.name ?? inv.vendor?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{inv.invoiceDate.slice(0, 10)}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{inv.dueDate.slice(0, 10)}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-800">{fmtMoney(inv.total, (inv as any).currency)}</td>
                      <td className="px-4 py-2.5 font-mono text-green-700">{fmtMoney(inv.collected, (inv as any).currency)}</td>
                      <td className="px-4 py-2.5 font-mono text-orange-700">
                        {fmtMoney(Math.max(0, inv.total - inv.collected), (inv as any).currency)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {invoiceReport && invoiceReport.invoices.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">{t('common.noData')}</p>
          )}

          {loading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}
        </div>
      )}
    </div>
  )
}
