import { useState } from 'react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { TagChip } from './tag-chip.js';
import {
  useTags,
  useCreateTag,
  useAttachTag,
  useDetachTag,
  useEntityTags,
} from '../../hooks/use-tags.js';
import type { EntityType } from '@lifeos/shared';

interface TagPickerProps {
  entity_type: EntityType;
  entity_id: string;
}

export function TagPicker({ entity_type, entity_id }: TagPickerProps): JSX.Element {
  const allTags = useTags();
  const attached = useEntityTags(entity_type, entity_id);
  const createTag = useCreateTag();
  const attachTag = useAttachTag();
  const detachTag = useDetachTag();

  const [query, setQuery] = useState('');

  const attachedIds = new Set(attached.data?.map((t) => t.id) ?? []);
  const suggestions = (allTags.data ?? []).filter(
    (t) =>
      !attachedIds.has(t.id) &&
      (query === '' || t.name.toLowerCase().includes(query.toLowerCase())),
  );
  const exactMatch = (allTags.data ?? []).find(
    (t) => t.name.toLowerCase() === query.toLowerCase(),
  );

  async function handleCreateAndAttach(): Promise<void> {
    if (!query) return;
    if (exactMatch) {
      if (!attachedIds.has(exactMatch.id)) {
        await attachTag.mutateAsync({ tag_id: exactMatch.id, entity_type, entity_id });
      }
    } else {
      const created = await createTag.mutateAsync({ name: query });
      await attachTag.mutateAsync({ tag_id: created.id, entity_type, entity_id });
    }
    setQuery('');
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {(attached.data ?? []).map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            clickable={false}
            onRemove={() =>
              detachTag.mutate({ tag_id: tag.id, entity_type, entity_id })
            }
          />
        ))}
        {(attached.data ?? []).length === 0 && (
          <span className="text-xs italic text-slate-400">No tags</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCreateAndAttach();
            }
          }}
          className="max-w-xs"
        />
        {query && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateAndAttach}
            disabled={attachTag.isPending || createTag.isPending}
          >
            {exactMatch ? 'Attach' : `Create "${query}"`}
          </Button>
        )}
      </div>
      {query && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 8).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                attachTag.mutate({ tag_id: t.id, entity_type, entity_id });
                setQuery('');
              }}
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              + {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
