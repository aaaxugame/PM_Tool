import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { tasksApi, type Task, type TaskStatus } from '../../api/tasks'
import { projectsApi, type Project } from '../../api/projects'
import { useAuth } from '../../store/authContext'
import Modal from '../../components/Modal'
import TaskModal from './TaskModal'
import KanbanBoard from './KanbanBoard'
import { STATUS_TABS, STATUS_COLORS, PRIORITY_COLORS, STATUS_CYCLE } from './taskConstants'

export default function TasksPage() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const isManagerRole = hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('ACCOUNT_MANAGER') || hasRole('PROJECT_MANAGER')
  const isVendorRole = hasRole('CONTRACTOR') || hasRole('VENDOR_CONTACT')

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [manageableProjects, setManageableProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL')
  const [projectFilter, setProjectFilter] = useState<number>(0)
  const [modal, setModal] = useState<null | 'create' | Task>(null)
  const [view, setView] = useState<'table' | 'board'>('board')

  const manageableProjectIds = new Set(manageableProjects.map(p => p.id))
  const canManageTask = (task: Task) => isManagerRole || manageableProjectIds.has(task.projectId)

  const load = async () => {
    const filters = {
      ...(view === 'table' && statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      ...(projectFilter ? { projectId: projectFilter } : {}),
    }
    await tasksApi.list(filters).then(r => setTasks(r.data))
    setLoading(false)
  }

  useEffect(() => {
    projectsApi.list().then(r => setProjects(r.data))
    if (isManagerRole) {
      projectsApi.list().then(r => setManageableProjects(r.data))
    } else if (isVendorRole) {
      projectsApi.listVendor(false).then(r => setManageableProjects(r.data))
    } else {
      projectsApi.listMine().then(r => setManageableProjects(r.data))
    }
  }, [])

  useEffect(() => { load() }, [statusFilter, projectFilter, view])

  const handleStatusCycle = async (task: Task) => {
    await tasksApi.update(task.id, { status: STATUS_CYCLE[task.status] })
    load()
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    await tasksApi.update(task.id, { status })
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return
    await tasksApi.remove(id)
    load()
  }

  const closeModal = () => setModal(null)
  const onSaved = () => { load(); closeModal() }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{t('nav.tasks')}</h1>
        {(isManagerRole || manageableProjects.length > 0) && (
          <button onClick={() => setModal('create')} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
            + {t('common.create')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['board', 'table'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                view === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {v}
            </button>
          ))}
        </div>

        {/* Status tabs (table view only) */}
        {view === 'table' && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {STATUS_TABS.map(tab => (
              <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Project filter */}
        <select value={projectFilter} onChange={e => setProjectFilter(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value={0}>All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : view === 'board' ? (
        <KanbanBoard
          tasks={tasks}
          canManage={canManageTask}
          onStatusChange={handleStatusChange}
          onEdit={task => setModal(task)}
          onDelete={handleDelete}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Task', 'Project', 'Milestone', 'Assignee', 'Priority', 'Due Date', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              ) : tasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`font-medium text-gray-800 ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}>
                      {task.name}
                    </span>
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{task.project.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{task.milestone?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{task.assignee?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{task.dueDate ? task.dueDate.slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3">
                    {canManageTask(task) ? (
                      <button onClick={() => handleStatusCycle(task)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${STATUS_COLORS[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </button>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {canManageTask(task) && (
                      <>
                        <button onClick={() => setModal(task)} className="text-blue-600 hover:underline text-xs">{t('common.edit')}</button>
                        <button onClick={() => handleDelete(task.id)} className="text-red-500 hover:underline text-xs">{t('common.delete')}</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          projects={isManagerRole ? projects : manageableProjects}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
