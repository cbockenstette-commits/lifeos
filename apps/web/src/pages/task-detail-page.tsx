import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { TaskForm } from '../components/forms/task-form.js';
import { TagPicker } from '../components/tags/tag-picker.js';
import { BacklinksPanel } from '../components/links/backlinks-panel.js';
import {
  useTask,
  useUpdateTask,
  useArchiveTask,
  useUnarchiveTask,
} from '../hooks/use-tasks.js';
import type { TaskCreate, TaskUpdate } from '@lifeos/shared';

export default function TaskDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const task = useTask(id);
  const updateTask = useUpdateTask();
  const archive = useArchiveTask();
  const unarchive = useUnarchiveTask();

  const [editing, setEditing] = useState(false);

  if (task.isLoading) return <CenteredSpinner />;
  if (task.isError || !task.data) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load task.{' '}
        <Link to="/tasks" className="text-blue-600">
          Back
        </Link>
      </div>
    );
  }

  const t = task.data;
  const isArchived = t.archived_at !== null;

  async function handleUpdate(values: TaskCreate): Promise<void> {
    if (!id) return;
    // The form produces the create shape; for update we only send the fields
    // that actually go in TaskUpdate. They're structurally compatible.
    const body: TaskUpdate = {
      title: values.title,
      description: values.description,
      project_id: values.project_id,
      area_id: values.area_id,
      parent_id: values.parent_id,
      sprint_id: values.sprint_id,
      status: values.status,
      urgency: values.urgency,
      importance: values.importance,
      estimate_minutes: values.estimate_minutes,
      due_date: values.due_date,
    };
    await updateTask.mutateAsync({ id, body });
    setEditing(false);
  }

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.description ?? undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {isArchived ? (
              <Button onClick={() => unarchive.mutate(t.id)}>Restore</Button>
            ) : (
              <Button
                variant="danger"
                onClick={async () => {
                  await archive.mutateAsync(t.id);
                  navigate('/tasks');
                }}
              >
                Archive
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm md:grid-cols-4">
          <Stat label="Status" value={t.status} />
          <Stat label="Urgency" value={String(t.urgency)} />
          <Stat label="Importance" value={String(t.importance)} />
          <Stat label="Priority score" value={t.priority_score.toFixed(2)} />
          <Stat label="Estimate" value={t.estimate_minutes ? `${t.estimate_minutes}m` : '—'} />
          <Stat label="Due date" value={formatDate(t.due_date)} />
          <Stat
            label="Parent"
            value={
              t.project_id ? (
                <Link to={`/projects/${t.project_id}`} className="text-blue-600">
                  Project
                </Link>
              ) : t.area_id ? (
                <Link to={`/areas/${t.area_id}`} className="text-blue-600">
                  Area
                </Link>
              ) : (
                '—'
              )
            }
          />
          <Stat label="Sprint" value={t.sprint_id ? t.sprint_id.slice(0, 8) : '—'} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tags
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <TagPicker entity_type="task" entity_id={t.id} />
          </div>
        </div>
        <BacklinksPanel entity_type="task" entity_id={t.id} />
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit task">
        <TaskForm
          initial={t}
          submitLabel="Save"
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}
