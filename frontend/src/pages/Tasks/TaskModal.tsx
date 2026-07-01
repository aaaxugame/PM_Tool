import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { tasksApi, type Task, type TaskStatus, type Priority } from '../../api/tasks'
import { milestonesApi, projectMembersApi, type Milestone } from '../../api/projects'
import type { Project } from '../../api/projects'
import Modal from '../../components/Modal'

interface AssignableUser {
  id: number
  name: string
  email: string
}

interface Props {
  task: Task | null
  projects: Project[]
  defaultProjectId?: number
  defaultMilestoneId?: number
  onClose: () => void
  onSaved: () => void
}

const EMPTY = {
  name: '',
  description: '',
  status: 'TODO' as TaskStatus,
  priority: 'MEDIUM' as Priority,
  projectId: 0,
  milestoneId: 0,
  assigneeId: 0,
  dueDate: '',
  estimatedHours: '',
  isBillable: true,
}

export default function TaskModal({ task, projects, defaultProjectId, defaultMilestoneId, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        milestoneId: task.milestoneId ?? 0,
        assigneeId: task.assigneeId ?? 0,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        estimatedHours: task.estimatedHours ?? '',
        isBillable: task.isBillable,
      })
    } else {
      setForm(p => ({
        ...p,
        projectId: defaultProjectId ?? 0,
        milestoneId: defaultMilestoneId ?? 0,
      }))
    }
  }, [task, defaultProjectId, defaultMilestoneId])

  useEffect(() => {
    if (form.projectId) {
      milestonesApi.list(form.projectId).then(r => setMilestones(r.data))
      projectMembersApi.listAssignableUsers(form.projectId).then(r => {
        const list = r.data
        if (task?.assignee && task.projectId === form.projectId && !list.some(u => u.id === task.assignee!.id)) {
          list.push({ ...task.assignee, email: '' })
        }
        setAssignableUsers(list)
      })
    } else {
      setMilestones([])
      setAssignableUsers([])
    }
  }, [form.projectId])

  const set = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== 0 && v !== undefined)
      )
      if (task) await tasksApi.update(task.id, payload)
      else await tasksApi.create(payload)
      onSaved()
    } finally { setSaving(false) }
  }

  const isValid = !!form.name && !!form.projectId

  return (
    <Modal title={task ? 'Edit Task' : 'New Task'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project *</label>
            <select value={form.projectId} onChange={e => { set('projectId', Number(e.target.value)); set('milestoneId', 0) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>— select —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Milestone</label>
            <select value={form.milestoneId} onChange={e => set('milestoneId', Number(e.target.value))}
              disabled={!form.projectId || milestones.length === 0 || !!defaultMilestoneId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
              <option value={0}>— none —</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assignee</label>
            <select value={form.assigneeId} onChange={e => set('assigneeId', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>— unassigned —</option>
              {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Hours</label>
            <input type="number" min="0" step="0.5" value={form.estimatedHours}
              onChange={e => set('estimatedHours', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.isBillable} onChange={e => set('isBillable', e.target.checked)} />
              Billable
            </label>
          </div>
        </div>
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
