import api from './client'

export type QuoteStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface VendorQuote {
  id: number
  quotedPrice: string
  estimatedHours: string | null
  peopleCount: number | null
  status: QuoteStatus
  version: number
  expiryDate: string | null
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
  vendorId: number
  projectId: number | null
  taskId: number | null
  submittedById: number
  reviewedById: number | null
  vendor: { id: number; name: string }
  project: { id: number; name: string } | null
  task: { id: number; name: string } | null
  submittedBy: { id: number; name: string }
  reviewedBy: { id: number; name: string } | null
}

export interface Budget {
  id: number
  amount: string
  notes: string | null
  createdAt: string
  projectId: number | null
  taskId: number | null
  enteredById: number
  project: { id: number; name: string } | null
  task: { id: number; name: string } | null
  enteredBy: { id: number; name: string }
}

export const vendorQuotesApi = {
  list: (filters?: { projectId?: number; vendorId?: number; status?: QuoteStatus }) => {
    const params = new URLSearchParams()
    if (filters?.projectId) params.set('projectId', String(filters.projectId))
    if (filters?.vendorId) params.set('vendorId', String(filters.vendorId))
    if (filters?.status) params.set('status', filters.status)
    const qs = params.toString()
    return api.get<VendorQuote[]>(`/vendor-quotes${qs ? `?${qs}` : ''}`)
  },
  create: (data: Record<string, unknown>) => api.post<VendorQuote>('/vendor-quotes', data),
  update: (id: number, data: Record<string, unknown>) => api.patch<VendorQuote>(`/vendor-quotes/${id}`, data),
  remove: (id: number) => api.delete(`/vendor-quotes/${id}`),
}

export const budgetsApi = {
  list: (filters?: { projectId?: number; taskId?: number }) => {
    const params = new URLSearchParams()
    if (filters?.projectId) params.set('projectId', String(filters.projectId))
    if (filters?.taskId) params.set('taskId', String(filters.taskId))
    const qs = params.toString()
    return api.get<Budget[]>(`/budgets${qs ? `?${qs}` : ''}`)
  },
  create: (data: Record<string, unknown>) => api.post<Budget>('/budgets', data),
  update: (id: number, data: Record<string, unknown>) => api.patch<Budget>(`/budgets/${id}`, data),
  remove: (id: number) => api.delete(`/budgets/${id}`),
}
