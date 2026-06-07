import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { vendorQuotesApi, type VendorQuote } from '../../api/quotesBudgets'

const fmt = (n: string | number) =>
  '$' + parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PendingQuotesPanel() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState<VendorQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    vendorQuotesApi.list({ status: 'SUBMITTED' })
      .then(r => setQuotes(r.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (q: VendorQuote, status: 'APPROVED' | 'REJECTED') => {
    setActing(q.id)
    try {
      await vendorQuotesApi.update(q.id, { status })
      load()
    } finally { setActing(null) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Pending Quote Approvals</h2>
        {quotes.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            {quotes.length} awaiting review
          </span>
        )}
      </div>

      {loading ? (
        <div className="px-4 py-6 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">No quotes awaiting review.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2 text-left font-medium">Vendor</th>
              <th className="px-4 py-2 text-left font-medium">Project</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-left font-medium">Submitted by</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {quotes.map(q => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{q.vendor.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {q.project ? (
                    <button
                      onClick={() => navigate(`/projects/${q.project!.id}?tab=quotes`)}
                      className="text-blue-600 hover:underline"
                    >
                      {q.project.name}
                    </button>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(q.quotedPrice)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{q.submittedBy.name}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      disabled={acting === q.id}
                      onClick={() => handleAction(q, 'APPROVED')}
                      className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={acting === q.id}
                      onClick={() => handleAction(q, 'REJECTED')}
                      className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
