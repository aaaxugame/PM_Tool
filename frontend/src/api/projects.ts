import api from './client'

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED'
export type BillingMethod = 'FIXED' | 'TIME_AND_MATERIALS' | 'MILESTONE' | 'MIXED'
export type MilestoneStatus = 'PENDING' | 'COMPLETED'
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ProjectApproval = 'PENDING' | 'APPROVED' | 'REJECTED'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type ProjectType = 'INTERNAL' | 'VENDOR'
export type ProposalStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISION_REQUESTED'
export type ProposalVersionStatus = 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISION_REQUESTED'

export interface ProjectMember {
  id: number
  projectId: number
  userId: number
  hourlyRate: string | null
  isBillable: boolean
  createdAt: string
  user: { id: number; name: string; email: string }
}

export interface Project {
  id: number
  name: string
  description: string | null
  status: ProjectStatus
  approvalStatus: ProjectApproval
  projectType: ProjectType
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
  hourlyRate: string | null
  proposedWorkers: number | null
  requestingVendorId: number | null
  assignedVendorId: number | null
  proposalStatus: ProposalStatus
  proposalVersion: number
  proposalSentAt: string | null
  proposalRespondedAt: string | null
  proposalRevisionNote: string | null
  client: { id: number; name: string; currency: string } | null
  createdBy: { id: number; name: string }
  requestingVendor: { id: number; name: string } | null
  assignedVendor: { id: number; name: string } | null
  assignments: { assignmentRole: string; user: { id: number; name: string } }[]
  members?: ProjectMember[]
  _count: { milestones: number; tasks: number }
}

export interface ProjectDetail extends Project {
  milestones: Milestone[]
  proposalVersions: ProposalVersion[]
  changeRequests: ChangeRequest[]
  _count: { tasks: number; timeEntries: number }
}

export type ChangeRequestStatus = 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISION_REQUESTED'

export interface ChangeRequestMilestone {
  name: string
  description: string | null
  dueDate: string | null
  amount: number
}

export interface ChangeRequest {
  id: number
  title: string
  description: string | null
  costDelta: string
  milestones: ChangeRequestMilestone[]
  status: ChangeRequestStatus
  sentAt: string
  respondedAt: string | null
  responseNote: string | null
  requestedBy: { id: number; name: string }
  respondedBy: { id: number; name: string } | null
  createdMilestones: Milestone[]
  supersedesId: number | null
}

export interface ProposalVersionSnapshot {
  description: string | null
  billingMethod: BillingMethod
  proposedCost: string | null
  hourlyRate: string | null
  estimatedHours: string | null
  currency: string
  milestones: {
    id: number
    name: string
    description: string | null
    dueDate: string | null
    amount: string | null
    triggersInvoice: boolean
  }[]
}

export interface ProposalVersion {
  id: number
  version: number
  status: ProposalVersionStatus
  snapshot: ProposalVersionSnapshot
  sentAt: string
  sentBy: { id: number; name: string }
  respondedAt: string | null
  respondedBy: { id: number; name: string } | null
  responseNote: string | null
}

export interface Milestone {
  id: number
  name: string
  description: string | null
  dueDate: string | null
  status: MilestoneStatus
  triggersInvoice: boolean
  completedAt: string | null
  amount: string | null
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
  listPendingRequests: () => api.get<Project[]>('/projects/pending-requests'),
  listClient: () => api.get<Project[]>('/projects/client'),
  get: (id: number) => api.get<ProjectDetail>(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post<Project>('/projects', data),
  update: (id: number, data: Record<string, unknown>) => api.patch<Project>(`/projects/${id}`, data),
  remove: (id: number) => api.delete(`/projects/${id}`),
  sendProposal: (id: number) => api.post<Project>(`/projects/${id}/proposal/send`, {}),
  approveProposal: (id: number) => api.post<Project>(`/projects/${id}/proposal/approve`, {}),
  declineProposal: (id: number, note: string) => api.post<Project>(`/projects/${id}/proposal/decline`, { note }),
  requestProposalRevision: (id: number, note: string) =>
    api.post<Project>(`/projects/${id}/proposal/request-revision`, { note }),
  reviseProposal: (id: number) => api.post<Project>(`/projects/${id}/proposal/revise`, {}),
}

export const projectMembersApi = {
  list: (projectId: number) => api.get<ProjectMember[]>(`/projects/${projectId}/members`),
  add: (projectId: number, userId: number) => api.post<ProjectMember>(`/projects/${projectId}/members`, { userId }),
  remove: (projectId: number, userId: number) => api.delete(`/projects/${projectId}/members/${userId}`),
  listAssignableUsers: (projectId: number) =>
    api.get<{ id: number; name: string; email: string }[]>(`/projects/${projectId}/assignable-users`),
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

export const changeRequestsApi = {
  list: (projectId: number) => api.get<ChangeRequest[]>(`/projects/${projectId}/change-requests`),
  create: (projectId: number, data: Record<string, unknown>) =>
    api.post<ChangeRequest>(`/projects/${projectId}/change-requests`, data),
  approve: (projectId: number, id: number) =>
    api.post<ChangeRequest>(`/projects/${projectId}/change-requests/${id}/approve`, {}),
  decline: (projectId: number, id: number, note: string) =>
    api.post<ChangeRequest>(`/projects/${projectId}/change-requests/${id}/decline`, { note }),
  requestRevision: (projectId: number, id: number, note: string) =>
    api.post<ChangeRequest>(`/projects/${projectId}/change-requests/${id}/request-revision`, { note }),
}
