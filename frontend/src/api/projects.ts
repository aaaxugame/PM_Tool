import api from './client'

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
export type BillingMethod = 'FIXED' | 'HOURLY' | 'MIXED'
export type MilestoneStatus = 'PENDING' | 'COMPLETED'
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Project {
  id: number
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  billingMethod: BillingMethod
  startDate: string | null
  endDate: string | null
  clientId: number
  createdById: number
  createdAt: string
  client: { id: number; name: string }
  createdBy: { id: number; name: string }
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

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
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
