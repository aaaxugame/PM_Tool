import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../store/authContext'
import { dashboardApi, type DashboardStats } from '../../api/dashboard'

const PROJECT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', ACTIVE: 'bg-green-50 text-green-700',
  ON_HOLD: 'bg-yellow-50 text-yellow-700', COMPLETED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-600',
}
const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-yellow-50 text-yellow-700',
  PAID: 'bg-green-50 text-green-700', OVERDUE: 'bg-red-50 text-red-600',
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.stats()
      .then(r => setStats(r.data))
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    { label: t('dashboard.activeProjects'), value: stats.activeProjects, color: 'blue', onClick: () => navigate('/projects') },
    { label: t('dashboard.openTasks') || 'Open Tasks', value: stats.openTasks, color: 'purple', onClick: () => navigate('/tasks') },
    { label: t('dashboard.pendingTimesheets'), value: stats.pendingTimesheets, color: 'yellow', onClick: () => navigate('/time-tracking') },
    { label: t('dashboard.hoursThisWeek') || 'Hours This Week', value: stats.hoursThisWeek, color: 'green', onClick: () => navigate('/time-tracking') },
    {
      label: t('dashboard.outstandingInvoices') || 'Outstanding Invoices',
      value: stats.outstandingInvoiceCount > 0
        ? `${stats.outstandingInvoiceCount} · $${stats.outstandingInvoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : '0',
      color: stats.outstandingInvoiceCount > 0 ? 'red' : 'gray',
      onClick: () => navigate('/invoices'),
    },
  ] : []

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{t('dashboard.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('dashboard.welcomeBack')}, {user?.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-8 bg-gray-100 rounded w-1/2" />
              </div>
            ))
          : statCards.map(card => (
              <div key={card.label}
                onClick={card.onClick}
                className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-sm transition-shadow">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">{card.label}</p>
                <p className={`text-2xl font-bold px-2 py-1 rounded w-fit border ${colorMap[card.color]}`}>
                  {card.value}
                </p>
              </div>
            ))
        }
      </div>

      {/* Two-column: recent projects + recent invoices */}
      {!loading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">{t('dashboard.recentProjects')}</h2>
              <button onClick={() => navigate('/projects')} className="text-xs text-blue-600 hover:underline">{t('dashboard.viewAll')}</button>
            </div>
            {stats.recentProjects.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">{t('dashboard.noProjects')}</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {stats.recentProjects.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.client.name}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">{p._count.tasks} {t('dashboard.tasks')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">{t('dashboard.recentInvoices')}</h2>
              <button onClick={() => navigate('/invoices')} className="text-xs text-blue-600 hover:underline">{t('dashboard.viewAll')}</button>
            </div>
            {stats.recentInvoices.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">{t('dashboard.noInvoices')}</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {stats.recentInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">#{String(inv.id).padStart(4, '0')} · {inv.client?.name ?? inv.vendor?.name}</p>
                        <p className="text-xs text-gray-400">Due {inv.dueDate.slice(0, 10)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-medium text-gray-700">
                        ${parseFloat(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
