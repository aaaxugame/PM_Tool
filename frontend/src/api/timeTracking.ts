import api from './client'

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface TimeEntry {
  id: number
  date: string
  startTime: string
  endTime: string
  durationMinutes: number
  description: string | null
  isBillable: boolean
  isLocked: boolean
  projectId: number
  taskId: number | null
  timesheetId: number | null
  userId: number
  createdAt: string
  project: { id: number; name: string }
  task: { id: number; name: string } | null
  timesheet: { id: number; status: TimesheetStatus } | null
}

export interface Timesheet {
  id: number
  periodStart: string
  periodEnd: string
  status: TimesheetStatus
  rejectionReason: string | null
  userId: number
  createdAt: string
  user?: { id: number; name: string }
  reviewedBy: { id: number; name: string } | null
  _count: { timeEntries: number }
}

export const timeEntriesApi = {
  list: (filters?: { projectId?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams()
    if (filters?.projectId) params.set('projectId', String(filters.projectId))
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)
    const qs = params.toString()
    return api.get<TimeEntry[]>(`/time-entries${qs ? `?${qs}` : ''}`)
  },
  create: (data: Record<string, unknown>) => api.post<TimeEntry>('/time-entries', data),
  update: (id: number, data: Record<string, unknown>) => api.patch<TimeEntry>(`/time-entries/${id}`, data),
  remove: (id: number) => api.delete(`/time-entries/${id}`),
}

export const timesheetsApi = {
  list: () => api.get<Timesheet[]>('/timesheets'),
  listPending: () => api.get<Timesheet[]>('/timesheets/pending'),
  get: (id: number) => api.get<Timesheet & { timeEntries: TimeEntry[] }>(`/timesheets/${id}`),
  create: (data: { periodStart: string; periodEnd: string }) => api.post<Timesheet>('/timesheets', data),
  update: (id: number, data: { status?: TimesheetStatus; rejectionReason?: string }) =>
    api.patch<Timesheet>(`/timesheets/${id}`, data),
  approve: (id: number) => api.post<Timesheet>(`/timesheets/${id}/approve`, {}),
  reject: (id: number, rejectionReason: string) =>
    api.post<Timesheet>(`/timesheets/${id}/reject`, { rejectionReason }),
  remove: (id: number) => api.delete(`/timesheets/${id}`),
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function timeFromIso(iso: string): string {
  return iso.slice(11, 16)
}

export function dateFromIso(iso: string): string {
  return iso.slice(0, 10)
}
