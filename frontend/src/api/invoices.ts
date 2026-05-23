import api from './client'

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
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
  status: InvoiceStatus
  triggerType: TriggerType
  invoiceDate: string
  dueDate: string
  subtotal: string
  taxRate: string
  taxAmount: string
  total: string
  notes: string | null
  sentAt: string | null
  paidAt: string | null
  createdAt: string
  clientId: number
  projectId: number | null
  milestoneId: number | null
  client: { id: number; name: string }
  project: { id: number; name: string } | null
  createdBy: { id: number; name: string }
  _count?: { lineItems: number; payments: number }
}

export interface InvoiceDetail extends Invoice {
  milestone: { id: number; name: string } | null
  lineItems: InvoiceLineItem[]
  payments: Payment[]
}

export const invoicesApi = {
  list: (filters?: { clientId?: number; projectId?: number; status?: InvoiceStatus }) => {
    const params = new URLSearchParams()
    if (filters?.clientId) params.set('clientId', String(filters.clientId))
    if (filters?.projectId) params.set('projectId', String(filters.projectId))
    if (filters?.status) params.set('status', filters.status)
    const qs = params.toString()
    return api.get<Invoice[]>(`/invoices${qs ? `?${qs}` : ''}`)
  },
  get: (id: number) => api.get<InvoiceDetail>(`/invoices/${id}`),
  create: (data: Record<string, unknown>) => api.post<InvoiceDetail>('/invoices', data),
  update: (id: number, data: Record<string, unknown>) => api.patch<InvoiceDetail>(`/invoices/${id}`, data),
  remove: (id: number) => api.delete(`/invoices/${id}`),
  addPayment: (invoiceId: number, data: Record<string, unknown>) =>
    api.post<Payment>(`/invoices/${invoiceId}/payments`, data),
  removePayment: (paymentId: number) => api.delete(`/invoices/payments/${paymentId}`),
}
