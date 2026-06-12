import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../store/authContext'
import { invoicesApi, type Invoice, type InvoiceStatus, type InvoiceType, type InvoiceDetail } from '../../api/invoices'
import { clientsApi, type Client, vendorsApi, type Vendor } from '../../api/organizations'
import { projectsApi, type Project } from '../../api/projects'
import Modal from '../../components/Modal'
import VendorInvoiceModal from './VendorInvoiceModal'
import { CURRENCIES, currencySymbol } from '../../utils/currency'

const STATUS_COLORS: Record<string, string> = {
  DRAFT:              'bg-gray-100 text-gray-600',
  SUBMITTED:          'bg-blue-50 text-blue-700',
  SENT:               'bg-yellow-50 text-yellow-700',
  APPROVED:           'bg-teal-50 text-teal-700',
  REJECTED:           'bg-red-50 text-red-600',
  REVISION_REQUESTED: 'bg-amber-50 text-amber-700',
  PAID:               'bg-green-50 text-green-700',
  OVERDUE:            'bg-orange-50 text-orange-700',
}

type LineItemForm = { description: string; quantity: string; unitPrice: string }
const EMPTY_LINE: LineItemForm = { description: '', quantity: '1', unitPrice: '' }

export default function InvoicesPage() {
  const { t } = useTranslation()
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()

  const isVendor = hasRole('CONTRACTOR') || hasRole('VENDOR_CONTACT')
  const isAM     = hasRole('ACCOUNT_MANAGER') || hasRole('ADMIN') || hasRole('SUPER_ADMIN')
  const isPM     = hasRole('PROJECT_MANAGER')
  const isClient = hasRole('CLIENT')
  const canReview = isAM || isPM

  const [tab, setTab]               = useState<InvoiceType>(isVendor ? 'VENDOR' : 'CLIENT')
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [clients, setClients]       = useState<Client[]>([])
  const [vendors, setVendors]       = useState<Vendor[]>([])
  const [projects, setProjects]     = useState<Project[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')

  // Vendor invoice modal
  const [vendorModal, setVendorModal]       = useState(false)
  const [editInvoice, setEditInvoice]       = useState<InvoiceDetail | null>(null)

  // Client invoice modal (PM/AM simple form)
  const [clientModal, setClientModal]       = useState(false)
  const [form, setForm]                     = useState<any>({})
  const [lineItems, setLineItems]           = useState<LineItemForm[]>([{ ...EMPTY_LINE }])
  const [saving, setSaving]                 = useState(false)

  // Reject / revision modals
  const [rejectModal, setRejectModal]       = useState<Invoice | null>(null)
  const [rejectNote, setRejectNote]         = useState('')
  const [revisionModal, setRevisionModal]   = useState<Invoice | null>(null)
  const [revisionNote, setRevisionNote]     = useState('')

  const visibleTabs: InvoiceType[] = isVendor ? ['VENDOR'] : isClient ? ['CLIENT'] : ['CLIENT', 'VENDOR']

  const vendorId = (user as any)?.vendor?.id ?? 0

  const load = () =>
    invoicesApi.list({ invoiceType: tab, ...(statusFilter ? { status: statusFilter as InvoiceStatus } : {}) })
      .then(r => setInvoices(r.data))
      .finally(() => setLoading(false))

  useEffect(() => {
    Promise.all([
      load(),
      clientsApi.list().then(r => setClients(r.data)),
      vendorsApi.list().then(r => setVendors(r.data)),
      projectsApi.list().then(r => setProjects(r.data)),
    ])
  }, [])

  useEffect(() => { setLoading(true); load() }, [tab, statusFilter])

  // ── Client invoice form ──────────────────────────────────────────────────

  const setF    = (k: string, v: unknown) => setForm((p: any) => ({ ...p, [k]: v }))
  const setLine = (i: number, k: keyof LineItemForm, v: string) =>
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  const addLine    = () => setLineItems(prev => [...prev, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i))

  const lineTotal = (item: LineItemForm) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
  const subtotal   = lineItems.reduce((s, item) => s + lineTotal(item), 0)
  const taxRate    = parseFloat(form.taxRate) || 0
  const total      = subtotal + subtotal * (taxRate / 100)

  const openClientCreate = () => {
    const today = new Date().toISOString().slice(0, 10)
    const due   = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    setForm({ invoiceDate: today, dueDate: due, taxRate: '0', clientId: 0, projectId: 0, currency: 'USD' })
    setLineItems([{ ...EMPTY_LINE }])
    setClientModal(true)
  }

  const handleClientChange = (clientId: number) => {
    const client = clients.find(c => c.id === clientId)
    setForm((p: any) => ({ ...p, clientId, currency: client?.currency ?? p.currency ?? 'USD' }))
  }

  const handleClientCreate = async () => {
    setSaving(true)
    try {
      const validLines = lineItems.filter(l => l.description && l.quantity && l.unitPrice)
      const payload: any = {
        invoiceType: 'CLIENT',
        invoiceDate: form.invoiceDate,
        dueDate:     form.dueDate,
        taxRate:     parseFloat(form.taxRate) || 0,
        currency:    form.currency ?? 'USD',
        lineItems:   validLines.map(l => ({
          description: l.description,
          quantity:    parseFloat(l.quantity),
          unitPrice:   parseFloat(l.unitPrice),
        })),
      }
      if (form.clientId)  payload.clientId  = form.clientId
      if (form.projectId) payload.projectId = form.projectId
      if (form.notes)     payload.notes     = form.notes
      await invoicesApi.create(payload)
      await load()
      setClientModal(false)
    } finally { setSaving(false) }
  }

  // ── Workflow actions ─────────────────────────────────────────────────────

  const handleSubmit  = async (inv: Invoice) => { await invoicesApi.submit(inv.id);  load() }
  const handleApprove = async (inv: Invoice) => { await invoicesApi.approve(inv.id); load() }

  const openReject   = (inv: Invoice) => { setRejectNote('');   setRejectModal(inv) }
  const handleReject = async () => {
    if (!rejectModal) return
    await invoicesApi.reject(rejectModal.id, rejectNote)
    setRejectModal(null); load()
  }

  const openRevision   = (inv: Invoice) => { setRevisionNote(''); setRevisionModal(inv) }
  const handleRevision = async () => {
    if (!revisionModal) return
    await invoicesApi.requestRevision(revisionModal.id, revisionNote)
    setRevisionModal(null); load()
  }

  const handleEditDraft = async (inv: Invoice) => {
    const r = await invoicesApi.get(inv.id)
    setEditInvoice(r.data)
    setVendorModal(true)
  }

  // ── Status list per tab ──────────────────────────────────────────────────

  const allStatuses: InvoiceStatus[] = tab === 'CLIENT'
    ? (isClient ? ['SENT', 'APPROVED', 'PAID', 'OVERDUE'] : ['DRAFT', 'SENT', 'APPROVED', 'PAID', 'OVERDUE'])
    : ['DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'PAID']

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('invoices.title')}</h1>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as InvoiceStatus | '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            {allStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>

          {/* Vendor: single "New Invoice" button → VendorInvoiceModal */}
          {isVendor && tab === 'VENDOR' && (
            <button onClick={() => { setEditInvoice(null); setVendorModal(true) }}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
              + New Vendor Invoice
            </button>
          )}

          {/* PM/AM: client invoice button */}
          {(isAM || isPM) && tab === 'CLIENT' && (
            <button onClick={openClientCreate}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
              + New Client Invoice
            </button>
          )}

          {/* PM/AM: vendor invoice button (manual, on behalf) */}
          {(isAM || isPM) && tab === 'VENDOR' && (
            <button onClick={() => { setEditInvoice(null); setVendorModal(true) }}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
              + New Vendor Invoice
            </button>
          )}
        </div>
      </div>

      {/* ── Review queue banner for PM/AM ── */}
      {canReview && tab === 'VENDOR' && (() => {
        const pending = invoices.filter(i => i.status === 'SUBMITTED')
        if (pending.length === 0) return null
        return (
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  {pending.length} invoice{pending.length !== 1 ? 's' : ''} awaiting your review
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Total: ${pending.reduce((s, i) => s + parseFloat(i.total), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className="text-sm text-blue-700 font-medium bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Show only →
            </button>
          </div>
        )
      })()}

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex border-b border-gray-200 mb-6">
          {visibleTabs.map(type => (
            <button key={type} onClick={() => setTab(type)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === type ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {type === 'CLIENT' ? `🧾 Client Invoices` : `🔧 Vendor Invoices`}
            </button>
          ))}
        </div>
      )}
      {visibleTabs.length === 1 && <div className="mb-6" />}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['#', tab === 'CLIENT' ? 'Client' : 'Vendor', 'Project', 'Invoice Date', 'Due Date', 'Version', 'Total', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">#{String(inv.id).padStart(4, '0')}</td>
                  <td className="px-4 py-3 font-medium text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate(`/invoices/${inv.id}`)}>
                    {tab === 'CLIENT' ? inv.client?.name : inv.vendor?.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{inv.project?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.invoiceDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.dueDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {inv.version > 1 ? <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">v{inv.version}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">
                    ${parseFloat(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {/* Vendor: edit their own DRAFT */}
                    {tab === 'VENDOR' && inv.status === 'DRAFT' && isVendor && (
                      <button onClick={() => handleEditDraft(inv)} className="text-xs text-gray-600 hover:underline">Edit</button>
                    )}
                    {/* Vendor: submit their DRAFT */}
                    {tab === 'VENDOR' && inv.status === 'DRAFT' && isVendor && (
                      <button onClick={() => handleSubmit(inv)} className="text-xs text-blue-600 hover:underline">Submit</button>
                    )}
                    {/* Vendor: resubmit after revision requested */}
                    {tab === 'VENDOR' && inv.status === 'REVISION_REQUESTED' && isVendor && (
                      <button onClick={() => handleEditDraft(inv)} className="text-xs text-amber-600 hover:underline">Revise</button>
                    )}
                    {/* PM/AM: approve SUBMITTED vendor invoices */}
                    {canReview && tab === 'VENDOR' && inv.status === 'SUBMITTED' && (
                      <button onClick={() => handleApprove(inv)} className="text-xs text-teal-600 hover:underline">Approve</button>
                    )}
                    {/* PM/AM: request revision on SUBMITTED */}
                    {canReview && tab === 'VENDOR' && inv.status === 'SUBMITTED' && (
                      <button onClick={() => openRevision(inv)} className="text-xs text-amber-600 hover:underline">Revise</button>
                    )}
                    {/* PM/AM: reject SUBMITTED */}
                    {isAM && tab === 'VENDOR' && inv.status === 'SUBMITTED' && (
                      <button onClick={() => openReject(inv)} className="text-xs text-red-500 hover:underline">Reject</button>
                    )}
                    {/* Client/AM: approve SENT client invoices */}
                    {(isClient || isAM) && tab === 'CLIENT' && inv.status === 'SENT' && (
                      <button onClick={() => handleApprove(inv)} className="text-xs text-teal-600 hover:underline">Approve</button>
                    )}
                    <button onClick={() => navigate(`/invoices/${inv.id}`)} className="text-xs text-gray-500 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary badges */}
      {!loading && invoices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {allStatuses.map(s => {
            const group = invoices.filter(i => i.status === s)
            if (group.length === 0) return null
            const tot = group.reduce((a, i) => a + parseFloat(i.total), 0)
            return (
              <div key={s} className={`px-3 py-1.5 rounded-lg border text-xs ${STATUS_COLORS[s]}`}>
                <span className="font-semibold">{s.replace(/_/g, ' ')}</span>: {group.length} · ${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vendor Invoice Modal ── */}
      {vendorModal && (
        <VendorInvoiceModal
          vendorId={vendorId}
          existingInvoice={editInvoice ?? undefined}
          onClose={() => { setVendorModal(false); setEditInvoice(null) }}
          onSaved={() => { setVendorModal(false); setEditInvoice(null); load() }}
          isInternal={isAM || isPM}
        />
      )}

      {/* ── Client Invoice Modal (PM/AM) ── */}
      {clientModal && (
        <Modal title="New Client Invoice" onClose={() => setClientModal(false)}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client *</label>
                <select value={form.clientId} onChange={e => handleClientChange(Number(e.target.value))} className={inp}>
                  <option value={0}>— select —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                <select value={form.projectId} onChange={e => setF('projectId', Number(e.target.value))} className={inp}>
                  <option value={0}>— none —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date *</label>
                <input type="date" value={form.invoiceDate} onChange={e => setF('invoiceDate', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                <input type="date" value={form.dueDate} onChange={e => setF('dueDate', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={e => setF('taxRate', e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select value={form.currency ?? 'USD'} onChange={e => setF('currency', e.target.value)} className={inp}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
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
                    <input type="number" placeholder="Price" min="0" step="0.01" value={item.unitPrice}
                      onChange={e => setLine(i, 'unitPrice', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <div className="col-span-1 text-xs font-mono text-gray-500 text-right">${lineTotal(item).toFixed(2)}</div>
                    <button onClick={() => removeLine(i)} disabled={lineItems.length === 1}
                      className="col-span-1 text-red-400 hover:text-red-600 text-xs disabled:opacity-30">✕</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-xs text-right text-gray-500">
                <div>Subtotal: <span className="font-mono font-medium">{currencySymbol(form.currency ?? 'USD')}{subtotal.toFixed(2)}</span></div>
                {taxRate > 0 && <div>Tax ({taxRate}%): <span className="font-mono">{currencySymbol(form.currency ?? 'USD')}{(subtotal * taxRate / 100).toFixed(2)}</span></div>}
                <div className="text-sm font-semibold text-gray-800">Total: <span className="font-mono">{currencySymbol(form.currency ?? 'USD')}{total.toFixed(2)}</span></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} rows={2} className={inp} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setClientModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleClientCreate}
              disabled={saving || !form.invoiceDate || !form.dueDate || lineItems.every(l => !l.description || !l.unitPrice)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Invoice'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <Modal title="Reject Invoice" onClose={() => setRejectModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Rejecting <span className="font-mono font-medium">#{String(rejectModal.id).padStart(4, '0')}</span>
              {rejectModal.vendor && ` from ${rejectModal.vendor.name}`}.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rejection Reason *</label>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
                placeholder="Explain why this invoice is being rejected…"
                className={inp} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleReject} disabled={!rejectNote.trim()}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              Reject Invoice
            </button>
          </div>
        </Modal>
      )}

      {/* ── Request Revision Modal ── */}
      {revisionModal && (
        <Modal title="Request Revision" onClose={() => setRevisionModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Requesting a revision on <span className="font-mono font-medium">#{String(revisionModal.id).padStart(4, '0')}</span>.
              A new draft (v{(revisionModal.version ?? 1) + 1}) will be created for the vendor to edit and resubmit.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Revision Instructions *</label>
              <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)} rows={3}
                placeholder="Describe what needs to be changed…"
                className={inp} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setRevisionModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleRevision} disabled={!revisionNote.trim()}
              className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
              Request Revision
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
