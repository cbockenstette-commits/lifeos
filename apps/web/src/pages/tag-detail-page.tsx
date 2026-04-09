import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { EntityBadge } from '../components/links/entity-badge.js';
import {
  useTag,
  useTagEntities,
  useDeleteTag,
} from '../hooks/use-tags.js';
import type { EntityType, HydratedEntity } from '@lifeos/shared';

const SECTIONS: Array<{ type: EntityType; label: string }> = [
  { type: 'area', label: 'Areas' },
  { type: 'project', label: 'Projects' },
  { type: 'task', label: 'Tasks' },
  { type: 'resource', label: 'Resources' },
];

export default function TagDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tag = useTag(id);
  const entities = useTagEntities(id);
  const deleteTag = useDeleteTag();

  if (tag.isLoading) return <CenteredSpinner />;
  if (tag.isError || !tag.data) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load tag.{' '}
        <Link to="/tags" className="text-blue-600">
          Back
        </Link>
      </div>
    );
  }

  const t = tag.data;
  const total = entities.data
    ? SECTIONS.reduce((sum, s) => sum + (entities.data?.[s.type].length ?? 0), 0)
    : 0;

  async function handleDelete(): Promise<void> {
    if (!id) return;
    if (!confirm('Delete this tag? It will be removed from every entity.')) return;
    await deleteTag.mutateAsync(id);
    navigate('/tags');
  }

  return (
    <>
      <PageHeader
        title={`#${t.name}`}
        subtitle={`${total} entit${total === 1 ? 'y' : 'ies'} tagged`}
        actions={
          <Button variant="danger" onClick={handleDelete}>
            Delete tag
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        {entities.isLoading ? (
          <CenteredSpinner />
        ) : total === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Nothing tagged with <code>#{t.name}</code> yet.
          </div>
        ) : (
          SECTIONS.map((section) => {
            const items = entities.data?.[section.type] ?? [];
            if (items.length === 0) return null;
            return (
              <section key={section.type}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.label}{' '}
                  <span className="text-slate-400">({items.length})</span>
                </h3>
                <div className="space-y-1.5">
                  {items.map((entity: HydratedEntity) => (
                    <EntityBadge key={entity.id} entity={entity} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
