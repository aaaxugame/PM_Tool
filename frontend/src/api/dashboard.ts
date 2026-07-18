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

export interface VendorDashboard {
  vendor: { id: number; name: string; contactEmail: string | null; contactPhone: string | null } | null
  totalProjects: number
  approvalDist: Record<string, number>
  healthDist: Record<string, number>
  totalContractValue: number
  invoicedAmount: number
  paidAmount: number
  outstandingAmount: number
  pendingQuotes: number
  recentInvoices: { id: number; status: string; total: string; dueDate: string; invoiceDate: string }[]
}

export interface PMDashboard {
  projectCount: number
  statusDist: Record<string, number>
  healthDist: Record<string, number>
  taskHealth: Record<string, number>
  upcomingMilestones: { id: number; name: string; dueDate: string; triggersInvoice: boolean; project: { id: number; name: string } }[]
  overdueTasks: { id: number; name: string; dueDate: string; status: string; project: { id: number; name: string } }[]
  hoursThisWeek: string
  pendingTimesheets: number
  budgetUtilization: { projectId: number; projectName: string; estimatedHours: number; loggedHours: number }[]
}

export interface AMDashboard {
  totalProjects: number
  activeProjects: number
  totalClients: number
  totalContractValue: number
  revenue: { totalBilled: number; totalCollected: number; outstanding: number }
  byClient: { clientId: number; clientName: string; totalProjects: number; activeProjects: number; totalValue: number }[]
  actionableInvoices: { id: number; status: string; total: number; client: { id: number; name: string } | null; dueDate: string }[]
  upcomingMilestoneTriggers: { id: number; name: string; dueDate: string; project: { id: number; name: string } }[]
  pendingQuotes: number
  pendingApprovals: number
}

export interface ClientDashboard {
  projectCards: {
    id: number; name: string; status: string; proposalStatus: string
    pct: number; totalTasks: number; doneTasks: number
    startDate: string | null; endDate: string | null
    pm: { id: number; name: string } | null
    am: { id: number; name: string } | null
  }[]
  billing: { totalContracted: number; totalInvoiced: number; totalPaid: number; outstanding: number }
  openInvoices: { id: number; status: string; total: number; dueDate: string; invoiceDate: string }[]
  upcomingMilestones: { id: number; name: string; dueDate: string; triggersInvoice: boolean; project: { id: number; name: string } }[]
  recentActivity: { id: number; date: string; durationMinutes: number; description: string | null; user: { id: number; name: string }; project: { id: number; name: string } | null; task: { id: number; name: string } | null }[]
  teamMembers: { id: number; name: string }[]
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
  vendorDashboard: () => api.get<VendorDashboard>('/dashboard/vendor'),
  pmDashboard: () => api.get<PMDashboard>('/dashboard/pm'),
  amDashboard: () => api.get<AMDashboard>('/dashboard/am'),
  clientDashboard: () => api.get<ClientDashboard>('/dashboard/client'),
}
