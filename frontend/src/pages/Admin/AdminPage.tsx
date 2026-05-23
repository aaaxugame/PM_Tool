import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import UsersTab from './UsersTab'
import ClientsTab from './ClientsTab'
import VendorsTab from './VendorsTab'

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'clients', label: 'Clients' },
  { key: 'vendors', label: 'Vendors' },
]

export default function AdminPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('users')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">{t('nav.admin')}</h1>

      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'vendors' && <VendorsTab />}
    </div>
  )
}
