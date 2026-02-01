import React, { useState } from 'react';
import { Card, CardContent } from '../index';
import { clsx } from 'clsx';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignedToId?: string;
  assignedToName?: string;
  dueDate?: string;
  createdAt: string;
  contentEntryId?: string;
  collectionItemId?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  tasks: KanbanTask[];
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  onTaskMove?: (taskId: string, newStatus: string) => void | Promise<void>;
  onTaskClick?: (task: KanbanTask) => void;
  className?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  onTaskMove,
  onTaskClick,
  className,
}) => {
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState<string | null>(null);

  const handleDragStart = (task: KanbanTask, columnId: string) => {
    setDraggedTask(task);
    setDraggedFromColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnStatus: string) => {
    if (!draggedTask || !draggedFromColumn || draggedTask.status === columnStatus) {
      setDraggedTask(null);
      setDraggedFromColumn(null);
      return;
    }

    if (onTaskMove) {
      await onTaskMove(draggedTask.id, columnStatus);
    }

    setDraggedTask(null);
    setDraggedFromColumn(null);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-surface text-foreground border-border';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    const d = new Date(date);
    const today = new Date();
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Overdue (${Math.abs(diffDays)}d)`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays}d`;
    return d.toLocaleDateString();
  };

  return (
    <div className={clsx('flex gap-4 overflow-x-auto pb-4', className)}>
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 w-80"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(column.status)}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-lg">{column.title}</h3>
            <span className="text-sm text-muted bg-surface px-2 py-1 rounded">
              {column.tasks.length}
            </span>
          </div>
          <div className="space-y-2 min-h-[400px]">
            {column.tasks.map((task) => (
              <Card
                key={task.id}
                variant="interactive"
                className={clsx(
                  'cursor-pointer transition-all',
                  draggedTask?.id === task.id && 'opacity-50'
                )}
                draggable
                onDragStart={() => handleDragStart(task, column.id)}
                onClick={() => onTaskClick?.(task)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                    {task.priority && (
                      <span className={clsx('text-xs px-1.5 py-0.5 rounded border', getPriorityColor(task.priority))}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted mb-2 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted">
                    {task.assignedToName && (
                      <span>{task.assignedToName}</span>
                    )}
                    {task.dueDate && (
                      <span className={clsx(
                        'font-medium',
                        new Date(task.dueDate) < new Date() && 'text-red-600'
                      )}>
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {column.tasks.length === 0 && (
              <div className="text-center text-muted text-sm py-8 border-2 border-dashed rounded-lg">
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

