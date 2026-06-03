import { useState, useEffect, useRef } from 'react'
import { documentsApi, type Document, type DocumentFilter } from '../api/documents'
import { useAuth } from '../store/authContext'

const BACKEND = 'http://localhost:3000'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
  return '📎'
}

export default function DocumentManager({ filter, readOnly = false }: {
  filter: DocumentFilter
  readOnly?: boolean
}) {
  const { user } = useAuth()
  const [docs, setDocs] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    documentsApi.list(filter).then(r => setDocs(r.data))
  }

  useEffect(() => { load() }, [
    filter.projectId,
    filter.invoiceId,
    filter.invoiceLineItemId,
    filter.milestoneId,
  ])

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { setError(`${file.name} exceeds 10 MB limit`); continue }
        await documentsApi.upload(file, filter)
      }
      load()
    } catch {
      setError('Upload failed. Check file type or size.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.filename}"?`)) return
    await documentsApi.remove(doc.id)
    load()
  }

  const [dragging, setDragging] = useState(false)

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <p className="text-sm text-gray-500">
            {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, images, Word, Excel — max 10 MB</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {docs.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
              <span className="text-lg">{fileIcon(doc.mimeType)}</span>
              <div className="flex-1 min-w-0">
                <a
                  href={`${BACKEND}${doc.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline truncate block"
                >
                  {doc.filename}
                </a>
                <p className="text-xs text-gray-400">
                  {formatSize(doc.size)} · {doc.uploadedBy.name} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              {!readOnly && (user as any)?.id === doc.uploadedBy.id && (
                <button
                  onClick={() => handleDelete(doc)}
                  className="text-xs text-red-500 hover:underline shrink-0"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {docs.length === 0 && <p className="text-xs text-gray-400">No attachments yet.</p>}
    </div>
  )
}
