import type { ReactNode } from 'react';

interface ListItemRowProps {
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  archived?: boolean;
  onClick?: () => void;
  actions?: ReactNode;
}

// Reusable list-row shared by every entity list view so the UI feels
// consistent across Areas/Projects/Tasks/Resources. Archived items get
// a strikethrough title and muted color.

export function ListItemRow({
  title,
  subtitle,
  meta,
  archived,
  onClick,
  actions,
}: ListItemRowProps): JSX.Element {
  const clickable = onClick !== undefined;
  return (
    <div
      className={[
        'flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 last:border-b-0',
        clickable && 'cursor-pointer hover:bg-slate-50',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div
          className={[
            'truncate text-sm font-medium',
            archived ? 'text-slate-400 line-through' : 'text-slate-900',
          ].join(' ')}
        >
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {subtitle}
          </div>
        )}
      </div>
      {meta && (
        <div className="shrink-0 text-xs text-slate-400">{meta}</div>
      )}
      {actions && (
        <div
          className="flex shrink-0 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
