import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { ProjectForm } from '../components/forms/project-form.js';
import { TagPicker } from '../components/tags/tag-picker.js';
import { BacklinksPanel } from '../components/links/backlinks-panel.js';
import {
  useProject,
  useUpdateProject,
  useArchiveProject,
  useUnarchiveProject,
} from '../hooks/use-projects.js';
import { useTasks } from '../hooks/use-tasks.js';
import type { ProjectCreate } from '@lifeos/shared';

export default function ProjectDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = useProject(id);
  const updateProject = useUpdateProject();
  const archive = useArchiveProject();
  const unarchive = useUnarchiveProject();
  const tasks = useTasks({ project_id: id });

  const [editing, setEditing] = useState(false);

  if (project.isLoading) return <CenteredSpinner />;
  if (project.isError || !project.data) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load project. <Link to="/projects" className="text-blue-600">Back</Link>
      </div>
    );
  }

  const p = project.data;
  const isArchived = p.archived_at !== null;

  async function handleUpdate(values: ProjectCreate): Promise<void> {
    if (!id) return;
    await updateProject.mutateAsync({ id, body: values });
    setEditing(false);
  }

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={`${p.status}${p.description ? ` — ${p.description}` : ''}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {isArchived ? (
              <Button onClick={() => unarchive.mutate(p.id)}>Restore</Button>
            ) : (
              <Button
                variant="danger"
                onClick={async () => {
                  await archive.mutateAsync(p.id);
                  navigate('/projects');
                }}
              >
                Archive
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div>
            <div className="text-xs uppercase text-slate-500">Status</div>
            <div>{p.status}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Target date</div>
            <div>{formatDate(p.target_date)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Priority score</div>
            <div>{p.priority_score.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Area</div>
            <div>
              {p.area_id ? (
                <Link to={`/areas/${p.area_id}`} className="text-blue-600">
                  Open area
                </Link>
              ) : (
                <span className="text-slate-400">none</span>
              )}
            </div>
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tasks ({tasks.data?.length ?? 0})
          </h3>
          {tasks.data && tasks.data.length > 0 ? (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {tasks.data.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/tasks/${t.id}`}
                    className="flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    <span>{t.title}</span>
                    <span className="text-xs text-slate-400">{t.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-xs text-slate-500">
              No tasks yet.
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tags
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <TagPicker entity_type="project" entity_id={p.id} />
          </div>
        </div>
        <BacklinksPanel entity_type="project" entity_id={p.id} />
      </div>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit project"
      >
        <ProjectForm
          initial={p}
          submitLabel="Save"
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}
