import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  timeEntriesApi, timesheetsApi,
  type TimeEntry, type Timesheet, type TimesheetStatus,
  formatDuration, timeFromIso, dateFromIso,
} from '../../api/timeTracking'
import { projectsApi, type Project } from '../../api/projects'
import Modal from '../../components/Modal'
import TimeEntryModal from './TimeEntryModal'
import { useAuth } from '../../store/authContext'

const TS_STATUS_COLORS: Record<TimesheetStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-600',
}

export default function TimeTrackingPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { hasRole } = useAuth()
  const [tab, setTab] = useState<'entries' | 'timesheets'>(
    pathname === '/timesheets' ? 'timesheets' : 'entries'
  )
  const [projects, setProjects] = useState<Project[]>([])

  const isReviewer = hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('ACCOUNT_MANAGER') || hasRole('PROJECT_MANAGER')

  // Time entries state
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState(0)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [entryModal, setEntryModal] = useState<null | 'create' | TimeEntry>(null)
  const [timerPrefill, setTimerPrefill] = useState<{ startTime?: string; endTime?: string } | undefined>()

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState<Date | null>(null)
  const [timerDisplay, setTimerDisplay] = useState('00:00:00')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timesheets state
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [tsLoading, setTsLoading] = useState(true)
  const [tsModal, setTsModal] = useState(false)
  const [tsForm, setTsForm] = useState({ periodStart: '', periodEnd: '' })
  const [tsSaving, setTsSaving] = useState(false)

  // Review queue state (reviewer roles only)
  const [pendingTimesheets, setPendingTimesheets] = useState<Timesheet[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [approvedTimesheets, setApprovedTimesheets] = useState<any[]>([])
  const [approvedLoading, setApprovedLoading] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Timesheet | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  // Expanded timesheet entries (both review queue and My Timesheets)
  const [expandedTs, setExpandedTs] = useState<number | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Record<number, TimeEntry[]>>({})
  const [expandLoading, setExpandLoading] = useState<number | null>(null)

  useEffect(() => {
    projectsApi.list().then(r => setProjects(r.data))
  }, [])

  const loadEntries = () => {
    setEntriesLoading(true)
    timeEntriesApi.list({
      projectId: projectFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }).then(r => setEntries(r.data)).finally(() => setEntriesLoading(false))
  }

  const loadTimesheets = () => {
    setTsLoading(true)
    timesheetsApi.list().then(r => setTimesheets(r.data)).finally(() => setTsLoading(false))
  }

  const loadPending = () => {
    if (!isReviewer) return
    setPendingLoading(true)
    timesheetsApi.listPending().then(r => setPendingTimesheets(r.data)).finally(() => setPendingLoading(false))
  }

  const loadApproved = () => {
    if (!isReviewer) return
    setApprovedLoading(true)
    timesheetsApi.listApproved().then(r => setApprovedTimesheets(r.data)).finally(() => setApprovedLoading(false))
  }

  useEffect(() => { loadEntries() }, [projectFilter, fromDate, toDate])
  useEffect(() => {
    if (tab === 'timesheets') {
      loadTimesheets()
      loadPending()
      loadApproved()
    }
  }, [tab])

  // Timer logic
  const startTimer = () => {
    const now = new Date()
    setTimerStart(now)
    setTimerRunning(true)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - now.getTime()) / 1000)
      const h = Math.floor(elapsed / 3600)
      const m = Math.floor((elapsed % 3600) / 60)
      const s = elapsed % 60
      setTimerDisplay(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerRunning(false)
    const endTime = new Date().toTimeString().slice(0, 5)
    const startTime = timerStart ? timerStart.toTimeString().slice(0, 5) : ''
    setTimerPrefill({ startTime, endTime })
    setEntryModal('create')
    setTimerDisplay('00:00:00')
    setTimerStart(null)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Delete this time entry?')) return
    await timeEntriesApi.remove(id)
    loadEntries()
  }

  const handleTsSubmit = async (ts: Timesheet) => {
    await timesheetsApi.update(ts.id, { status: 'SUBMITTED' })
    loadTimesheets()
  }

  const handleTsDelete = async (ts: Timesheet) => {
    if (!confirm('Delete this timesheet?')) return
    await timesheetsApi.remove(ts.id)
    loadTimesheets()
  }

  const toggleExpand = async (ts: Timesheet) => {
    if (expandedTs === ts.id) { setExpandedTs(null); return }
    setExpandedTs(ts.id)
    if (!expandedEntries[ts.id]) {
      setExpandLoading(ts.id)
      try {
        const r = await timesheetsApi.get(ts.id)
        setExpandedEntries(prev => ({ ...prev, [ts.id]: r.data.timeEntries }))
      } finally { setExpandLoading(null) }
    }
  }

  const handleApprove = async (ts: Timesheet) => {
    setReviewSaving(true)
    try {
      await timesheetsApi.approve(ts.id)
      loadPending()
      loadApproved()
    } finally { setReviewSaving(false) }
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return
    setReviewSaving(true)
    try {
      await timesheetsApi.reject(rejectTarget.id, rejectReason.trim())
      setRejectTarget(null)
      setRejectReason('')
      loadPending()
    } finally { setReviewSaving(false) }
  }

  const handleCreateTs = async () => {
    if (!tsForm.periodStart || !tsForm.periodEnd) return
    setTsSaving(true)
    try {
      await timesheetsApi.create(tsForm)
      loadTimesheets()
      setTsModal(false)
      setTsForm({ periodStart: '', periodEnd: '' })
    } finally { setTsSaving(false) }
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('nav.timeTracking')}</h1>

        {/* Timer widget */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg text-gray-700 tabular-nums">{timerDisplay}</span>
          <button
            onClick={timerRunning ? stopTimer : startTimer}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              timerRunning
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {timerRunning ? '⏹ Stop' : '▶ Start Timer'}
          </button>
          {!timerRunning && (
            <button onClick={() => { setTimerPrefill(undefined); setEntryModal('create') }}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
              + Log Time
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        {[
          { key: 'entries', label: 'Time Log' },
          { key: 'timesheets', label: 'Timesheets' },
        ].map(item => (
          <button key={item.key} onClick={() => setTab(item.key as any)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === item.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {item.label}
          </button>
        ))}
      </div>

      {/* ── TIME LOG TAB ── */}
      {tab === 'entries' && (
        <>
          {/* Filters + summary */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={projectFilter} onChange={e => setProjectFilter(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              placeholder="From"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              placeholder="To"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {(fromDate || toDate || projectFilter) ? (
              <button onClick={() => { setFromDate(''); setToDate(''); setProjectFilter(0) }}
                className="text-xs text-gray-400 hover:text-gray-600">Clear filters</button>
            ) : null}
            {entries.length > 0 && (
              <span className="ml-auto text-sm text-gray-500">
                {entries.length} entries · <span className="font-medium">{formatDuration(totalMinutes)}</span> total
              </span>
            )}
          </div>

          {entriesLoading ? (
            <p className="text-sm text-gray-400">{t('common.loading')}</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Date', 'Project', 'Task', 'Description', 'Start', 'End', 'Duration', 'Billable', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
                  ) : entries.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{dateFromIso(e.date)}</td>
                      <td className="px-4 py-3 text-gray-600">{e.project.name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{e.task?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{e.description ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{timeFromIso(e.startTime)}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{timeFromIso(e.endTime)}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium font-mono text-xs">{formatDuration(e.durationMinutes)}</td>
                      <td className="px-4 py-3">
                        {e.isBillable
                          ? <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">Yes</span>
                          : <span className="text-gray-400 text-xs">No</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {!e.isLocked && <>
                          <button onClick={() => setEntryModal(e)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                          <button onClick={() => handleDeleteEntry(e.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                        </>}
                        {e.isLocked && <span className="text-gray-400 text-xs">Locked</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TIMESHEETS TAB ── */}
      {tab === 'timesheets' && (
        <>
          {/* ── SECTION 1: PENDING REVIEW (reviewers only) ── */}
          {isReviewer && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pending Review</h2>
                {pendingTimesheets.length > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    {pendingTimesheets.length}
                  </span>
                )}
              </div>
              {pendingLoading ? (
                <p className="text-sm text-gray-400">{t('common.loading')}</p>
              ) : pendingTimesheets.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No timesheets awaiting review.</p>
              ) : (
                <div className="bg-white rounded-xl border border-yellow-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-yellow-50 border-b border-yellow-100">
                      <tr>
                        {['Employee', 'Period', 'Entries', 'Total Hours', ''].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTimesheets.map(ts => {
                        const isExpanded = expandedTs === ts.id
                        const entries = expandedEntries[ts.id] ?? []
                        const totalMins = entries.reduce((s, e) => s + e.durationMinutes, 0)
                        return (
                          <React.Fragment key={ts.id}>
                            <tr
                              key={ts.id}
                              className={`border-b border-gray-100 cursor-pointer hover:bg-yellow-50 transition-colors ${isExpanded ? 'bg-yellow-50' : ''}`}
                              onClick={() => toggleExpand(ts)}
                            >
                              <td className="px-4 py-3 text-gray-700 font-medium">{ts.user?.name ?? '—'}</td>
                              <td className="px-4 py-3 text-gray-600">
                                {dateFromIso(ts.periodStart)} — {dateFromIso(ts.periodEnd)}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-center">{ts._count.timeEntries}</td>
                              <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                {isExpanded && entries.length > 0 ? formatDuration(totalMins) : '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs text-blue-500 font-medium">
                                  {expandLoading === ts.id ? 'Loading…' : isExpanded ? '▲ Collapse' : '▼ View entries'}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gray-50">
                                <td colSpan={5} className="px-4 py-3">
                                  {expandLoading === ts.id ? (
                                    <p className="text-xs text-gray-400 py-2">{t('common.loading')}</p>
                                  ) : entries.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-2">No time entries linked to this timesheet.</p>
                                  ) : (
                                    <>
                                      <table className="w-full text-xs mb-3">
                                        <thead>
                                          <tr className="text-gray-400 border-b border-gray-200">
                                            {['Date', 'Project', 'Task', 'Description', 'Start', 'End', 'Duration', 'Billable'].map(h => (
                                              <th key={h} className="text-left pb-2 pr-3 font-medium uppercase tracking-wide">{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {entries.map(e => (
                                            <tr key={e.id} className="hover:bg-white">
                                              <td className="py-2 pr-3 font-mono text-gray-600">{dateFromIso(e.date)}</td>
                                              <td className="py-2 pr-3 text-gray-700">{e.project.name}</td>
                                              <td className="py-2 pr-3 text-gray-500">{e.task?.name ?? '—'}</td>
                                              <td className="py-2 pr-3 text-gray-500 max-w-xs truncate">{e.description ?? '—'}</td>
                                              <td className="py-2 pr-3 font-mono text-gray-600">{timeFromIso(e.startTime)}</td>
                                              <td className="py-2 pr-3 font-mono text-gray-600">{timeFromIso(e.endTime)}</td>
                                              <td className="py-2 pr-3 font-mono font-medium text-gray-700">{formatDuration(e.durationMinutes)}</td>
                                              <td className="py-2">
                                                {e.isBillable
                                                  ? <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded">Yes</span>
                                                  : <span className="text-gray-400">No</span>}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <span className="text-xs text-gray-500 font-medium">
                                          {entries.length} entries · {formatDuration(totalMins)} total
                                          {entries.filter(e => e.isBillable).length > 0 && ` · ${formatDuration(entries.filter(e => e.isBillable).reduce((s, e) => s + e.durationMinutes, 0))} billable`}
                                        </span>
                                        <div className="flex gap-3">
                                          <button
                                            onClick={e => { e.stopPropagation(); handleApprove(ts) }}
                                            disabled={reviewSaving}
                                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={e => { e.stopPropagation(); setRejectTarget(ts); setRejectReason('') }}
                                            disabled={reviewSaving}
                                            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 2: APPROVED TIMESHEETS (reviewers only — billing reference) ── */}
          {isReviewer && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Approved Timesheets</h2>
                {approvedTimesheets.length > 0 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    {approvedTimesheets.length}
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-1">— billing reference</span>
              </div>
              {approvedLoading ? (
                <p className="text-sm text-gray-400">{t('common.loading')}</p>
              ) : approvedTimesheets.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No approved timesheets yet.</p>
              ) : (
                <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-green-50 border-b border-green-100">
                      <tr>
                        {['Employee', 'Period', 'Entries', 'Total Hours', 'Billable Hours', 'Approved By'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {approvedTimesheets.map(ts => {
                        const totalMins = ts.timeEntries.reduce((s: number, e: any) => s + e.durationMinutes, 0)
                        const billableMins = ts.timeEntries.filter((e: any) => e.isBillable).reduce((s: number, e: any) => s + e.durationMinutes, 0)
                        return (
                          <tr key={ts.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700 font-medium">{ts.user?.name ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{dateFromIso(ts.periodStart)} — {dateFromIso(ts.periodEnd)}</td>
                            <td className="px-4 py-3 text-gray-500 text-center">{ts._count.timeEntries}</td>
                            <td className="px-4 py-3 font-mono text-gray-700">{formatDuration(totalMins)}</td>
                            <td className="px-4 py-3 font-mono text-green-700">{formatDuration(billableMins)}</td>
                            <td className="px-4 py-3 text-gray-500">{ts.reviewedBy?.name ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 3: MY TIMESHEETS (all roles) ── */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              My Timesheets
              {timesheets.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full normal-case">{timesheets.length}</span>
              )}
            </h2>
            <button onClick={() => setTsModal(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
              + New Timesheet
            </button>
          </div>

          {tsLoading ? (
            <p className="text-sm text-gray-400">{t('common.loading')}</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Period', 'Entries', 'Status', 'Reviewed By', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timesheets.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
                  ) : timesheets.map(ts => {
                    const isExpanded = expandedTs === ts.id
                    const entries = expandedEntries[ts.id] ?? []
                    const totalMins = entries.reduce((s, e) => s + e.durationMinutes, 0)
                    return (
                      <React.Fragment key={ts.id}>
                        <tr
                          className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleExpand(ts)}
                        >
                          <td className="px-4 py-3 text-gray-700">
                            {dateFromIso(ts.periodStart)} — {dateFromIso(ts.periodEnd)}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-center">{ts._count.timeEntries}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TS_STATUS_COLORS[ts.status]}`}>
                              {ts.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{ts.reviewedBy?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {ts.status === 'DRAFT' && (
                              <button onClick={e => { e.stopPropagation(); handleTsSubmit(ts) }} className="text-blue-600 hover:underline text-xs">Submit</button>
                            )}
                            {ts.status === 'DRAFT' && (
                              <button onClick={e => { e.stopPropagation(); handleTsDelete(ts) }} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                            )}
                            {ts.status === 'REJECTED' && ts.rejectionReason && (
                              <span className="text-xs text-red-500 italic">"{ts.rejectionReason}"</span>
                            )}
                            <span className="text-xs text-blue-400 ml-1">
                              {expandLoading === ts.id ? '…' : isExpanded ? '▲' : '▼'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <td colSpan={5} className="px-4 py-3">
                              {expandLoading === ts.id ? (
                                <p className="text-xs text-gray-400 py-1">{t('common.loading')}</p>
                              ) : entries.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-1">No time entries found for this period.</p>
                              ) : (
                                <>
                                  <table className="w-full text-xs mb-2">
                                    <thead>
                                      <tr className="text-gray-400 border-b border-gray-200">
                                        {['Date', 'Project', 'Task', 'Description', 'Start', 'End', 'Duration', 'Billable'].map(h => (
                                          <th key={h} className="text-left pb-2 pr-3 font-medium uppercase tracking-wide">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {entries.map(e => (
                                        <tr key={e.id} className="hover:bg-white">
                                          <td className="py-2 pr-3 font-mono text-gray-600">{dateFromIso(e.date)}</td>
                                          <td className="py-2 pr-3 text-gray-700">{e.project.name}</td>
                                          <td className="py-2 pr-3 text-gray-500">{e.task?.name ?? '—'}</td>
                                          <td className="py-2 pr-3 text-gray-500 max-w-xs truncate">{e.description ?? '—'}</td>
                                          <td className="py-2 pr-3 font-mono text-gray-600">{timeFromIso(e.startTime)}</td>
                                          <td className="py-2 pr-3 font-mono text-gray-600">{timeFromIso(e.endTime)}</td>
                                          <td className="py-2 pr-3 font-mono font-medium text-gray-700">{formatDuration(e.durationMinutes)}</td>
                                          <td className="py-2">
                                            {e.isBillable
                                              ? <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded">Yes</span>
                                              : <span className="text-gray-400">No</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <p className="text-xs text-gray-500 pt-1 border-t border-gray-200">
                                    {entries.length} entries · {formatDuration(totalMins)} total
                                    {entries.filter(e => e.isBillable).length > 0 && ` · ${formatDuration(entries.filter(e => e.isBillable).reduce((s, e) => s + e.durationMinutes, 0))} billable`}
                                  </p>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Time Entry modal */}
      {entryModal !== null && (
        <TimeEntryModal
          entry={entryModal === 'create' ? null : entryModal}
          projects={projects}
          prefill={entryModal === 'create' ? timerPrefill : undefined}
          onClose={() => { setEntryModal(null); setTimerPrefill(undefined) }}
          onSaved={() => { loadEntries(); setEntryModal(null); setTimerPrefill(undefined) }}
        />
      )}

      {/* Reject Timesheet modal */}
      {rejectTarget && (
        <Modal title="Reject Timesheet" onClose={() => setRejectTarget(null)}>
          <p className="text-sm text-gray-600 mb-3">
            Rejecting timesheet for <span className="font-medium">{rejectTarget.user?.name}</span>
            {' '}({dateFromIso(rejectTarget.periodStart)} — {dateFromIso(rejectTarget.periodEnd)})
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain why this timesheet is being rejected..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setRejectTarget(null)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleReject}
              disabled={reviewSaving || !rejectReason.trim()}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {reviewSaving ? t('common.loading') : 'Reject Timesheet'}
            </button>
          </div>
        </Modal>
      )}

      {/* New Timesheet modal */}
      {tsModal && (
        <Modal title="New Timesheet" onClose={() => setTsModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Period Start *</label>
              <input type="date" value={tsForm.periodStart} onChange={e => setTsForm(p => ({ ...p, periodStart: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Period End *</label>
              <input type="date" value={tsForm.periodEnd} onChange={e => setTsForm(p => ({ ...p, periodEnd: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setTsModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleCreateTs} disabled={tsSaving || !tsForm.periodStart || !tsForm.periodEnd}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {tsSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
