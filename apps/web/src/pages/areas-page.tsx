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
import { AreaForm } from '../components/forms/area-form.js';
import {
  useAreas,
  useCreateArea,
  useArchiveArea,
  useUnarchiveArea,
} from '../hooks/use-areas.js';
import type { Area, AreaCreate } from '@lifeos/shared';

export default function AreasPage(): JSX.Element {
  const { includeArchived } = useIncludeArchived();
  const navigate = useNavigate();
  const areas = useAreas({ includeArchived });
  const createArea = useCreateArea();
  const archive = useArchiveArea();
  const unarchive = useUnarchiveArea();

  const [creating, setCreating] = useState(false);

  async function handleCreate(values: AreaCreate): Promise<void> {
    await createArea.mutateAsync(values);
    setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="Areas"
        subtitle="Ongoing life domains"
        actions={
          <div className="flex items-center gap-4">
            <ArchiveToggle />
            <Button onClick={() => setCreating(true)}>+ New area</Button>
          </div>
        }
      />
      <div className="p-6">
        {areas.isLoading ? (
          <CenteredSpinner />
        ) : areas.isError ? (
          <div className="text-sm text-red-600">
            Failed to load areas: {(areas.error as Error).message}
          </div>
        ) : !areas.data || areas.data.length === 0 ? (
          <EmptyState
            title={includeArchived ? 'No areas yet' : 'No active areas'}
            description="Areas are ongoing life domains like Health, Finance, or Relationships."
            action={
              <Button onClick={() => setCreating(true)}>Create your first area</Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {areas.data.map((area: Area) => (
              <ListItemRow
                key={area.id}
                title={area.name}
                subtitle={area.description ?? undefined}
                meta={
                  area.color ? (
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: area.color }}
                    />
                  ) : undefined
                }
                archived={area.archived_at !== null}
                onClick={() => navigate(`/areas/${area.id}`)}
                actions={
                  area.archived_at ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => unarchive.mutate(area.id)}
                      disabled={unarchive.isPending}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => archive.mutate(area.id)}
                      disabled={archive.isPending}
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
        title="New area"
      >
        <AreaForm
          submitLabel="Create"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </>
  );
}
