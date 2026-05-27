import api from './client'

export interface User {
  id: number
  email: string
  name: string
  jobTitle: string | null
  authProvider: 'LOCAL' | 'GOOGLE'
  roles: string[]
  isActive: boolean
  vendor: { id: number; name: string } | null
  client: { id: number; name: string } | null
}

export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post<User>('/auth/register/', data),

  login: (data: { email: string; password: string }) =>
    api.post<User>('/auth/login/', data),

  logout: () =>
    api.post('/auth/logout/'),

  me: () =>
    api.get<User>('/auth/me/'),

  updateProfile: (data: { name?: string; email?: string; jobTitle?: string; newPassword?: string; currentPassword?: string }) =>
    api.patch<User>('/auth/profile', data),
}
