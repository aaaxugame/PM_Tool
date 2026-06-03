import api from './client'

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED'
export type BillingMethod = 'FIXED' | 'TIME_AND_MATERIALS' | 'MILESTONE' | 'MIXED'
export type MilestoneStatus = 'PENDING' | 'COMPLETED'
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ProjectApproval = 'PENDING' | 'APPROVED' | 'REJECTED'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Project {
  id: number
  name: string
  description: string | null
  status: ProjectStatus
  approvalStatus: ProjectApproval
  priority: ProjectPriority
  billingMethod: BillingMethod
  startDate: string | null
  endDate: string | null
  clientId: number | null
  createdById: number
  createdAt: string
  category: string | null
  riskLevel: RiskLevel | null
  requiredSkillSet: string | null
  proposedCost: string | null
  estimatedHours: string | null
  proposedWorkers: number | null
  requestingVendorId: number | null
  client: { id: number; name: string } | null
  createdBy: { id: number; name: string }
  requestingVendor: { id: number; name: string } | null
  assignments: { assignmentRole: string; user: { id: number; name: string } }[]
  _count: { milestones: number; tasks: number }
}

export interface ProjectDetail extends Project {
  milestones: Milestone[]
  _count: { tasks: number; timeEntries: number }
}

export interface Milestone {
  id: number
  name: string
  description: string | null
  dueDate: string | null
  status: MilestoneStatus
  triggersInvoice: boolean
  completedAt: string | null
  createdAt: string
  projectId: number
}

export interface ProjectFilters {
  status?: ProjectStatus
  pmId?: number
  amId?: number
  clientId?: number
  vendorId?: number
}

export const projectsApi = {
  list: (filters?: ProjectFilters) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.pmId) params.set('pmId', String(filters.pmId))
    if (filters?.amId) params.set('amId', String(filters.amId))
    if (filters?.clientId) params.set('clientId', String(filters.clientId))
    if (filters?.vendorId) params.set('vendorId', String(filters.vendorId))
    const qs = params.toString()
    return api.get<Project[]>(qs ? `/projects?${qs}` : '/projects')
  },
  listMine: () => api.get<Project[]>('/projects/mine'),
  listVendor: (archived?: boolean) =>
    api.get<Project[]>(archived ? '/projects/vendor?archived=true' : '/projects/vendor'),
  listVendorRequests: () => api.get<Project[]>('/projects/vendor/requests'),
  listClient: () => api.get<Project[]>('/projects/client'),
  get: (id: number) => api.get<ProjectDetail>(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post<Project>('/projects', data),
  update: (id: number, data: Record<string, unknown>) => api.patch<Project>(`/projects/${id}`, data),
  remove: (id: number) => api.delete(`/projects/${id}`),
}

export const milestonesApi = {
  list: (projectId: number) => api.get<Milestone[]>(`/projects/${projectId}/milestones`),
  create: (projectId: number, data: Record<string, unknown>) =>
    api.post<Milestone>(`/projects/${projectId}/milestones`, data),
  update: (projectId: number, id: number, data: Record<string, unknown>) =>
    api.patch<Milestone>(`/projects/${projectId}/milestones/${id}`, data),
  remove: (projectId: number, id: number) =>
    api.delete(`/projects/${projectId}/milestones/${id}`),
}
