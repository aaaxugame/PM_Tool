import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../store/authContext'
import { authApi } from '../../api/auth'

type UserType = 'internal' | 'vendor' | 'client'

function getUserType(user: any): UserType {
  if (user?.vendor) return 'vendor'
  if (user?.client) return 'client'
  return 'internal'
}

const TYPE_COLOR: Record<UserType, string> = {
  internal: 'bg-blue-50 text-blue-700',
  vendor: 'bg-orange-50 text-orange-700',
  client: 'bg-purple-50 text-purple-700',
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [jobTitle, setJobTitle] = useState((user as any)?.jobTitle ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const isGoogle = user?.authProvider === 'GOOGLE'
  const userType = getUserType(user)
  const companyName = (user as any)?.vendor?.name ?? (user as any)?.client?.name ?? null

  const TYPE_LABEL: Record<UserType, string> = {
    internal: `🏢 ${t('profile.userType.internal')}`,
    vendor: `🔧 ${t('profile.userType.vendor')}`,
    client: `👤 ${t('profile.userType.client')}`,
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword && newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'))
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError(t('profile.passwordTooShort'))
      return
    }

    setSaving(true)
    try {
      const payload: any = {}
      if (name !== user?.name) payload.name = name
      if (email !== user?.email) payload.email = email
      if (jobTitle !== ((user as any)?.jobTitle ?? '')) payload.jobTitle = jobTitle
      if (newPassword) { payload.newPassword = newPassword; payload.currentPassword = currentPassword }

      if (Object.keys(payload).length === 0) {
        setError(t('common.noChanges'))
        return
      }

      const res = await authApi.updateProfile(payload)
      setUser(res.data)
      setSuccess(t('profile.updateSuccess'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      setError(e.response?.data?.message ?? t('profile.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-gray-800 mb-6">{t('profile.title')}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">

        {/* Avatar + identity */}
        <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800">{user?.name}</p>
            {(user as any)?.jobTitle && (
              <p className="text-sm text-gray-500">{(user as any).jobTitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {/* User type badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[userType]}`}>
                {TYPE_LABEL[userType]}{companyName ? `: ${companyName}` : ''}
              </span>
              {/* Auth provider */}
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {isGoogle ? t('profile.googleAccount') : t('profile.localAccount')}
              </span>
            </div>
            {/* Roles */}
            {user?.roles && user.roles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {user.roles.map(role => (
                  <span key={role} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {role.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Personal Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.name')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              disabled={isGoogle} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
            {isGoogle && <p className="text-xs text-gray-400 mt-1">{t('profile.googleManaged')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.jobTitle')}</label>
            <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              placeholder={t('profile.jobTitlePlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Read-only company info */}
          {companyName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.organisation')}</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
                {companyName}
              </div>
              <p className="text-xs text-gray-400 mt-1">{t('profile.orgManaged')}</p>
            </div>
          )}
        </div>

        {/* Security — local accounts only */}
        {!isGoogle && (
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <p className="text-sm font-medium text-gray-700">
              {t('profile.changePassword')} <span className="font-normal text-gray-400">{t('profile.changePasswordOptional')}</span>
            </p>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('profile.currentPassword')}</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('profile.newPassword')}</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('profile.confirmPassword')}</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? t('profile.saving') : t('profile.saveChanges')}
        </button>
      </form>
    </div>
  )
}
