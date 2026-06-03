import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/authContext'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh-CN', label: '简' },
  { code: 'zh-TW', label: '繁' },
]

type NavItem = {
  to: string
  label: string
  icon: string
  roles?: string[]   // if set, only show to users with at least one of these roles
}

const NAV_SECTIONS = [
  {
    titleKey: null,
    items: [{ to: '/', label: 'nav.dashboard', icon: '⊞' }],
  },
  {
    titleKey: 'nav.manage',
    items: [
      { to: '/projects', label: 'nav.projects', icon: '📁' },
      { to: '/tasks', label: 'nav.tasks', icon: '✓', roles: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'CONTRACTOR', 'VENDOR_CONTACT'] },
    ],
  },
  {
    titleKey: 'nav.timeBilling',
    items: [
      { to: '/time-tracking', label: 'nav.timeTracking', icon: '⏱', roles: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'CONTRACTOR', 'VENDOR_CONTACT'] },
      { to: '/timesheets', label: 'nav.timesheets', icon: '📋', roles: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'CONTRACTOR', 'VENDOR_CONTACT'] },
      { to: '/invoices', label: 'nav.invoices', icon: '🧾' },
      { to: '/financials', label: 'nav.financials', icon: '💰', roles: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'] },
      { to: '/reports', label: 'nav.reports', icon: '📊', roles: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER'] },
    ],
  },
  {
    titleKey: 'admin.title',
    items: [
      { to: '/admin', label: 'nav.admin', icon: '⚙️', roles: ['ADMIN', 'SUPER_ADMIN'] },
    ],
  },
]

export default function Layout() {
  const { t, i18n } = useTranslation()
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const canSee = (item: NavItem) => {
    if (!item.roles) return true
    return item.roles.some(r => hasRole(r))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Determine user type for sidebar badge
  const userType = (user as any)?.vendor ? 'vendor' : (user as any)?.client ? 'client' : 'internal'
  const companyName = (user as any)?.vendor?.name ?? (user as any)?.client?.name ?? null
  const typeIcon = userType === 'vendor' ? '🔧' : userType === 'client' ? '👤' : '🏢'

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-blue-600">PM Tool</span>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_SECTIONS.map((section, si) => {
            const visible = section.items.filter(canSee)
            if (visible.length === 0) return null
            return (
              <div key={si} className={si > 0 ? 'pt-3' : ''}>
                {section.titleKey && (
                  <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t(section.titleKey)}
                  </p>
                )}
                {visible.map(item => (
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
              </div>
            )
          })}
        </nav>

        {/* User profile bottom link */}
        <Link to="/profile" className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors block">
          <p className="font-medium text-gray-700 truncate">{user?.name}</p>
          {(user as any)?.jobTitle && <p className="truncate text-gray-400">{(user as any).jobTitle}</p>}
          <p className="truncate">{user?.email}</p>
          <p className="mt-0.5 flex items-center gap-1">
            <span>{typeIcon}</span>
            <span className="truncate">{companyName ?? t('admin.internal')}</span>
          </p>
          <p className="mt-0.5 text-blue-400 font-medium">{t('profile.editProfile')}</p>
        </Link>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4">
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

          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
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
