import { useState } from 'react';
import { Button } from '../ui/button.js';
import { EntityBadge } from './entity-badge.js';
import { LinkPicker } from './link-picker.js';
import {
  useBacklinks,
  useDeleteEntityLink,
} from '../../hooks/use-backlinks.js';
import type { EntityType } from '@lifeos/shared';

interface BacklinksPanelProps {
  entity_type: EntityType;
  entity_id: string;
}

export function BacklinksPanel({
  entity_type,
  entity_id,
}: BacklinksPanelProps): JSX.Element {
  const links = useBacklinks(entity_type, entity_id);
  const deleteLink = useDeleteEntityLink();
  const [picking, setPicking] = useState(false);

  const outgoing = links.data?.outgoing ?? [];
  const incoming = links.data?.incoming ?? [];
  const total = outgoing.length + incoming.length;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          References {total > 0 && <span className="text-slate-400">({total})</span>}
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
          + Link
        </Button>
      </div>
      {links.isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-4 text-xs text-slate-400">
          Loading…
        </div>
      ) : total === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-xs text-slate-500">
          No links yet. Click "+ Link" to reference another entity.
        </div>
      ) : (
        <div className="space-y-3">
          {outgoing.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] uppercase text-slate-400">
                Links to
              </div>
              <div className="space-y-1">
                {outgoing.map((edge) => (
                  <EntityBadge
                    key={edge.link_id}
                    entity={edge.other}
                    onRemove={() => deleteLink.mutate(edge.link_id)}
                  />
                ))}
              </div>
            </div>
          )}
          {incoming.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] uppercase text-slate-400">
                Referenced by
              </div>
              <div className="space-y-1">
                {incoming.map((edge) => (
                  <EntityBadge
                    key={edge.link_id}
                    entity={edge.other}
                    onRemove={() => deleteLink.mutate(edge.link_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <LinkPicker
        open={picking}
        onClose={() => setPicking(false)}
        source_type={entity_type}
        source_id={entity_id}
      />
    </section>
  );
}
