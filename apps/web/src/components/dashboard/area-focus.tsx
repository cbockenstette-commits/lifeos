import type { AreaFocus } from '@lifeos/shared';
import { Widget, WidgetEmpty } from './widget.js';

interface AreaFocusWidgetProps {
  items: AreaFocus[];
}

export function AreaFocusWidget({ items }: AreaFocusWidgetProps): JSX.Element {
  return (
    <Widget title="This week by area">
      {items.length === 0 ? (
        <WidgetEmpty text="No area focus yet — add tasks to the current sprint to see the balance." />
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((f) => (
            <li
              key={f.area_id}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-slate-700">{f.area_name}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {f.task_count} task{f.task_count === 1 ? '' : 's'}
                {f.total_estimate_minutes > 0 &&
                  ` · ${f.total_estimate_minutes}m`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
