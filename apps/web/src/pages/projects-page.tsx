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
import { ProjectForm } from '../components/forms/project-form.js';
import { useAreas } from '../hooks/use-areas.js';
import {
  useProjects,
  useCreateProject,
  useArchiveProject,
  useUnarchiveProject,
} from '../hooks/use-projects.js';
import type { ProjectCreate } from '@lifeos/shared';

export default function ProjectsPage(): JSX.Element {
  const { includeArchived } = useIncludeArchived();
  const [params, setParams] = useSearchParams();
  const areaFilter = params.get('area') ?? undefined;
  const statusFilter = params.get('status') ?? undefined;
  const navigate = useNavigate();

  const areas = useAreas();
  const projects = useProjects({
    includeArchived,
    area_id: areaFilter,
    status: statusFilter,
  });
  const createProject = useCreateProject();
  const archive = useArchiveProject();
  const unarchive = useUnarchiveProject();

  const [creating, setCreating] = useState(false);

  function setParam(key: string, value: string): void {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  async function handleCreate(values: ProjectCreate): Promise<void> {
    await createProject.mutateAsync(values);
    setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Completable outcomes"
        actions={
          <div className="flex items-center gap-4">
            <ArchiveToggle />
            <Button onClick={() => setCreating(true)}>+ New project</Button>
          </div>
        }
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <div className="mb-1 text-xs uppercase text-slate-500">Area</div>
            <Select
              value={areaFilter ?? ''}
              onChange={(e) => setParam('area', e.target.value)}
            >
              <option value="">All areas</option>
              {areas.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-slate-500">Status</div>
            <Select
              value={statusFilter ?? ''}
              onChange={(e) => setParam('status', e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="not_started">not started</option>
              <option value="active">active</option>
              <option value="blocked">blocked</option>
              <option value="complete">complete</option>
            </Select>
          </div>
        </div>
        {projects.isLoading ? (
          <CenteredSpinner />
        ) : !projects.data || projects.data.length === 0 ? (
          <EmptyState
            title="No projects match this filter"
            action={<Button onClick={() => setCreating(true)}>+ New project</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {projects.data.map((p) => (
              <ListItemRow
                key={p.id}
                title={p.name}
                subtitle={p.description ?? undefined}
                meta={<span className="uppercase">{p.status}</span>}
                archived={p.archived_at !== null}
                onClick={() => navigate(`/projects/${p.id}`)}
                actions={
                  p.archived_at ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => unarchive.mutate(p.id)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => archive.mutate(p.id)}
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
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New project"
      >
        <ProjectForm
          defaultAreaId={areaFilter}
          submitLabel="Create"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </>
  );
}
