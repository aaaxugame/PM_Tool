import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../store/authContext'
import { invoicesApi, type InvoiceDetail, type InvoiceStatus } from '../../api/invoices'
import { clientsApi, type Client } from '../../api/organizations'
import { projectsApi, type Project } from '../../api/projects'
import { CURRENCIES, fmtMoney, currencySymbol } from '../../utils/currency'
import Modal from '../../components/Modal'
import VendorInvoiceModal from './VendorInvoiceModal'
import DocumentManager from '../../components/DocumentManager'
import InvoicePDF from '../../components/InvoicePDF'
import { pdf } from '@react-pdf/renderer'

type LineItemForm = { description: string; quantity: string; unitPrice: string }
const EMPTY_LINE: LineItemForm = { description: '', quantity: '1', unitPrice: '' }

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

const LINE_TYPE_COLORS: Record<string, string> = {
  TIME_AND_MATERIALS: 'bg-blue-50 text-blue-600',
  FIXED:              'bg-purple-50 text-purple-600',
  EXPENSE:            'bg-amber-50 text-amber-700',
  ADJUSTMENT:         'bg-gray-100 text-gray-600',
}

const LINE_TYPE_LABELS: Record<string, string> = {
  TIME_AND_MATERIALS: 'T&M',
  FIXED:              'Fixed',
  EXPENSE:            'Expense',
  ADJUSTMENT:         'Adj',
}

const STATUS_NEXT: Partial<Record<InvoiceStatus, InvoiceStatus>> = {
  DRAFT: 'SENT', SENT: 'PAID', OVERDUE: 'PAID', APPROVED: 'PAID',
}

const PAYMENT_METHODS = ['Bank Transfer', 'Credit Card', 'Cash', 'Check', 'PayPal', 'Other']
const PAYMENT_EMPTY   = { amount: '', paymentDate: '', paymentMethod: 'Bank Transfer', reference: '' }

