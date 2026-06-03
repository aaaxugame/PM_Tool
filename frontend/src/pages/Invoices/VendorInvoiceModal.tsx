import { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import { invoicesApi, type InvoiceDetail, type InvoiceLineItem, type LineItemType } from '../../api/invoices'
import { projectsApi, type Project } from '../../api/projects'

// ── Types ────────────────────────────────────────────────────────────────────

interface LineRow {
  id?:          number          // set when editing existing line
  description:  string
  quantity:     string
  unitPrice:    string
  lineItemType: LineItemType
  receiptNote:  string
  timeEntryId?: number | null   // if set → qty + unitPrice are locked
  milestoneId?: number | null
  locked:       boolean         // qty + unitPrice read-only
}

const EXPENSE_ROW = (): LineRow => ({
  description: '', quantity: '1', unitPrice: '', lineItemType: 'EXPENSE',
  receiptNote: '', locked: false,
})

const TYPE_LABELS: Record<LineItemType, string> = {
  TIME_AND_MATERIALS: 'T&M',
  FIXED:              'Fixed',
  EXPENSE:            'Expense',
  ADJUSTMENT:         'Adjustment',
}

const TYPE_COLORS: Record<LineItemType, string> = {
  TIME_AND_MATERIALS: 'bg-blue-50 text-blue-600',
  FIXED:              'bg-purple-50 text-purple-600',
  EXPENSE:            'bg-amber-50 text-amber-700',
  ADJUSTMENT:         'bg-gray-100 text-gray-600',
}

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Helpers ──────────────────────────────────────────────────────────────────

function lineItemToRow(li: InvoiceLineItem): LineRow {
  const locked = li.lineItemType === 'TIME_AND_MATERIALS' && li.timeEntryId != null
  return {
    id:          li.id,
    description: li.description,
    quantity:    parseFloat(li.quantity).toString(),
    unitPrice:   parseFloat(li.unitPrice).toString(),
    lineItemType: li.lineItemType,
    receiptNote: li.receiptNote ?? '',
    timeEntryId: li.timeEntryId,
    milestoneId: li.milestoneId,
    locked,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VendorInvoiceModal({
  vendorId,
  existingInvoice,
  onClose,
  onSaved,
}: {
  vendorId:         number
  existingInvoice?: InvoiceDetail   // set when editing a DRAFT
  onClose:          () => void
  onSaved:          (inv: InvoiceDetail) => void
}) {
  const isEdit = !!existingInvoice

  // ── Mode ─────────────────────────────────────────────────────────────────
  const [mode, setMode]               = useState<'choose' | 'auto' | 'manual'>(isEdit ? 'manual' : 'choose')
  const [generating, setGenerating]   = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  // ── Project ───────────────────────────────────────────────────────────────
  const [projects, setProjects]       = useState<Project[]>([])
  const [projectId, setProjectId]     = useState<number>(existingInvoice?.projectId ?? 0)

  // ── Form fields ───────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const due30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const [invoiceDate, setInvoiceDate] = useState(existingInvoice?.invoiceDate.slice(0, 10) ?? today)
  const [dueDate, setDueDate]         = useState(existingInvoice?.dueDate.slice(0, 10) ?? due30)
  const [taxRate, setTaxRate]         = useState(existingInvoice?.taxRate ? parseFloat(existingInvoice.taxRate).toString() : '0')
  const [notes, setNotes]             = useState(existingInvoice?.notes ?? '')

  // ── Line items ────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<LineRow[]>(
    existingInvoice ? existingInvoice.lineItems.map(lineItemToRow) : [],
  )

  useEffect(() => {
    projectsApi.listVendor(false).then(r => setProjects(r.data))
  }, [])

  // ── Derived totals ────────────────────────────────────────────────────────
  const subtotal = rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0), 0)
  const tax      = subtotal * ((parseFloat(taxRate) || 0) / 100)
  const total    = subtotal + tax

  // ── Handlers ─────────────────────────────────────────────────────────────

  const setRow = (i: number, patch: Partial<LineRow>) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const addExpense  = () => setRows(prev => [...prev, EXPENSE_ROW()])
  const removeRow   = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))

  const handleAutoGenerate = async () => {
    if (!projectId) { setError('Select a project first'); return }
    setError('')
    setGenerating(true)
    try {
      const r = await invoicesApi.autoGenerate(projectId)
      onSaved(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Auto-generate failed — ensure timesheets are approved or milestones are completed.')
    } finally { setGenerating(false) }
  }

  const handleSave = async (submitAfter = false) => {
    if (!invoiceDate || !dueDate) { setError('Invoice and due dates are required'); return }
    const validRows = rows.filter(r => r.description && r.unitPrice)
    if (validRows.length === 0) { setError('Add at least one line item'); return }
    setError('')
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        invoiceType: 'VENDOR',
        invoiceDate,
        dueDate,
        taxRate:   parseFloat(taxRate) || 0,
        notes:     notes || undefined,
        vendorId,
        projectId: projectId || undefined,
        lineItems: validRows.map(r => ({
          description:  r.description,
          quantity:     parseFloat(r.quantity) || 1,
          unitPrice:    parseFloat(r.unitPrice),
          lineItemType: r.lineItemType,
          receiptNote:  r.receiptNote || undefined,
          timeEntryId:  r.timeEntryId ?? undefined,
          milestoneId:  r.milestoneId ?? undefined,
        })),
      }
      if (isEdit && existingInvoice.parentInvoiceId) {
        payload.parentInvoiceId = existingInvoice.parentInvoiceId
      }

      let result: InvoiceDetail
      if (isEdit) {
        // For editing: delete old line items and recreate via update
        // Simpler: just delete and recreate the invoice (it's still DRAFT)
        await invoicesApi.remove(existingInvoice.id)
        payload.parentInvoiceId = existingInvoice.parentInvoiceId ?? undefined
        payload.version         = existingInvoice.version
        const r = await invoicesApi.create(payload)
        result = r.data
      } else {
        const r = await invoicesApi.create(payload)
        result = r.data
      }

      if (submitAfter) {
        const sr = await invoicesApi.submit(result.id)
        result = sr.data
      }
      onSaved(result)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save invoice')
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  // ── Mode: choose ──────────────────────────────────────────────────────────
  if (mode === 'choose') return (
    <Modal title="New Vendor Invoice" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-6">How would you like to create this invoice?</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setMode('auto')}
          className="flex flex-col items-center gap-3 border-2 border-gray-200 hover:border-blue-400 rounded-xl p-5 transition-colors text-left group"
        >
          <span className="text-3xl">⚡</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">Auto-generate</p>
            <p className="text-xs text-gray-500 mt-0.5">Pre-fill from approved hours & completed milestones</p>
          </div>
        </button>
        <button
          onClick={() => setMode('manual')}
          className="flex flex-col items-center gap-3 border-2 border-gray-200 hover:border-blue-400 rounded-xl p-5 transition-colors text-left group"
        >
          <span className="text-3xl">✏️</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">Build manually</p>
            <p className="text-xs text-gray-500 mt-0.5">Enter line items yourself</p>
          </div>
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
      </div>
    </Modal>
  )

  // ── Mode: auto-generate ───────────────────────────────────────────────────
  if (mode === 'auto') return (
    <Modal title="Auto-generate Invoice Draft" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">
        Select a project. The system will create a draft invoice pre-filled with approved hours
        (T&M) or completed milestones based on the project's billing model.
      </p>
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Project *</label>
        <select value={projectId} onChange={e => setProjectId(Number(e.target.value))} className={inp}>
          <option value={0}>— select project —</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.billingMethod.replace(/_/g, ' ')})</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <div className="flex justify-between items-center">
        <button onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleAutoGenerate}
            disabled={!projectId || generating}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating…</>
            ) : '⚡ Generate Draft'}
          </button>
        </div>
      </div>
    </Modal>
  )

  // ── Mode: manual (create or edit) ─────────────────────────────────────────
  return (
    <Modal title={isEdit ? `Edit Invoice Draft (v${existingInvoice.version})` : 'New Vendor Invoice'} onClose={onClose}>
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">

        {/* Revision banner */}
        {isEdit && existingInvoice.revisionNote && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
            <span className="font-semibold">Revision requested:</span> {existingInvoice.revisionNote}
          </div>
        )}

        {/* Project + Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
            <select value={projectId} onChange={e => setProjectId(Number(e.target.value))} className={inp} disabled={isEdit}>
              <option value={0}>— none —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
            <input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date *</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inp} />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Line Items</label>
            <button onClick={addExpense} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 flex items-center gap-1">
              + Add Expense
            </button>
          </div>

          {rows.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
              No line items yet. Click "+ Add Expense" to add one.
            </p>
          )}

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className={`rounded-lg border p-3 space-y-2 ${row.locked ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[row.lineItemType]}`}>
                    {row.locked ? '🔒 ' : ''}{TYPE_LABELS[row.lineItemType]}
                  </span>
                  <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-xs ml-auto">✕ Remove</button>
                </div>

                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <label className="block text-xs text-gray-500 mb-0.5">Description</label>
                    <input
                      type="text"
                      value={row.description}
                      onChange={e => setRow(i, { description: e.target.value })}
                      placeholder="Description"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-0.5">Qty / Hrs</label>
                    <input
                      type="number" min="0" step="0.25"
                      value={row.quantity}
                      onChange={e => !row.locked && setRow(i, { quantity: e.target.value })}
                      disabled={row.locked}
                      className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${row.locked ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-0.5">Rate / Price</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={row.unitPrice}
                      onChange={e => !row.locked && setRow(i, { unitPrice: e.target.value })}
                      disabled={row.locked}
                      className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${row.locked ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <label className="block text-xs text-gray-500 mb-0.5">Amount</label>
                    <p className="text-sm font-mono font-medium text-gray-800 py-1.5">
                      {fmt((parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0))}
                    </p>
                  </div>
                </div>

                {row.lineItemType === 'EXPENSE' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Receipt / Note (optional)</label>
                    <input
                      type="text"
                      value={row.receiptNote}
                      onChange={e => setRow(i, { receiptNote: e.target.value })}
                      placeholder="Receipt #, reference, or note"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          {rows.length > 0 && (
            <div className="mt-3 space-y-1 text-xs text-right text-gray-500 border-t border-gray-100 pt-3">
              <div>Subtotal: <span className="font-mono font-medium text-gray-800">{fmt(subtotal)}</span></div>
              {(parseFloat(taxRate) || 0) > 0 && (
                <div>Tax ({taxRate}%): <span className="font-mono">{fmt(tax)}</span></div>
              )}
              <div className="text-sm font-semibold text-gray-900">
                Total: <span className="font-mono">{fmt(total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inp} />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

      <div className="flex justify-between items-center mt-5">
        {!isEdit && (
          <button onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        )}
        {isEdit && <div />}
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || rows.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & Submit'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
