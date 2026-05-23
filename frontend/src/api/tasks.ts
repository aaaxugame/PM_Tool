import api from './client'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Task {
  id: number
  name: string
  description: string | null
  status: TaskStatus
  priority: Priority
  projectId: number
  milestoneId: number | null
  assigneeId: number | null
  estimatedHours: string | null
  isBillable: boolean
  dueDate: string | null
  createdAt: string
  project: { id: number; name: string }
  milestone: { id: number; name: string } | null
  assignee: { id: number; name: string } | null
  createdBy: { id: number; name: string }
}

export interface TaskFilters {
  projectId?: number
  milestoneId?: number
  status?: TaskStatus
  priority?: Priority
  assigneeId?: number
}

export const tasksApi = {
  list: (filters?: TaskFilters) => {
    const params = new URLSearchParams()
    if (filters?.projectId) params.set('projectId', String(filters.projectId))
    if (filters?.milestoneId) params.set('milestoneId', String(filters.milestoneId))
    if (filters?.status) params.set('status', filters.status)
    if (filters?.priority) params.set('priority', filters.priority)
    if (filters?.assigneeId) params.set('assigneeId', String(filters.assigneeId))
    const qs = params.toString()
    return api.get<Task[]>(`/tasks${qs ? `?${qs}` : ''}`)
  },
  get: (id: number) => api.get<Task>(`/tasks/${id}`),
  create: (data: Record<string, unknown>) => api.post<Task>('/tasks', data),
  update: (id: number, data: Record<string, unknown>) => api.patch<Task>(`/tasks/${id}`, data),
  remove: (id: number) => api.delete(`/tasks/${id}`),
}
