import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/authContext'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh-CN', label: '简' },
  { code: 'zh-TW', label: '繁' },
]

type NavItem = { to: string; label: string; icon: string; adminOnly?: boolean }

const navItems: NavItem[] = [
  { to: '/', label: 'nav.dashboard', icon: '⊞' },
  { to: '/projects', label: 'nav.projects', icon: '📁' },
  { to: '/tasks', label: 'nav.tasks', icon: '✓' },
  { to: '/time-tracking', label: 'nav.timeTracking', icon: '⏱' },
  { to: '/invoices', label: 'nav.invoices', icon: '🧾' },
  { to: '/reports', label: 'nav.reports', icon: '📊' },
  { to: '/admin', label: 'nav.admin', icon: '⚙️', adminOnly: true },
]

export default function Layout() {
  const { t, i18n } = useTranslation()
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const isAdmin = hasRole('ADMIN') || hasRole('SUPER_ADMIN')

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-blue-600">PM Tool</span>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems
            .filter(item => !item.adminOnly || isAdmin)
            .map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{t(item.label)}</span>
              </NavLink>
            ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
          <p className="font-medium text-gray-700 truncate">{user?.name}</p>
          <p className="truncate">{user?.email}</p>
          {isAdmin && (
            <p className="mt-0.5 text-blue-500 font-medium">Admin</p>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4">
          {/* Language toggle */}
          <div className="flex gap-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t('auth.logout')}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
