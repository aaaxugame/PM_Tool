import api from './client'

export interface DashboardStats {
  activeProjects: number
  openTasks: number
  pendingTimesheets: number
  hoursThisWeek: string
  outstandingInvoiceCount: number
  outstandingInvoiceTotal: number
  recentProjects: {
    id: number; name: string; status: string; createdAt: string
    client: { id: number; name: string }
    _count: { tasks: number }
  }[]
  recentInvoices: {
    id: number; status: string; total: string; dueDate: string; invoiceDate: string
    client: { id: number; name: string }
  }[]
}

export interface TimeReport {
  totalMinutes: number
  totalHours: string
  byProject: { projectId: number; projectName: string; totalMinutes: number; entries: number }[]
  entries: {
    id: number; date: string; durationMinutes: number; description: string | null
    project: { id: number; name: string } | null
    user: { id: number; name: string }
    task: { id: number; name: string } | null
  }[]
}

export interface InvoiceReport {
  totalBilled: number
  totalCollected: number
  outstanding: number
  byStatus: { DRAFT: number; SENT: number; PAID: number; OVERDUE: number }
  invoices: {
    id: number; status: string; invoiceDate: string; dueDate: string
    total: number; collected: number
    client: { id: number; name: string }
  }[]
}

export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
  timeReport: (filters?: { projectId?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams()
    if (filters?.projectId) params.set('projectId', String(filters.projectId))
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)
    const qs = params.toString()
    return api.get<TimeReport>(`/dashboard/time-report${qs ? `?${qs}` : ''}`)
  },
  invoiceReport: (filters?: { clientId?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams()
    if (filters?.clientId) params.set('clientId', String(filters.clientId))
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)
    const qs = params.toString()
    return api.get<InvoiceReport>(`/dashboard/invoice-report${qs ? `?${qs}` : ''}`)
  },
}
