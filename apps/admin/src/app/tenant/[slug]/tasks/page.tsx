"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { fetchMyTenants, fetchTenantTasks, createTask, updateTask, deleteTask, type Task } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { KanbanBoard, KanbanColumn, KanbanTask } from '@repo/ui';
import { Modal, Button, Input, Select, Card, CardContent, CardHeader, CardTitle, Form } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
});

export default function TasksPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    assignedToId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }>({});
  const { push } = useToast();

  const loadTasks = useCallback(async (tenantId: string) => {
    try {
      const data = await fetchTenantTasks(tenantId, filters);
      setTasks(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    }
  }, [filters]);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyTenants();
        const tenant = list.find((x) => x.tenant.slug === slug) || null;
        if (!tenant) throw new Error('Tenant not found');
        setTenant(tenant);
        await loadTasks(tenant.tenantId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tenant');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, loadTasks]);

  const handleTaskMove = async (taskId: string, newStatus: string) => {
    if (!tenant) return;
    try {
      await updateTask(tenant.tenantId, taskId, { status: newStatus });
      await loadTasks(tenant.tenantId);
      push({ tone: 'success', message: 'Task updated' });
    } catch (e) {
      push({ tone: 'error', message: e instanceof Error ? e.message : 'Failed to update task' });
    }
  };

  const handleCreateTask = async (data: Record<string, unknown>) => {
    if (!tenant) return;
    try {
      await createTask(tenant.tenantId, {
        title: String(data.title),
        description: data.description ? String(data.description) : undefined,
        priority: String(data.priority || 'MEDIUM'),
        assignedToId: data.assignedToId ? String(data.assignedToId) : undefined,
        dueDate: data.dueDate ? String(data.dueDate) : undefined,
      });
      setIsCreateModalOpen(false);
      await loadTasks(tenant.tenantId);
      push({ tone: 'success', message: 'Task created' });
    } catch (e) {
      push({ tone: 'error', message: e instanceof Error ? e.message : 'Failed to create task' });
    }
  };

  const handleTaskClick = (task: KanbanTask) => {
    const fullTask = tasks.find(t => t.id === task.id);
    if (fullTask) setSelectedTask(fullTask);
  };

  const columns: KanbanColumn[] = [
    {
      id: 'pending',
      title: 'Pending',
      status: 'PENDING',
      tasks: tasks.filter(t => t.status === 'PENDING').map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedToName,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        contentEntryId: t.contentEntryId,
        collectionItemId: t.collectionItemId,
      })),
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      status: 'IN_PROGRESS',
      tasks: tasks.filter(t => t.status === 'IN_PROGRESS').map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedToName,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        contentEntryId: t.contentEntryId,
        collectionItemId: t.collectionItemId,
      })),
    },
    {
      id: 'completed',
      title: 'Completed',
      status: 'COMPLETED',
      tasks: tasks.filter(t => t.status === 'COMPLETED').map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedToName,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        contentEntryId: t.contentEntryId,
        collectionItemId: t.collectionItemId,
      })),
    },
    {
      id: 'cancelled',
      title: 'Cancelled',
      status: 'CANCELLED',
      tasks: tasks.filter(t => t.status === 'CANCELLED').map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedToName,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        contentEntryId: t.contentEntryId,
        collectionItemId: t.collectionItemId,
      })),
    },
  ];

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error || !tenant) {
    return <div className="p-6 text-red-600">{error || 'Tenant not found'}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>Create Task</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <Select
              label="Status"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              options={[
                { value: '', label: 'All' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            <Select
              label="Priority"
              value={filters.priority || ''}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined })}
              options={[
                { value: '', label: 'All' },
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />
            <Input
              type="date"
              label="Due Date From"
              value={filters.dueDateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dueDateFrom: e.target.value || undefined })}
            />
            <Input
              type="date"
              label="Due Date To"
              value={filters.dueDateTo || ''}
              onChange={(e) => setFilters({ ...filters, dueDateTo: e.target.value || undefined })}
            />
          </div>
        </CardContent>
      </Card>

      <KanbanBoard columns={columns} onTaskMove={handleTaskMove} onTaskClick={handleTaskClick} />

      {/* Create Task Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Task">
        <Form
          schema={taskSchema}
          fields={[
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            {
              name: 'priority',
              label: 'Priority',
              type: 'select',
              options: [
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ],
            },
            { name: 'dueDate', label: 'Due Date', type: 'date' },
          ]}
          onSubmit={handleCreateTask}
          submitLabel="Create"
        />
      </Modal>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask.title}>
          <div className="space-y-4">
            <div>
              <strong>Status:</strong> {selectedTask.status}
            </div>
            <div>
              <strong>Priority:</strong> {selectedTask.priority}
            </div>
            {selectedTask.description && (
              <div>
                <strong>Description:</strong>
                <p>{selectedTask.description}</p>
              </div>
            )}
            {selectedTask.dueDate && (
              <div>
                <strong>Due Date:</strong> {new Date(selectedTask.dueDate).toLocaleDateString()}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedTask.status !== 'IN_PROGRESS') {
                    handleTaskMove(selectedTask.id, 'IN_PROGRESS');
                  }
                }}
              >
                Start
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedTask.status !== 'COMPLETED') {
                    handleTaskMove(selectedTask.id, 'COMPLETED');
                  }
                }}
              >
                Complete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}




