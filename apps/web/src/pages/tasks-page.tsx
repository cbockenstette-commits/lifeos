import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { Select } from '../components/ui/input.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { ListItemRow } from '../components/ui/list-item-row.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import {
  ArchiveToggle,
  useIncludeArchived,
} from '../components/ui/archive-toggle.js';
import { TaskForm } from '../components/forms/task-form.js';
import {
  useTasks,
  useCreateTask,
  useArchiveTask,
  useUnarchiveTask,
} from '../hooks/use-tasks.js';
import type { TaskCreate } from '@lifeos/shared';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;

export default function TasksPage(): JSX.Element {
  const { includeArchived } = useIncludeArchived();
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get('status') ?? undefined;
  const navigate = useNavigate();

  const tasks = useTasks({ includeArchived, status: statusFilter });
  const createTask = useCreateTask();
  const archive = useArchiveTask();
  const unarchive = useUnarchiveTask();

  const [creating, setCreating] = useState(false);

  function setParam(key: string, value: string): void {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  async function handleCreate(values: TaskCreate): Promise<void> {
    await createTask.mutateAsync(values);
    setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Everything you're doing"
        actions={
          <div className="flex items-center gap-4">
            <ArchiveToggle />
            <Button onClick={() => setCreating(true)}>+ New task</Button>
          </div>
        }
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <div className="mb-1 text-xs uppercase text-slate-500">Status</div>
            <Select
              value={statusFilter ?? ''}
              onChange={(e) => setParam('status', e.target.value)}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {tasks.isLoading ? (
          <CenteredSpinner />
        ) : !tasks.data || tasks.data.length === 0 ? (
          <EmptyState
            title="No tasks match this filter"
            action={<Button onClick={() => setCreating(true)}>+ New task</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {tasks.data.map((t) => (
              <ListItemRow
                key={t.id}
                title={t.title}
                subtitle={[t.status, dueLabel(t.due_date)]
                  .filter(Boolean)
                  .join(' · ')}
                meta={
                  <span>
                    ⚡{t.urgency} · ✨{t.importance}
                  </span>
                }
                archived={t.archived_at !== null}
                onClick={() => navigate(`/tasks/${t.id}`)}
                actions={
                  t.archived_at ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => unarchive.mutate(t.id)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => archive.mutate(t.id)}
                    >
                      Archive
                    </Button>
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title="New task">
        <TaskForm
          submitLabel="Create"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </>
  );
}

function dueLabel(value: string | Date | null): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return `due ${d.toISOString().slice(0, 10)}`;
}
