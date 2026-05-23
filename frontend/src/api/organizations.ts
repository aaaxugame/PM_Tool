import api from './client'

export interface Client {
  id: number
  name: string
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  currency: string
  paymentTerms: string
  isActive: boolean
  createdAt: string
}

export interface Vendor {
  id: number
  name: string
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  defaultHourlyRate: string | null
  currency: string
  isActive: boolean
  createdAt: string
}

export interface User {
  id: number
  email: string
  name: string
  authProvider: string
  isActive: boolean
  roles: string[]
  vendor: Vendor | null
  client: Client | null
  createdAt: string
}

export const clientsApi = {
  list: () => api.get<Client[]>('/organizations/clients'),
  get: (id: number) => api.get<Client>(`/organizations/clients/${id}`),
  create: (data: Partial<Client>) => api.post<Client>('/organizations/clients', data),
  update: (id: number, data: Partial<Client>) => api.patch<Client>(`/organizations/clients/${id}`, data),
  remove: (id: number) => api.delete(`/organizations/clients/${id}`),
}

export const vendorsApi = {
  list: () => api.get<Vendor[]>('/organizations/vendors'),
  get: (id: number) => api.get<Vendor>(`/organizations/vendors/${id}`),
  create: (data: Partial<Vendor>) => api.post<Vendor>('/organizations/vendors', data),
  update: (id: number, data: Partial<Vendor>) => api.patch<Vendor>(`/organizations/vendors/${id}`, data),
  remove: (id: number) => api.delete(`/organizations/vendors/${id}`),
}

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  get: (id: number) => api.get<User>(`/users/${id}`),
  create: (data: any) => api.post<User>('/users', data),
  update: (id: number, data: any) => api.patch<User>(`/users/${id}`, data),
  remove: (id: number) => api.delete(`/users/${id}`),
  assignRoles: (id: number, roles: string[]) => api.post(`/users/${id}/roles`, { roles }),
}
