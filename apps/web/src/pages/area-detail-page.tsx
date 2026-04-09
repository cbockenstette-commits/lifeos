import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { AreaForm } from '../components/forms/area-form.js';
import {
  useArea,
  useUpdateArea,
  useArchiveArea,
  useUnarchiveArea,
} from '../hooks/use-areas.js';
import { useProjects } from '../hooks/use-projects.js';
import { useResources } from '../hooks/use-resources.js';
import { useTasks } from '../hooks/use-tasks.js';
import type { AreaCreate } from '@lifeos/shared';

export default function AreaDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const area = useArea(id);
  const updateArea = useUpdateArea();
  const archive = useArchiveArea();
  const unarchive = useUnarchiveArea();
  const projects = useProjects({ area_id: id });
  const tasks = useTasks({ area_id: id });
  const resources = useResources({ area_id: id });

  const [editing, setEditing] = useState(false);

  if (area.isLoading) return <CenteredSpinner />;
  if (area.isError || !area.data) {
    return (
      <div className="p-6">
        <div className="text-sm text-red-600">
          Failed to load area: {(area.error as Error)?.message ?? 'not found'}
        </div>
        <Link to="/areas" className="mt-2 inline-block text-sm text-blue-600">
          ← Back to areas
        </Link>
      </div>
    );
  }

  const a = area.data;
  const isArchived = a.archived_at !== null;

  async function handleUpdate(values: AreaCreate): Promise<void> {
    if (!id) return;
    await updateArea.mutateAsync({ id, body: values });
    setEditing(false);
  }

  return (
    <>
      <PageHeader
        title={a.name}
        subtitle={a.description ?? undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {isArchived ? (
              <Button onClick={() => unarchive.mutate(a.id)}>Restore</Button>
            ) : (
              <Button
                variant="danger"
                onClick={async () => {
                  await archive.mutateAsync(a.id);
                  navigate('/areas');
                }}
              >
                Archive
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <Section title="Projects">
          {projects.data && projects.data.length > 0 ? (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {projects.data.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    className="block px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyInline>No projects in this area yet.</EmptyInline>
          )}
        </Section>
        <Section title="Standalone tasks">
          {tasks.data && tasks.data.length > 0 ? (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {tasks.data.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/tasks/${t.id}`}
                    className="block px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    {t.title}
                    <span className="ml-2 text-xs text-slate-400">
                      {t.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyInline>No standalone tasks in this area.</EmptyInline>
          )}
        </Section>
        <Section title="Resources">
          {resources.data && resources.data.length > 0 ? (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {resources.data.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/resources/${r.id}`}
                    className="block px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    {r.title}
                    <span className="ml-2 text-xs text-slate-400">
                      {r.source_kind}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyInline>No resources in this area.</EmptyInline>
          )}
        </Section>
        <Section title="Linked entities">
          <EmptyInline>Backlinks + tag display land in P7.</EmptyInline>
        </Section>
      </div>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit area"
      >
        <AreaForm
          initial={a}
          submitLabel="Save"
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyInline({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-xs text-slate-500">
      {children}
    </div>
  );
}
