import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../store/authContext'
import { invoicesApi, type Invoice, type InvoiceStatus, type InvoiceType } from '../../api/invoices'
import { clientsApi, type Client, vendorsApi, type Vendor } from '../../api/organizations'
import { projectsApi, type Project } from '../../api/projects'
import Modal from '../../components/Modal'

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  SENT: 'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-teal-50 text-teal-700',
  REJECTED: 'bg-red-50 text-red-600',
  PAID: 'bg-green-50 text-green-700',
  OVERDUE: 'bg-orange-50 text-orange-700',
}

type LineItemForm = { description: string; quantity: string; unitPrice: string }
const EMPTY_LINE: LineItemForm = { description: '', quantity: '1', unitPrice: '' }

export default function InvoicesPage() {
  const { t } = useTranslation()
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()

  const isVendorRole = hasRole('CONTRACTOR') || hasRole('VENDOR_CONTACT')
  const [tab, setTab] = useState<InvoiceType>(isVendorRole ? 'VENDOR' : 'CLIENT')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')

  // Create modal
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ ...EMPTY_LINE }])
  const [saving, setSaving] = useState(false)

  // Reject modal
  const [rejectModal, setRejectModal] = useState<Invoice | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const isAM = hasRole('ACCOUNT_MANAGER') || hasRole('ADMIN') || hasRole('SUPER_ADMIN')
  const isVendor = hasRole('CONTRACTOR') || hasRole('VENDOR_CONTACT')
  const isClient = hasRole('CLIENT')

  // Only show tabs relevant to the role
  const visibleTabs: InvoiceType[] = isVendor ? ['VENDOR'] : isClient ? ['CLIENT'] : ['CLIENT', 'VENDOR']

  const load = () =>
    invoicesApi.list({ invoiceType: tab, ...(statusFilter ? { status: statusFilter as InvoiceStatus } : {}) })
      .then(r => setInvoices(r.data))

  useEffect(() => {
    Promise.all([
      load(),
      clientsApi.list().then(r => setClients(r.data)),
      vendorsApi.list().then(r => setVendors(r.data)),
      projectsApi.list().then(r => setProjects(r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [tab, statusFilter])

  const setF = (k: string, v: unknown) => setForm((p: any) => ({ ...p, [k]: v }))
  const setLine = (i: number, k: keyof LineItemForm, v: string) =>
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  const addLine = () => setLineItems(prev => [...prev, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i))

  const lineTotal = (item: LineItemForm) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
  const subtotal = lineItems.reduce((s, item) => s + lineTotal(item), 0)
  const taxRate = parseFloat(form.taxRate) || 0
  const total = subtotal + subtotal * (taxRate / 100)

  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10)
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    setForm({ invoiceDate: today, dueDate: due, taxRate: '0', clientId: 0, vendorId: 0, projectId: 0 })
    setLineItems([{ ...EMPTY_LINE }])
    setModal(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const validLines = lineItems.filter(l => l.description && l.quantity && l.unitPrice)
      const payload: any = {
        invoiceType: tab,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        taxRate: parseFloat(form.taxRate) || 0,
        lineItems: validLines.map(l => ({
          description: l.description,
          quantity: parseFloat(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
        })),
      }
      if (tab === 'CLIENT' && form.clientId) payload.clientId = form.clientId
      if (tab === 'VENDOR' && form.vendorId) payload.vendorId = form.vendorId
      if (form.projectId) payload.projectId = form.projectId
      if (form.notes) payload.notes = form.notes
      await invoicesApi.create(payload)
      await load()
      setModal(false)
    } finally { setSaving(false) }
  }

  const handleAction = async (inv: Invoice, action: 'submit' | 'approve') => {
    if (action === 'submit') await invoicesApi.submit(inv.id)
    else await invoicesApi.approve(inv.id)
    load()
  }

  const openReject = (inv: Invoice) => { setRejectNote(''); setRejectModal(inv) }
  const handleReject = async () => {
    if (!rejectModal) return
    await invoicesApi.reject(rejectModal.id, rejectNote)
    setRejectModal(null)
    load()
  }

  const canCreate = tab === 'CLIENT' ? (isAM) : (isVendor || isAM)

  const allStatuses: InvoiceStatus[] = tab === 'CLIENT'
    ? ['DRAFT', 'SENT', 'APPROVED', 'PAID', 'OVERDUE']
    : ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID']

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('invoices.title')}</h1>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as InvoiceStatus | '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t('invoices.allStatuses')}</option>
            {allStatuses.map(s => <option key={s} value={s}>{t(`invoices.status.${s}`, { defaultValue: s })}</option>)}
          </select>
          {canCreate && (
            <button onClick={openCreate} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
              + {tab === 'CLIENT' ? t('invoices.newClientInvoice') : t('invoices.newVendorInvoice')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs — only show tabs relevant to this role */}
      {visibleTabs.length > 1 && (
        <div className="flex border-b border-gray-200 mb-6">
          {visibleTabs.map(type => (
            <button key={type} onClick={() => setTab(type)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === type
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {type === 'CLIENT' ? `🧾 ${t('invoices.clientInvoices')}` : `🔧 ${t('invoices.vendorInvoices')}`}
            </button>
          ))}
        </div>
      )}
      {visibleTabs.length === 1 && <div className="mb-6" />}

      {loading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['#', tab === 'CLIENT' ? t('invoices.client') : t('invoices.vendor'), t('invoices.project'), t('invoices.invoiceDate'), t('invoices.dueDate'), t('invoices.total'), t('common.status'), ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
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
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">
                    ${parseFloat(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t(`invoices.status.${inv.status}`, { defaultValue: inv.status })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {/* Vendor can submit their own DRAFT invoices */}
                    {tab === 'VENDOR' && inv.status === 'DRAFT' && isVendor && (
                      <button onClick={() => handleAction(inv, 'submit')}
                        className="text-xs text-blue-600 hover:underline">{t('common.submit')}</button>
                    )}
                    {/* AM can approve SUBMITTED vendor invoices or SENT client invoices */}
                    {isAM && (
                      (tab === 'VENDOR' && inv.status === 'SUBMITTED') ||
                      (tab === 'CLIENT' && inv.status === 'SENT')
                    ) && (
                      <button onClick={() => handleAction(inv, 'approve')}
                        className="text-xs text-teal-600 hover:underline">{t('common.approve')}</button>
                    )}
                    {/* Client can approve SENT client invoices */}
                    {isClient && tab === 'CLIENT' && inv.status === 'SENT' && (
                      <button onClick={() => handleAction(inv, 'approve')}
                        className="text-xs text-teal-600 hover:underline">{t('common.approve')}</button>
                    )}
                    {/* AM can reject SUBMITTED vendor invoices */}
                    {isAM && tab === 'VENDOR' && inv.status === 'SUBMITTED' && (
                      <button onClick={() => openReject(inv)}
                        className="text-xs text-red-500 hover:underline">{t('common.reject')}</button>
                    )}
                    <button onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="text-xs text-gray-500 hover:underline">{t('common.view')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {!loading && invoices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {allStatuses.map(s => {
            const group = invoices.filter(i => i.status === s)
            if (group.length === 0) return null
            const tot = group.reduce((a, i) => a + parseFloat(i.total), 0)
            return (
              <div key={s} className={`px-3 py-1.5 rounded-lg border text-xs ${STATUS_COLORS[s]}`}>
                <span className="font-semibold">{t(`invoices.status.${s}`, { defaultValue: s })}</span>: {group.length} · ${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Invoice Modal */}
      {modal && (
        <Modal title={tab === 'CLIENT' ? t('invoices.newClientInvoice') : t('invoices.newVendorInvoice')} onClose={() => setModal(false)}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              {tab === 'CLIENT' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoices.client')} *</label>
                  <select value={form.clientId} onChange={e => setF('clientId', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={0}>— select —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoices.vendor')} *</label>
                  <select value={form.vendorId} onChange={e => setF('vendorId', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={0}>— select —</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoices.project')}</label>
                <select value={form.projectId} onChange={e => setF('projectId', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>— none —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoices.invoiceDate')} *</label>
                <input type="date" value={form.invoiceDate} onChange={e => setF('invoiceDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoices.dueDate')} *</label>
                <input type="date" value={form.dueDate} onChange={e => setF('dueDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoices.taxRate')}</label>
                <input type="number" min="0" max="100" step="0.1" value={form.taxRate}
                  onChange={e => setF('taxRate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">{t('invoices.lineItems')} *</label>
                <button onClick={addLine} className="text-xs text-blue-600 hover:underline">{t('invoices.addLine')}</button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" placeholder={t('invoices.description')} value={item.description}
                      onChange={e => setLine(i, 'description', e.target.value)}
                      className="col-span-6 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="number" placeholder={t('invoices.qty')} min="0" step="0.5" value={item.quantity}
                      onChange={e => setLine(i, 'quantity', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="number" placeholder={t('invoices.unitPrice')} min="0" step="0.01" value={item.unitPrice}
                      onChange={e => setLine(i, 'unitPrice', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <div className="col-span-1 text-xs font-mono text-gray-500 text-right">${lineTotal(item).toFixed(2)}</div>
                    <button onClick={() => removeLine(i)} disabled={lineItems.length === 1}
                      className="col-span-1 text-red-400 hover:text-red-600 text-xs disabled:opacity-30">✕</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-xs text-right text-gray-500">
                <div>{t('invoices.subtotal')}: <span className="font-mono font-medium">${subtotal.toFixed(2)}</span></div>
                {taxRate > 0 && <div>{t('invoices.tax')} ({taxRate}%): <span className="font-mono">${(subtotal * taxRate / 100).toFixed(2)}</span></div>}
                <div className="text-sm font-semibold text-gray-800">{t('invoices.total')}: <span className="font-mono">${total.toFixed(2)}</span></div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoices.notes')}</label>
              <textarea value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleCreate}
              disabled={saving || !form.invoiceDate || !form.dueDate || lineItems.every(l => !l.description || !l.unitPrice)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? t('common.loading') : t('invoices.createInvoice')}
            </button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal title={t('invoices.rejectInvoice')} onClose={() => setRejectModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {t('invoices.rejecting')} <span className="font-mono font-medium">#{String(rejectModal.id).padStart(4, '0')}</span>
              {rejectModal.vendor && ` ${t('invoices.from')} ${rejectModal.vendor.name}`}.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('invoices.rejectionReason')} *</label>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
                placeholder={t('invoices.rejectionPlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleReject} disabled={!rejectNote.trim()}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {t('invoices.rejectInvoice')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
