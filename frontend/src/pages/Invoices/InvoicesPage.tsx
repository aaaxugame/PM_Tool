import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { invoicesApi, type Invoice, type InvoiceStatus } from '../../api/invoices'
import { clientsApi, type Client } from '../../api/organizations'
import { projectsApi, type Project } from '../../api/projects'
import Modal from '../../components/Modal'

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-yellow-50 text-yellow-700',
  PAID: 'bg-green-50 text-green-700',
  OVERDUE: 'bg-red-50 text-red-600',
}

type LineItemForm = { description: string; quantity: string; unitPrice: string }

const EMPTY_LINE: LineItemForm = { description: '', quantity: '1', unitPrice: '' }
const EMPTY_INVOICE = {
  clientId: 0, projectId: 0, invoiceDate: '', dueDate: '', taxRate: '0', notes: '',
}

export default function InvoicesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<typeof EMPTY_INVOICE>(EMPTY_INVOICE)
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ ...EMPTY_LINE }])
  const [saving, setSaving] = useState(false)

  const load = () =>
    invoicesApi.list(statusFilter ? { status: statusFilter } : undefined)
      .then(r => setInvoices(r.data))

  useEffect(() => {
    Promise.all([
      load(),
      clientsApi.list().then(r => setClients(r.data)),
      projectsApi.list().then(r => setProjects(r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [statusFilter])

  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const setLine = (i: number, k: keyof LineItemForm, v: string) =>
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

  const addLine = () => setLineItems(prev => [...prev, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i))

  const lineTotal = (item: LineItemForm) => {
    const q = parseFloat(item.quantity) || 0
    const u = parseFloat(item.unitPrice) || 0
    return q * u
  }
  const subtotal = lineItems.reduce((s, item) => s + lineTotal(item), 0)
  const taxRate = parseFloat(form.taxRate) || 0
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const handleCreate = async () => {
    setSaving(true)
    try {
      const validLines = lineItems.filter(l => l.description && l.quantity && l.unitPrice)
      const payload: Record<string, unknown> = {
        clientId: form.clientId,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        taxRate: parseFloat(form.taxRate) || 0,
        lineItems: validLines.map(l => ({
          description: l.description,
          quantity: parseFloat(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
        })),
      }
      if (form.projectId) payload.projectId = form.projectId
      if (form.notes) payload.notes = form.notes
      await invoicesApi.create(payload)
      await load()
      setModal(false)
    } finally { setSaving(false) }
  }

  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10)
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    setForm({ ...EMPTY_INVOICE, invoiceDate: today, dueDate: due })
    setLineItems([{ ...EMPTY_LINE }])
    setModal(true)
  }

  const handleStatusChange = async (inv: Invoice, status: InvoiceStatus) => {
    await invoicesApi.update(inv.id, { status })
    load()
  }

  const canAdvance: Record<InvoiceStatus, InvoiceStatus | null> = {
    DRAFT: 'SENT', SENT: 'PAID', PAID: null, OVERDUE: 'PAID',
  }

  const displayed = invoices

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Invoices</h1>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as InvoiceStatus | '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            {(['DRAFT', 'SENT', 'PAID', 'OVERDUE'] as InvoiceStatus[]).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={openCreate} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
            + New Invoice
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['#', 'Client', 'Project', 'Invoice Date', 'Due Date', 'Total', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              ) : displayed.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">#{String(inv.id).padStart(4, '0')}</td>
                  <td className="px-4 py-3 font-medium text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate(`/invoices/${inv.id}`)}>
                    {inv.client.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{inv.project?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.invoiceDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.dueDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">
                    ${parseFloat(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {canAdvance[inv.status] && (
                      <button onClick={() => handleStatusChange(inv, canAdvance[inv.status]!)}
                        className="text-xs text-blue-600 hover:underline">
                        Mark {canAdvance[inv.status]}
                      </button>
                    )}
                    <button onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="text-xs text-gray-500 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary bar */}
      {!loading && invoices.length > 0 && (
        <div className="mt-4 flex gap-4">
          {(['DRAFT', 'SENT', 'PAID', 'OVERDUE'] as InvoiceStatus[]).map(s => {
            const group = invoices.filter(i => i.status === s)
            if (group.length === 0) return null
            const tot = group.reduce((a, i) => a + parseFloat(i.total), 0)
            return (
              <div key={s} className={`px-4 py-2 rounded-lg border text-xs ${STATUS_COLORS[s]}`}>
                <span className="font-semibold">{s}</span>: {group.length} invoice{group.length !== 1 ? 's' : ''} · ${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <Modal title="New Invoice" onClose={() => setModal(false)}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client *</label>
                <select value={form.clientId} onChange={e => set('clientId', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>— select —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                <select value={form.projectId} onChange={e => set('projectId', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>— none —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date *</label>
                <input type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate %</label>
                <input type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={e => set('taxRate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Line Items *</label>
                <button onClick={addLine} className="text-xs text-blue-600 hover:underline">+ Add Line</button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" placeholder="Description" value={item.description}
                      onChange={e => setLine(i, 'description', e.target.value)}
                      className="col-span-6 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="number" placeholder="Qty" min="0" step="0.5" value={item.quantity}
                      onChange={e => setLine(i, 'quantity', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="number" placeholder="Unit $" min="0" step="0.01" value={item.unitPrice}
                      onChange={e => setLine(i, 'unitPrice', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <div className="col-span-1 text-xs font-mono text-gray-500 text-right">
                      ${lineTotal(item).toFixed(2)}
                    </div>
                    <button onClick={() => removeLine(i)} disabled={lineItems.length === 1}
                      className="col-span-1 text-red-400 hover:text-red-600 text-xs disabled:opacity-30">✕</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-xs text-right text-gray-500">
                <div>Subtotal: <span className="font-mono font-medium">${subtotal.toFixed(2)}</span></div>
                {taxRate > 0 && <div>Tax ({taxRate}%): <span className="font-mono">${taxAmount.toFixed(2)}</span></div>}
                <div className="text-sm font-semibold text-gray-800">Total: <span className="font-mono">${total.toFixed(2)}</span></div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleCreate}
              disabled={saving || !form.clientId || !form.invoiceDate || !form.dueDate || lineItems.every(l => !l.description || !l.unitPrice)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? t('common.loading') : 'Create Invoice'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
