import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { ListItemRow } from '../components/ui/list-item-row.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import {
  ArchiveToggle,
  useIncludeArchived,
} from '../components/ui/archive-toggle.js';
import { ResourceForm } from '../components/forms/resource-form.js';
import {
  useResources,
  useCreateResource,
  useArchiveResource,
  useUnarchiveResource,
} from '../hooks/use-resources.js';
import type { ResourceCreate } from '@lifeos/shared';

export default function ResourcesPage(): JSX.Element {
  const { includeArchived } = useIncludeArchived();
  const navigate = useNavigate();
  const resources = useResources({ includeArchived });
  const createResource = useCreateResource();
  const archive = useArchiveResource();
  const unarchive = useUnarchiveResource();

  const [creating, setCreating] = useState(false);

  async function handleCreate(values: ResourceCreate): Promise<void> {
    await createResource.mutateAsync(values);
    setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="Resources"
        subtitle="Notes, URLs, clippings"
        actions={
          <div className="flex items-center gap-4">
            <ArchiveToggle />
            <Button onClick={() => setCreating(true)}>+ New resource</Button>
          </div>
        }
      />
      <div className="p-6">
        {resources.isLoading ? (
          <CenteredSpinner />
        ) : !resources.data || resources.data.length === 0 ? (
          <EmptyState
            title="No resources yet"
            description="Save URLs, notes, and clippings for future reference."
            action={<Button onClick={() => setCreating(true)}>+ New resource</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {resources.data.map((r) => (
              <ListItemRow
                key={r.id}
                title={r.title}
                subtitle={r.url ?? r.body_md?.slice(0, 120) ?? undefined}
                meta={<span className="uppercase">{r.source_kind}</span>}
                archived={r.archived_at !== null}
                onClick={() => navigate(`/resources/${r.id}`)}
                actions={
                  r.archived_at ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => unarchive.mutate(r.id)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => archive.mutate(r.id)}
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
        title="New resource"
      >
        <ResourceForm
          submitLabel="Create"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </>
  );
}