export default function InvoiceDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { t }        = useTranslation()
  const { hasRole, user } = useAuth()
  const invoiceId    = Number(id)

  const isVendor   = hasRole('CONTRACTOR') || hasRole('VENDOR_CONTACT')
  const isAM       = hasRole('ACCOUNT_MANAGER') || hasRole('ADMIN') || hasRole('SUPER_ADMIN')
  const isPM       = hasRole('PROJECT_MANAGER')
  const isClient   = hasRole('CLIENT')
  const canReview  = isAM || isPM
  const vendorId   = (user as any)?.vendor?.id ?? 0

  const [invoice, setInvoice]   = useState<InvoiceDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editClientModal, setEditClientModal] = useState(false)
  const [editForm, setEditForm]   = useState<any>({})
  const [editLines, setEditLines] = useState<LineItemForm[]>([{ ...EMPTY_LINE }])
  const [clients, setClients]     = useState<Client[]>([])
  const [projects, setProjects]   = useState<Project[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [payModal, setPayModal]   = useState(false)
  const [payForm, setPayForm]     = useState<typeof PAYMENT_EMPTY>(PAYMENT_EMPTY)
  const [paySaving, setPaySaving] = useState(false)
  const [revisionModal, setRevisionModal] = useState(false)
  const [revisionNote, setRevisionNote]   = useState('')
  const [rejectModal, setRejectModal]     = useState(false)
  const [rejectNote, setRejectNote]       = useState('')

  const load = () =>
    invoicesApi.get(invoiceId).then(r => setInvoice(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [invoiceId])

  const openEditClient = async () => {
    const [cl, pr] = await Promise.all([clientsApi.list(), projectsApi.list()])
    setClients(cl.data); setProjects(pr.data)
    if (invoice) {
      setEditForm({
        invoiceDate: invoice.invoiceDate.slice(0, 10),
        dueDate:     invoice.dueDate.slice(0, 10),
        taxRate:     String(parseFloat(invoice.taxRate)),
        notes:       invoice.notes ?? '',
        clientId:    invoice.clientId ?? 0,
        projectId:   invoice.projectId ?? 0,
        currency:    invoice.currency ?? 'USD',
      })
      setEditLines(invoice.lineItems.length > 0
        ? invoice.lineItems.map(li => ({ description: li.description, quantity: String(parseFloat(li.quantity)), unitPrice: String(parseFloat(li.unitPrice)) }))
        : [{ ...EMPTY_LINE }]
      )
    }
    setEditClientModal(true)
  }

  const handleClientUpdate = async () => {
    setEditSaving(true)
    try {
      const validLines = editLines.filter(l => l.description && l.quantity && l.unitPrice)
      const payload: any = {
        invoiceDate: editForm.invoiceDate,
        dueDate:     editForm.dueDate,
        taxRate:     parseFloat(editForm.taxRate) || 0,
        currency:    editForm.currency ?? 'USD',
        notes:       editForm.notes || undefined,
        lineItems:   validLines.map(l => ({ description: l.description, quantity: parseFloat(l.quantity), unitPrice: parseFloat(l.unitPrice) })),
      }
      if (editForm.clientId)  payload.clientId  = editForm.clientId
      if (editForm.projectId) payload.projectId = editForm.projectId
      await invoicesApi.update(invoiceId, payload)
      setEditClientModal(false)
      load()
    } finally { setEditSaving(false) }
  }

  const setEF    = (k: string, v: unknown) => setEditForm((p: any) => ({ ...p, [k]: v }))
  const setELine = (i: number, k: keyof LineItemForm, v: string) =>
    setEditLines(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  const addELine    = () => setEditLines(prev => [...prev, { ...EMPTY_LINE }])
  const removeELine = (i: number) => setEditLines(prev => prev.filter((_, idx) => idx !== i))
  const eLineTotal  = (item: LineItemForm) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
  const eSubtotal   = editLines.reduce((s, item) => s + eLineTotal(item), 0)
  const eTaxRate    = parseFloat(editForm.taxRate) || 0
  const eTotal      = eSubtotal + eSubtotal * (eTaxRate / 100)

  const setPay = (k: string, v: string) => setPayForm(p => ({ ...p, [k]: v }))

  const handleStatusAdvance = async (status: InvoiceStatus) => {
    await invoicesApi.update(invoiceId, { status })
    load()
  }

  const handleSubmit = async () => { await invoicesApi.submit(invoiceId); load() }
  const handleApprove = async () => { await invoicesApi.approve(invoiceId); load() }

  const handlePaymentSave = async () => {
    setPaySaving(true)
    try {
      await invoicesApi.addPayment(invoiceId, {
        amount:        parseFloat(payForm.amount),
        paymentDate:   payForm.paymentDate,
        paymentMethod: payForm.paymentMethod,
        ...(payForm.reference ? { reference: payForm.reference } : {}),
      })
      setPayModal(false); load()
    } finally { setPaySaving(false) }
  }

  const handleRemovePayment = async (paymentId: number) => {
    if (!confirm('Remove this payment?')) return
    await invoicesApi.removePayment(paymentId); load()
  }

  const handleRevision = async () => {
    await invoicesApi.requestRevision(invoiceId, revisionNote)
    setRevisionModal(false); load()
  }

  const handleReject = async () => {
    await invoicesApi.reject(invoiceId, rejectNote)
    setRejectModal(false); load()
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    setPdfLoading(true)
    try {
      const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `invoice-${String(invoice.id).padStart(4, '0')}-v${invoice.version}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400">{t('common.loading')}</p>
  if (!invoice) return <p className="text-sm text-red-500">Invoice not found.</p>

  const totalPaid  = invoice.payments.reduce((s, p) => s + parseFloat(p.amount), 0)
  const balance    = parseFloat(invoice.total) - totalPaid
  const nextStatus = STATUS_NEXT[invoice.status]
  const isVendorInv = invoice.invoiceType === 'VENDOR'
  const isDraft     = invoice.status === 'DRAFT'
  const isSubmitted = invoice.status === 'SUBMITTED'
  const isRevision  = invoice.status === 'REVISION_REQUESTED'

  const openPayModal = () => {
    setPayForm({ ...PAYMENT_EMPTY, paymentDate: new Date().toISOString().slice(0, 10), amount: balance > 0 ? balance.toFixed(2) : '' })
    setPayModal(true)
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/invoices')} className="text-sm text-blue-600 hover:underline mb-1 block">
            ← Invoices
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-800">
              Invoice #{String(invoice.id).padStart(4, '0')}
            </h1>
            {invoice.version > 1 && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">v{invoice.version}</span>
            )}
            {invoice.parentInvoice && (
              <button
                onClick={() => navigate(`/invoices/${invoice.parentInvoiceId}`)}
                className="text-xs text-blue-500 hover:underline"
              >
                ← v{invoice.parentInvoice.version} (original)
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {invoice.client?.name ?? invoice.vendor?.name}
            {invoice.project ? ` · ${invoice.project.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Client invoice: edit DRAFT (PM/AM) */}
          {!isVendorInv && isDraft && (isPM || isAM) && (
            <button onClick={openEditClient}
              className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-200">
              Edit Draft
            </button>
          )}
          {/* Vendor: edit/submit DRAFT */}
          {isVendorInv && isDraft && isVendor && (
            <button onClick={() => setEditModal(true)}
              className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-200">
              Edit Draft
            </button>
          )}
          {isVendorInv && isDraft && isVendor && (
            <button onClick={handleSubmit}
              className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700">
              Submit for Approval
            </button>
          )}
          {/* Vendor: revise */}
          {isVendorInv && isRevision && isVendor && (
            <button onClick={() => setEditModal(true)}
              className="bg-amber-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-amber-600">
              Revise & Resubmit
            </button>
          )}
          {/* PM/AM: approve submitted */}
          {isVendorInv && isSubmitted && canReview && (
            <button onClick={handleApprove}
              className="bg-teal-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-teal-700">
              Approve
            </button>
          )}
          {/* PM/AM: request revision */}
          {isVendorInv && isSubmitted && canReview && (
            <button onClick={() => { setRevisionNote(''); setRevisionModal(true) }}
              className="bg-amber-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-amber-600">
              Request Revision
            </button>
          )}
          {/* AM: reject */}
          {isVendorInv && isSubmitted && isAM && (
            <button onClick={() => { setRejectNote(''); setRejectModal(true) }}
              className="bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-700">
              Reject
            </button>
          )}
          {/* Client: approve SENT invoice */}
          {!isVendorInv && invoice.status === 'SENT' && isClient && (
            <button onClick={handleApprove}
              className="bg-teal-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-teal-700">
              Approve Invoice
            </button>
          )}
          {/* Client invoice advance (PM/AM) */}
          {!isVendorInv && nextStatus && (isAM || isPM) && (
            <button onClick={() => handleStatusAdvance(nextStatus)}
              className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700">
              Mark {nextStatus}
            </button>
          )}
          {/* Record payment */}
          {invoice.status !== 'DRAFT' && invoice.status !== 'PAID' && (isAM || isPM) && (
            <button onClick={openPayModal}
              className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700">
              Record Payment
            </button>
          )}
          {/* Download PDF — available to all roles */}
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {pdfLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17a7 7 0 0114 0" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 17H3a9 9 0 010-18h1.5" />
                </svg>
                Download PDF
              </>
            )}
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[invoice.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {invoice.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Revision / rejection banners */}
      {isRevision && invoice.rejectionNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Revision requested:</span> {invoice.rejectionNote}
        </div>
      )}
      {invoice.status === 'REJECTED' && invoice.rejectionNote && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <span className="font-semibold">Rejected:</span> {invoice.rejectionNote}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Invoice Date', value: invoice.invoiceDate.slice(0, 10) },
          { label: 'Due Date',     value: invoice.dueDate.slice(0, 10) },
          { label: 'Tax Rate',     value: `${parseFloat(invoice.taxRate).toFixed(1)}%` },
          { label: 'Currency',     value: invoice.currency ?? 'USD' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">{card.label}</p>
            <p className="text-sm font-medium text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Subtotal</p>
          <p className="text-base font-mono font-medium text-gray-800">{fmtMoney(invoice.subtotal, invoice.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Tax</p>
          <p className="text-base font-mono font-medium text-gray-800">{fmtMoney(invoice.taxAmount, invoice.currency)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 px-4 py-3">
          <p className="text-xs text-blue-600 mb-0.5">Total</p>
          <p className="text-base font-mono font-semibold text-blue-800">{fmtMoney(invoice.total, invoice.currency)}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${balance <= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`text-xs mb-0.5 ${balance <= 0 ? 'text-green-600' : 'text-orange-600'}`}>Balance Due</p>
          <p className={`text-base font-mono font-semibold ${balance <= 0 ? 'text-green-800' : 'text-orange-800'}`}>
            {fmtMoney(Math.max(0, balance), invoice.currency)}
          </p>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Line Items ({invoice.lineItems.length})</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Type', 'Description', 'Qty', 'Unit Price', 'Amount', 'Note'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.lineItems.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No line items</td></tr>
              ) : invoice.lineItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LINE_TYPE_COLORS[item.lineItemType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {LINE_TYPE_LABELS[item.lineItemType] ?? item.lineItemType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {item.description}
                    {item.timeEntry && (
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {new Date(item.timeEntry.date).toLocaleDateString()} · {(item.timeEntry.durationMinutes / 60).toFixed(2)}h
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{parseFloat(item.quantity)}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{fmtMoney(item.unitPrice, invoice.currency)}</td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">{fmtMoney(item.amount, invoice.currency)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{item.receiptNote ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Attachments</h2>
        <DocumentManager
          filter={{ invoiceId }}
          readOnly={!isDraft && !isRevision}
        />
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Payments */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-semibold text-gray-700">Payments ({invoice.payments.length})</h2>
          {invoice.status !== 'DRAFT' && invoice.status !== 'PAID' && balance > 0 && (isAM || isPM) && (
            <button onClick={openPayModal} className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700">
              + Record Payment
            </button>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Date', 'Method', 'Reference', 'Amount', 'Recorded By', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No payments recorded</td></tr>
              ) : invoice.payments.map(pay => (
                <tr key={pay.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{pay.paymentDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-700">{pay.paymentMethod}</td>
                  <td className="px-4 py-3 text-gray-500">{pay.reference ?? '—'}</td>
                  <td className="px-4 py-3 font-mono font-medium text-green-700">{fmtMoney(pay.amount, invoice.currency)}</td>
                  <td className="px-4 py-3 text-gray-500">{pay.recordedBy.name}</td>
                  <td className="px-4 py-3 text-right">
                    {(isAM || isPM) && (
                      <button onClick={() => handleRemovePayment(pay.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Client Invoice Modal */}
      {editClientModal && (
        <Modal title="Edit Invoice" onClose={() => setEditClientModal(false)}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
                <select value={editForm.clientId} onChange={e => setEF('clientId', Number(e.target.value))} className={inp}>
                  <option value={0}>— select —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                <select value={editForm.projectId} onChange={e => setEF('projectId', Number(e.target.value))} className={inp}>
                  <option value={0}>— none —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date *</label>
                <input type="date" value={editForm.invoiceDate} onChange={e => setEF('invoiceDate', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                <input type="date" value={editForm.dueDate} onChange={e => setEF('dueDate', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={editForm.taxRate} onChange={e => setEF('taxRate', e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-600">Line Items *</label>
                <button onClick={addELine} className="text-xs text-blue-600 hover:underline">+ Add Line</button>
              </div>
              <div className="space-y-2">
                {editLines.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" placeholder="Description" value={item.description}
                      onChange={e => setELine(i, 'description', e.target.value)}
                      className="col-span-6 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="number" placeholder="Qty" min="0" step="0.5" value={item.quantity}
                      onChange={e => setELine(i, 'quantity', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input type="number" placeholder="Price" min="0" step="0.01" value={item.unitPrice}
                      onChange={e => setELine(i, 'unitPrice', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <div className="col-span-1 text-xs font-mono text-gray-500 text-right">${eLineTotal(item).toFixed(2)}</div>
                    <button onClick={() => removeELine(i)} disabled={editLines.length === 1}
                      className="col-span-1 text-red-400 hover:text-red-600 text-xs disabled:opacity-30">✕</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-xs text-right text-gray-500">
                <div>Subtotal: <span className="font-mono font-medium">{fmtMoney(eSubtotal, editForm.currency)}</span></div>
                {eTaxRate > 0 && <div>Tax ({eTaxRate}%): <span className="font-mono">{fmtMoney(eSubtotal * eTaxRate / 100, editForm.currency)}</span></div>}
                <div className="text-sm font-semibold text-gray-800">Total: <span className="font-mono">{fmtMoney(eTotal, editForm.currency)}</span></div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select value={editForm.currency ?? 'USD'} onChange={e => setEF('currency', e.target.value)} className={inp}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={editForm.notes ?? ''} onChange={e => setEF('notes', e.target.value)} rows={2} className={inp} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setEditClientModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleClientUpdate}
              disabled={editSaving || !editForm.invoiceDate || !editForm.dueDate || editLines.every(l => !l.description || !l.unitPrice)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Draft Modal */}
      {editModal && (
        <VendorInvoiceModal
          vendorId={vendorId}
          existingInvoice={invoice}
          onClose={() => setEditModal(false)}
          onSaved={(updated) => { setEditModal(false); navigate(`/invoices/${updated.id}`) }}
        />
      )}

      {/* Request Revision Modal */}
      {revisionModal && (
        <Modal title="Request Revision" onClose={() => setRevisionModal(false)}>
          <p className="text-sm text-gray-600 mb-3">
            A new draft (v{invoice.version + 1}) will be created for the vendor to edit and resubmit.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Revision Instructions *</label>
            <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)} rows={3}
              placeholder="Describe what needs to be changed…" className={inp} />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setRevisionModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleRevision} disabled={!revisionNote.trim()}
              className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
              Request Revision
            </button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal title="Reject Invoice" onClose={() => setRejectModal(false)}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rejection Reason *</label>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
              placeholder="Explain why this invoice is being rejected…" className={inp} />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setRejectModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleReject} disabled={!rejectNote.trim()}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              Reject
            </button>
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      {payModal && (
        <Modal title="Record Payment" onClose={() => setPayModal(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
                <input type="number" min="0.01" step="0.01" value={payForm.amount}
                  onChange={e => setPay('amount', e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date *</label>
                <input type="date" value={payForm.paymentDate} onChange={e => setPay('paymentDate', e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method *</label>
              <select value={payForm.paymentMethod} onChange={e => setPay('paymentMethod', e.target.value)} className={inp}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Transaction ID</label>
              <input type="text" value={payForm.reference} onChange={e => setPay('reference', e.target.value)} className={inp} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setPayModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handlePaymentSave} disabled={paySaving || !payForm.amount || !payForm.paymentDate}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {paySaving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
