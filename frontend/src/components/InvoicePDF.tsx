import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { InvoiceDetail } from '../api/invoices'

// ── Styles ────────────────────────────────────────────────────────────────────

const c = {
  blue:      '#2563EB',
  blueLight: '#EFF6FF',
  blueMid:   '#BFDBFE',
  gray50:    '#F9FAFB',
  gray100:   '#F3F4F6',
  gray200:   '#E5E7EB',
  gray400:   '#9CA3AF',
  gray500:   '#6B7280',
  gray700:   '#374151',
  gray800:   '#1F2937',
  gray900:   '#111827',
  green:     '#15803D',
  greenBg:   '#F0FDF4',
  orange:    '#C2410C',
  orangeBg:  '#FFF7ED',
  red:       '#DC2626',
  amber:     '#B45309',
  teal:      '#0F766E',
  tealBg:    '#F0FDFA',
  white:     '#FFFFFF',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT:              c.gray400,
  SUBMITTED:          c.blue,
  SENT:               c.amber,
  APPROVED:           c.teal,
  REJECTED:           c.red,
  REVISION_REQUESTED: c.amber,
  PAID:               c.green,
  OVERDUE:            c.orange,
}

const LINE_TYPE_COLOR: Record<string, { text: string; bg: string }> = {
  TIME_AND_MATERIALS: { text: c.blue,  bg: c.blueLight },
  FIXED:              { text: '#6D28D9', bg: '#F5F3FF' },
  EXPENSE:            { text: c.amber, bg: '#FFFBEB' },
  ADJUSTMENT:         { text: c.gray500, bg: c.gray100 },
}

const LINE_TYPE_LABEL: Record<string, string> = {
  TIME_AND_MATERIALS: 'T&M',
  FIXED:              'Fixed',
  EXPENSE:            'Expense',
  ADJUSTMENT:         'Adj',
}

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, color: c.gray800, paddingHorizontal: 40, paddingVertical: 40, backgroundColor: c.white },

  // Watermark
  watermark:   { position: 'absolute', top: 270, left: 60, fontSize: 72, color: c.gray200, fontFamily: 'Helvetica-Bold', transform: 'rotate(-35deg)', opacity: 0.4 },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  brandBlock:  { flexDirection: 'column', gap: 2 },
  brandName:   { fontSize: 18, fontFamily: 'Helvetica-Bold', color: c.blue },
  brandSub:    { fontSize: 8, color: c.gray400 },
  invBlock:    { alignItems: 'flex-end', gap: 4 },
  invTitle:    { fontSize: 24, fontFamily: 'Helvetica-Bold', color: c.gray800 },
  invNum:      { fontSize: 11, color: c.gray500 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 2 },
  statusText:  { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Divider
  divider:     { borderBottomWidth: 1, borderBottomColor: c.gray200, marginBottom: 20 },

  // From / To row
  fromToRow:   { flexDirection: 'row', gap: 40, marginBottom: 20 },
  fromToBlock: { flex: 1 },
  label:       { fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  name:        { fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.gray900, marginBottom: 2 },
  detail:      { fontSize: 8.5, color: c.gray500, lineHeight: 1.4 },

  // Meta cards
  metaRow:     { flexDirection: 'row', gap: 10, marginBottom: 24 },
  metaCard:    { flex: 1, backgroundColor: c.gray50, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: c.gray200 },
  metaKey:     { fontSize: 7, color: c.gray400, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  metaVal:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: c.gray800 },

  // Line items
  tableHeader: { flexDirection: 'row', backgroundColor: c.gray100, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginBottom: 2 },
  tableRow:    { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.gray100 },
  tableRowAlt: { backgroundColor: c.gray50 },
  colType:     { width: 50 },
  colDesc:     { flex: 1 },
  colQty:      { width: 40, textAlign: 'right' },
  colPrice:    { width: 60, textAlign: 'right' },
  colAmt:      { width: 70, textAlign: 'right' },
  headerText:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
  cellText:    { fontSize: 8.5, color: c.gray700 },
  cellMono:    { fontSize: 8.5, fontFamily: 'Helvetica', color: c.gray700 },
  cellAmtBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: c.gray800 },
  typePill:    { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  typeText:    { fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
  subDesc:     { fontSize: 7, color: c.gray400, marginTop: 1 },

  // Totals
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalsBox:   { width: 220 },
  totalsRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.gray100 },
  totalsLabel: { fontSize: 8.5, color: c.gray500 },
  totalsVal:   { fontSize: 8.5, fontFamily: 'Helvetica', color: c.gray700 },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, backgroundColor: c.blueLight, paddingHorizontal: 8, borderRadius: 4, marginTop: 4 },
  totalFinalLbl: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.blue },
  totalFinalVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.blue },
  balanceRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 4, marginTop: 4 },

  // Notes
  notesSection: { marginTop: 20, padding: 12, backgroundColor: c.gray50, borderRadius: 6, borderWidth: 1, borderColor: c.gray200 },
  notesLabel:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.gray400, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  notesText:   { fontSize: 8.5, color: c.gray600 as any, lineHeight: 1.5 },

  // Payments
  paymentsSection: { marginTop: 16 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: c.gray700, marginBottom: 8 },

  // Footer
  footer:      { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.gray200, paddingTop: 8 },
  footerText:  { fontSize: 7, color: c.gray400 },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number | string) =>
  '$' + parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

