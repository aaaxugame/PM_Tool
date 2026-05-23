import api from './client'

export interface User {
  id: number
  email: string
  name: string
  auth_provider: 'local' | 'google'
  roles: string[]
  is_active: boolean
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
}
