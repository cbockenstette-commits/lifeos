import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { ResourceForm } from '../components/forms/resource-form.js';
import { TagPicker } from '../components/tags/tag-picker.js';
import { BacklinksPanel } from '../components/links/backlinks-panel.js';
import {
  useResource,
  useUpdateResource,
  useArchiveResource,
  useUnarchiveResource,
} from '../hooks/use-resources.js';
import type { ResourceCreate } from '@lifeos/shared';

export default function ResourceDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const resource = useResource(id);
  const updateResource = useUpdateResource();
  const archive = useArchiveResource();
  const unarchive = useUnarchiveResource();
  const [editing, setEditing] = useState(false);

  if (resource.isLoading) return <CenteredSpinner />;
  if (resource.isError || !resource.data) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load resource.{' '}
        <Link to="/resources" className="text-blue-600">
          Back
        </Link>
      </div>
    );
  }

  const r = resource.data;
  const isArchived = r.archived_at !== null;

  async function handleUpdate(values: ResourceCreate): Promise<void> {
    if (!id) return;
    await updateResource.mutateAsync({ id, body: values });
    setEditing(false);
  }

  return (
    <>
      <PageHeader
        title={r.title}
        subtitle={r.source_kind.toUpperCase()}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {isArchived ? (
              <Button onClick={() => unarchive.mutate(r.id)}>Restore</Button>
            ) : (
              <Button
                variant="danger"
                onClick={async () => {
                  await archive.mutateAsync(r.id);
                  navigate('/resources');
                }}
              >
                Archive
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-4 p-6">
        {r.url && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase text-slate-500">URL</div>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all text-sm text-blue-600 hover:underline"
            >
              {r.url}
            </a>
          </div>
        )}
        {r.body_md && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase text-slate-500">Notes</div>
            <pre className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {r.body_md}
            </pre>
          </div>
        )}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tags
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <TagPicker entity_type="resource" entity_id={r.id} />
          </div>
        </div>
        <BacklinksPanel entity_type="resource" entity_id={r.id} />
      </div>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit resource"
      >
        <ResourceForm
          initial={r}
          submitLabel="Save"
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}
