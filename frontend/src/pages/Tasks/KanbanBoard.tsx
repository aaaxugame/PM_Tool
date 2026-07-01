import { useState } from 'react'
import type { Task, TaskStatus } from '../../api/tasks'
import { BOARD_COLUMNS, PRIORITY_COLORS } from './taskConstants'

interface KanbanBoardProps {
  tasks: Task[]
  canManage: (task: Task) => boolean
  onStatusChange: (task: Task, status: TaskStatus) => void
  onEdit: (task: Task) => void
  onDelete: (id: number) => void
}

export default function KanbanBoard({ tasks, canManage, onStatusChange, onEdit, onDelete }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)

  const handleDrop = (status: TaskStatus) => {
    const task = tasks.find(t => t.id === draggingId)
    if (task && task.status !== status && canManage(task)) onStatusChange(task, status)
    setDraggingId(null)
    setDragOverColumn(null)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {BOARD_COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key)
        return (
          <div
            key={col.key}
            onDragOver={e => { e.preventDefault(); setDragOverColumn(col.key) }}
            onDragLeave={() => setDragOverColumn(prev => (prev === col.key ? null : prev))}
            onDrop={e => { e.preventDefault(); handleDrop(col.key) }}
            className={`rounded-xl border bg-gray-50 p-2 min-h-[200px] transition-colors ${
              dragOverColumn === col.key ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1.5 mb-2">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{col.label}</h3>
              <span className="text-xs text-gray-400">{colTasks.length}</span>
            </div>

            <div className="space-y-2">
              {colTasks.map(task => {
                const manageable = canManage(task)
                return (
                <div
                  key={task.id}
                  draggable={manageable}
                  onDragStart={() => manageable && setDraggingId(task.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverColumn(null) }}
                  onClick={() => manageable && onEdit(task)}
                  className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm transition-shadow ${
                    manageable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                  } ${draggingId === task.id ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium text-gray-800 ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}>
                      {task.name}
                    </p>
                    {manageable && (
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(task.id) }}
                        className="text-gray-300 hover:text-red-500 text-xs shrink-0"
                        title="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">{task.project.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-gray-400">{task.dueDate ? task.dueDate.slice(0, 10) : ''}</span>
                  </div>
                  {task.assignee && (
                    <p className="text-xs text-gray-500 mt-1">👤 {task.assignee.name}</p>
                  )}
                </div>
                )
              })}
              {colTasks.length === 0 && (
                <p className="text-xs text-gray-300 text-center py-6">No tasks</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
