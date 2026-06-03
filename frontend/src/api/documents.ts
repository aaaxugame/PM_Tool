import api from './client'

export interface Document {
  id: number
  filename: string
  storedName: string
  mimeType: string
  size: number
  url: string
  createdAt: string
  uploadedBy: { id: number; name: string }
}

export type DocumentFilter = {
  projectId?: number
  invoiceId?: number
  invoiceLineItemId?: number
  milestoneId?: number
}

export const documentsApi = {
  upload: (file: File, filter: DocumentFilter) => {
    const params = new URLSearchParams()
    if (filter.projectId) params.set('projectId', String(filter.projectId))
    if (filter.invoiceId) params.set('invoiceId', String(filter.invoiceId))
    if (filter.invoiceLineItemId) params.set('invoiceLineItemId', String(filter.invoiceLineItemId))
    if (filter.milestoneId) params.set('milestoneId', String(filter.milestoneId))
    const form = new FormData()
    form.append('file', file)
    return api.post<Document>(`/documents/upload?${params}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: (filter: DocumentFilter) => {
    const params = new URLSearchParams()
    if (filter.projectId) params.set('projectId', String(filter.projectId))
    if (filter.invoiceId) params.set('invoiceId', String(filter.invoiceId))
    if (filter.invoiceLineItemId) params.set('invoiceLineItemId', String(filter.invoiceLineItemId))
    if (filter.milestoneId) params.set('milestoneId', String(filter.milestoneId))
    return api.get<Document[]>(`/documents?${params}`)
  },

  remove: (id: number) => api.delete(`/documents/${id}`),
}
