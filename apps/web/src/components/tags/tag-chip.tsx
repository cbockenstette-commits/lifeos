import { Link } from 'react-router-dom';
import type { Tag } from '@lifeos/shared';

interface TagChipProps {
  tag: Pick<Tag, 'id' | 'name' | 'color'>;
  onRemove?: () => void;
  clickable?: boolean;
}

export function TagChip({ tag, onRemove, clickable = true }: TagChipProps): JSX.Element {
  const content = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
      style={
        tag.color
          ? { borderColor: tag.color, background: `${tag.color}15` }
          : undefined
      }
    >
      {tag.color && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
      )}
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full text-slate-500 hover:text-slate-900"
          aria-label={`Remove tag ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  );

  if (!clickable) return content;
  return (
    <Link to={`/tags/${tag.id}`} className="hover:opacity-80">
      {content}
    </Link>
  );
}
