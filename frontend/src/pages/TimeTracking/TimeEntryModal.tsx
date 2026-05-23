import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { timeEntriesApi, type TimeEntry, timeFromIso, dateFromIso } from '../../api/timeTracking'
import { tasksApi, type Task } from '../../api/tasks'
import type { Project } from '../../api/projects'
import Modal from '../../components/Modal'

interface Props {
  entry: TimeEntry | null
  projects: Project[]
  prefill?: { startTime?: string; endTime?: string }
  onClose: () => void
  onSaved: () => void
}

const today = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toTimeString().slice(0, 5)

const EMPTY = {
  date: today(),
  startTime: '',
  endTime: '',
  description: '',
  projectId: 0,
  taskId: 0,
  isBillable: true,
}

export default function TimeEntryModal({ entry, projects, prefill, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)
  const [tasks, setTasks] = useState<Task[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setForm({
        date: dateFromIso(entry.date),
        startTime: timeFromIso(entry.startTime),
        endTime: timeFromIso(entry.endTime),
        description: entry.description ?? '',
        projectId: entry.projectId,
        taskId: entry.taskId ?? 0,
        isBillable: entry.isBillable,
      })
    } else if (prefill) {
      setForm(p => ({
        ...p,
        startTime: prefill.startTime ?? '',
        endTime: prefill.endTime ?? '',
      }))
    }
  }, [entry, prefill])

  useEffect(() => {
    if (form.projectId) {
      tasksApi.list({ projectId: form.projectId }).then(r => setTasks(r.data))
    } else {
      setTasks([])
    }
  }, [form.projectId])

  const set = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }))

  const durationMinutes = (() => {
    if (!form.startTime || !form.endTime) return null
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const d = (eh * 60 + em) - (sh * 60 + sm)
    return d > 0 ? d : null
  })()

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== 0 && v !== undefined)
      )
      if (entry) await timeEntriesApi.update(entry.id, payload)
      else await timeEntriesApi.create(payload)
      onSaved()
    } finally { setSaving(false) }
  }

  const isValid = !!form.date && !!form.startTime && !!form.endTime && !!form.projectId && (durationMinutes ?? 0) > 0

  return (
    <Modal title={entry ? 'Edit Time Entry' : 'Log Time'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start *</label>
            <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End *</label>
            <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {durationMinutes !== null && (
          <p className="text-xs text-blue-600 font-medium">
            Duration: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
          </p>
        )}
        {form.startTime && form.endTime && durationMinutes === null && (
          <p className="text-xs text-red-500">End time must be after start time</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project *</label>
            <select value={form.projectId} onChange={e => { set('projectId', Number(e.target.value)); set('taskId', 0) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>— select —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Task</label>
            <select value={form.taskId} onChange={e => set('taskId', Number(e.target.value))}
              disabled={!form.projectId || tasks.length === 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
              <option value={0}>— none —</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="What did you work on?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.isBillable} onChange={e => set('isBillable', e.target.checked)} />
          Billable
        </label>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving || !isValid}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </Modal>
  )
}
