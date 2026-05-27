import api from './client'

export type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'SENT' | 'APPROVED' | 'REJECTED' | 'PAID' | 'OVERDUE'
export type InvoiceType = 'CLIENT' | 'VENDOR'
export type TriggerType = 'MANUAL' | 'MILESTONE' | 'PERIODIC' | 'MIXED'

export interface InvoiceLineItem {
  id: number
  description: string
  quantity: string
  unitPrice: string
  amount: string
  taskId: number | null
  milestoneId: number | null
}

export interface Payment {
  id: number
  amount: string
  paymentDate: string
  paymentMethod: string
  reference: string | null
  invoiceId: number
  recordedBy: { id: number; name: string }
}

export interface Invoice {
  id: number
  invoiceType: InvoiceType
  status: InvoiceStatus
  triggerType: TriggerType | null
  invoiceDate: string
  dueDate: string
  subtotal: string
  taxRate: string
  taxAmount: string
  total: string
  notes: string | null
  sentAt: string | null
  paidAt: string | null
  approvedAt: string | null
  rejectionNote: string | null
  createdAt: string
  clientId: number | null
  vendorId: number | null
  projectId: number | null
  milestoneId: number | null
  vendorQuoteId: number | null
  client: { id: number; name: string } | null
  vendor: { id: number; name: string } | null
  project: { id: number; name: string } | null
  createdBy: { id: number; name: string }
  approvedBy: { id: number; name: string } | null
  _count?: { lineItems: number; payments: number }
}

export interface InvoiceDetail extends Invoice {
  milestone: { id: number; name: string } | null
  vendorQuote: { id: number; quotedPrice: string; paymentMode: string } | null
  lineItems: InvoiceLineItem[]
  payments: Payment[]
}

export const invoicesApi = {
  list: (filters?: { clientId?: number; projectId?: number; vendorId?: number; status?: InvoiceStatus; invoiceType?: InvoiceType }) => {
    const params = new URLSearchParams()
    if (filters?.clientId) params.set('clientId', String(filters.clientId))
    if (filters?.projectId) params.set('projectId', String(filters.projectId))
    if (filters?.vendorId) params.set('vendorId', String(filters.vendorId))
    if (filters?.status) params.set('status', filters.status)
    if (filters?.invoiceType) params.set('invoiceType', filters.invoiceType)
    const qs = params.toString()
    return api.get<Invoice[]>(`/invoices${qs ? `?${qs}` : ''}`)
  },
  get: (id: number) => api.get<InvoiceDetail>(`/invoices/${id}`),
  create: (data: Record<string, unknown>) => api.post<InvoiceDetail>('/invoices', data),
  update: (id: number, data: Record<string, unknown>) => api.patch<InvoiceDetail>(`/invoices/${id}`, data),
  remove: (id: number) => api.delete(`/invoices/${id}`),
  submit: (id: number) => api.post<InvoiceDetail>(`/invoices/${id}/submit`, {}),
  approve: (id: number) => api.post<InvoiceDetail>(`/invoices/${id}/approve`, {}),
  reject: (id: number, rejectionNote: string) => api.post<InvoiceDetail>(`/invoices/${id}/reject`, { rejectionNote }),
  addPayment: (invoiceId: number, data: Record<string, unknown>) =>
    api.post<Payment>(`/invoices/${invoiceId}/payments`, data),
  removePayment: (paymentId: number) => api.delete(`/invoices/payments/${paymentId}`),
}
