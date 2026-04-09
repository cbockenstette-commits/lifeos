import { useMemo, useState } from 'react';
import { Button } from '../ui/button.js';
import { Modal } from '../ui/modal.js';
import { Input, Select } from '../ui/input.js';
import { useAreas } from '../../hooks/use-areas.js';
import { useProjects } from '../../hooks/use-projects.js';
import { useTasks } from '../../hooks/use-tasks.js';
import { useResources } from '../../hooks/use-resources.js';
import { useCreateEntityLink } from '../../hooks/use-backlinks.js';
import type { EntityType } from '@lifeos/shared';

interface LinkPickerProps {
  open: boolean;
  onClose: () => void;
  source_type: EntityType;
  source_id: string;
}

const TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'area', label: 'Area' },
  { value: 'project', label: 'Project' },
  { value: 'task', label: 'Task' },
  { value: 'resource', label: 'Resource' },
];

export function LinkPicker({
  open,
  onClose,
  source_type,
  source_id,
}: LinkPickerProps): JSX.Element {
  const [targetType, setTargetType] = useState<EntityType>('resource');
  const [query, setQuery] = useState('');

  const areas = useAreas();
  const projects = useProjects();
  const tasks = useTasks();
  const resources = useResources();
  const createLink = useCreateEntityLink();

  const items = useMemo(() => {
    const lower = query.toLowerCase();
    const filter = <T extends { id: string; archived_at: string | Date | null }>(
      list: T[] | undefined,
      title: (item: T) => string,
    ): { id: string; title: string }[] => {
      if (!list) return [];
      return list
        .filter(
          (item) =>
            item.archived_at === null &&
            // Exclude self-links client-side
            !(item.id === source_id && targetType === source_type) &&
            (lower === '' || title(item).toLowerCase().includes(lower)),
        )
        .map((item) => ({ id: item.id, title: title(item) }));
    };
    switch (targetType) {
      case 'area':
        return filter(areas.data, (a) => a.name);
      case 'project':
        return filter(projects.data, (p) => p.name);
      case 'task':
        return filter(tasks.data, (t) => t.title);
      case 'resource':
        return filter(resources.data, (r) => r.title);
    }
  }, [targetType, query, areas.data, projects.data, tasks.data, resources.data, source_id, source_type]);

  async function handleAttach(target_id: string): Promise<void> {
    await createLink.mutateAsync({
      source_type,
      source_id,
      target_type: targetType,
      target_id,
    });
    onClose();
    setQuery('');
  }

  return (
    <Modal open={open} onClose={onClose} title="Link to…" size="md">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as EntityType)}
            className="w-32"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 bg-slate-50">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              No matches
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleAttach(item.id)}
                    disabled={createLink.isPending}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white disabled:opacity-50"
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="text-xs text-slate-400">+ link</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
