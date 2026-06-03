import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../store/authContext'
import { invoicesApi, type InvoiceDetail, type InvoiceStatus } from '../../api/invoices'
import Modal from '../../components/Modal'
import VendorInvoiceModal from './VendorInvoiceModal'
import DocumentManager from '../../components/DocumentManager'

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
  const canReview  = isAM || isPM
  const vendorId   = (user as any)?.vendor?.id ?? 0

  const [invoice, setInvoice]   = useState<InvoiceDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editModal, setEditModal] = useState(false)
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
          {/* Client invoice advance */}
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
          { label: 'Type',         value: invoice.invoiceType },
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
          <p className="text-base font-mono font-medium text-gray-800">${parseFloat(invoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Tax</p>
          <p className="text-base font-mono font-medium text-gray-800">${parseFloat(invoice.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 px-4 py-3">
          <p className="text-xs text-blue-600 mb-0.5">Total</p>
          <p className="text-base font-mono font-semibold text-blue-800">${parseFloat(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${balance <= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`text-xs mb-0.5 ${balance <= 0 ? 'text-green-600' : 'text-orange-600'}`}>Balance Due</p>
          <p className={`text-base font-mono font-semibold ${balance <= 0 ? 'text-green-800' : 'text-orange-800'}`}>
            ${Math.max(0, balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                  <td className="px-4 py-3 text-gray-500 font-mono">${parseFloat(item.unitPrice).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">${parseFloat(item.amount).toFixed(2)}</td>
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
                  <td className="px-4 py-3 font-mono font-medium text-green-700">${parseFloat(pay.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