// ── PDF Document ──────────────────────────────────────────────────────────────

export default function InvoicePDF({ invoice }: { invoice: InvoiceDetail }) {
  const totalPaid  = invoice.payments.reduce((s, p) => s + parseFloat(p.amount), 0)
  const balance    = parseFloat(invoice.total) - totalPaid
  const statusClr  = STATUS_COLOR[invoice.status] ?? c.gray500
  const isVendor   = invoice.invoiceType === 'VENDOR'

  const fromLabel  = isVendor ? 'FROM (VENDOR)' : 'FROM'
  const fromName   = isVendor ? (invoice.vendor?.name ?? '—') : 'PM Tool'
  const toLabel    = isVendor ? 'BILL TO' : 'BILL TO (CLIENT)'
  const toName     = isVendor ? 'PM Tool' : (invoice.client?.name ?? '—')

  return (
    <Document title={`Invoice #${String(invoice.id).padStart(4, '0')}`}>
      <Page size="A4" style={s.page}>

        {/* Status watermark for non-final statuses */}
        {!['APPROVED', 'PAID'].includes(invoice.status) && (
          <Text style={s.watermark}>{invoice.status.replace(/_/g, ' ')}</Text>
        )}

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>PM Tool</Text>
            <Text style={s.brandSub}>Project Management Platform</Text>
          </View>
          <View style={s.invBlock}>
            <Text style={s.invTitle}>INVOICE</Text>
            <Text style={s.invNum}>#{String(invoice.id).padStart(4, '0')}</Text>
            {invoice.version > 1 && (
              <Text style={{ fontSize: 7, color: c.gray400 }}>Version {invoice.version}</Text>
            )}
            <View style={[s.statusBadge, { backgroundColor: statusClr + '20' }]}>
              <Text style={[s.statusText, { color: statusClr }]}>{invoice.status.replace(/_/g, ' ')}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── From / To ── */}
        <View style={s.fromToRow}>
          <View style={s.fromToBlock}>
            <Text style={s.label}>{fromLabel}</Text>
            <Text style={s.name}>{fromName}</Text>
          </View>
          <View style={s.fromToBlock}>
            <Text style={s.label}>{toLabel}</Text>
            <Text style={s.name}>{toName}</Text>
          </View>
          {invoice.project && (
            <View style={s.fromToBlock}>
              <Text style={s.label}>PROJECT</Text>
              <Text style={s.name}>{invoice.project.name}</Text>
              <Text style={s.detail}>{invoice.project.billingMethod?.replace(/_/g, ' ') ?? ''}</Text>
            </View>
          )}
        </View>

        {/* ── Meta cards ── */}
        <View style={s.metaRow}>
          <View style={s.metaCard}>
            <Text style={s.metaKey}>Invoice Date</Text>
            <Text style={s.metaVal}>{fmtDate(invoice.invoiceDate)}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaKey}>Due Date</Text>
            <Text style={s.metaVal}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaKey}>Invoice Type</Text>
            <Text style={s.metaVal}>{invoice.invoiceType}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaKey}>Tax Rate</Text>
            <Text style={s.metaVal}>{parseFloat(invoice.taxRate).toFixed(1)}%</Text>
          </View>
        </View>

        {/* ── Line Items ── */}
        <View style={s.tableHeader}>
          <Text style={[s.headerText, s.colType]}>TYPE</Text>
          <Text style={[s.headerText, s.colDesc]}>DESCRIPTION</Text>
          <Text style={[s.headerText, s.colQty]}>QTY</Text>
          <Text style={[s.headerText, s.colPrice]}>UNIT PRICE</Text>
          <Text style={[s.headerText, s.colAmt]}>AMOUNT</Text>
        </View>

        {invoice.lineItems.map((item, i) => {
          const typeColors = LINE_TYPE_COLOR[item.lineItemType] ?? { text: c.gray500, bg: c.gray100 }
          return (
            <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <View style={[s.colType, { justifyContent: 'center' }]}>
                <View style={[s.typePill, { backgroundColor: typeColors.bg }]}>
                  <Text style={[s.typeText, { color: typeColors.text }]}>
                    {LINE_TYPE_LABEL[item.lineItemType] ?? item.lineItemType}
                  </Text>
                </View>
              </View>
              <View style={s.colDesc}>
                <Text style={s.cellText}>{item.description}</Text>
                {item.timeEntry && (
                  <Text style={s.subDesc}>
                    {fmtDate(item.timeEntry.date)} · {(item.timeEntry.durationMinutes / 60).toFixed(2)}h
                  </Text>
                )}
                {item.receiptNote && (
                  <Text style={s.subDesc}>Note: {item.receiptNote}</Text>
                )}
              </View>
              <Text style={[s.cellMono, s.colQty]}>{parseFloat(item.quantity)}</Text>
              <Text style={[s.cellMono, s.colPrice]}>{fmt(item.unitPrice)}</Text>
              <Text style={[s.cellAmtBold, s.colAmt]}>{fmt(item.amount)}</Text>
            </View>
          )
        })}

        {/* ── Totals ── */}
        <View style={s.totalsSection}>
          <View style={s.totalsBox}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsVal}>{fmt(invoice.subtotal)}</Text>
            </View>
            {parseFloat(invoice.taxAmount) > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Tax ({parseFloat(invoice.taxRate).toFixed(1)}%)</Text>
                <Text style={s.totalsVal}>{fmt(invoice.taxAmount)}</Text>
              </View>
            )}
            <View style={s.totalFinalRow}>
              <Text style={s.totalFinalLbl}>TOTAL</Text>
              <Text style={s.totalFinalVal}>{fmt(invoice.total)}</Text>
            </View>
            {totalPaid > 0 && (
              <View style={[s.balanceRow, { backgroundColor: '#F0FDF4' }]}>
                <Text style={{ fontSize: 8.5, color: c.green }}>Paid</Text>
                <Text style={{ fontSize: 8.5, color: c.green, fontFamily: 'Helvetica-Bold' }}>{fmt(totalPaid)}</Text>
              </View>
            )}
            <View style={[s.balanceRow, { backgroundColor: balance <= 0 ? '#F0FDF4' : '#FFF7ED' }]}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: balance <= 0 ? c.green : c.orange }}>
                Balance Due
              </Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: balance <= 0 ? c.green : c.orange }}>
                {fmt(Math.max(0, balance))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Payments (if any) ── */}
        {invoice.payments.length > 0 && (
          <View style={s.paymentsSection}>
            <Text style={s.sectionTitle}>Payment History</Text>
            <View style={s.tableHeader}>
              <Text style={[s.headerText, { flex: 1 }]}>DATE</Text>
              <Text style={[s.headerText, { flex: 1 }]}>METHOD</Text>
              <Text style={[s.headerText, { flex: 1 }]}>REFERENCE</Text>
              <Text style={[s.headerText, { width: 80, textAlign: 'right' }]}>AMOUNT</Text>
            </View>
            {invoice.payments.map((pay, i) => (
              <View key={pay.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.cellText, { flex: 1 }]}>{pay.paymentDate.slice(0, 10)}</Text>
                <Text style={[s.cellText, { flex: 1 }]}>{pay.paymentMethod}</Text>
                <Text style={[s.cellText, { flex: 1 }]}>{pay.reference ?? '—'}</Text>
                <Text style={[s.cellAmtBold, { width: 80, textAlign: 'right', color: c.green }]}>{fmt(pay.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>PM Tool · Invoice #{String(invoice.id).padStart(4, '0')}</Text>
          <Text style={s.footerText}>Generated {new Date().toLocaleDateString('en-US')}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
