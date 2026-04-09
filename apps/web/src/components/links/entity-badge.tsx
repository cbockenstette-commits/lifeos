import { Link } from 'react-router-dom';
import type { HydratedEntity } from '@lifeos/shared';

interface EntityBadgeProps {
  entity: HydratedEntity;
  onRemove?: () => void;
}

const TYPE_COLORS: Record<HydratedEntity['type'], string> = {
  area: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  project: 'bg-blue-50 text-blue-700 border-blue-200',
  task: 'bg-amber-50 text-amber-700 border-amber-200',
  resource: 'bg-purple-50 text-purple-700 border-purple-200',
};

const TYPE_PLURAL: Record<HydratedEntity['type'], string> = {
  area: 'areas',
  project: 'projects',
  task: 'tasks',
  resource: 'resources',
};

export function EntityBadge({
  entity,
  onRemove,
}: EntityBadgeProps): JSX.Element {
  const archived = entity.archived_at !== null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5">
      <Link
        to={`/${TYPE_PLURAL[entity.type]}/${entity.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 hover:text-slate-600"
      >
        <span
          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${TYPE_COLORS[entity.type]}`}
        >
          {entity.type}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-sm ${archived ? 'text-slate-400 line-through' : 'text-slate-900'}`}
        >
          {entity.title}
        </span>
        {entity.secondary && (
          <span className="shrink-0 text-xs text-slate-400">
            {entity.secondary}
          </span>
        )}
      </Link>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="rounded text-xs text-slate-400 hover:text-red-600"
          aria-label="Remove link"
        >
          ×
        </button>
      )}
    </div>
  );
}
