import { Link } from 'react-router-dom';
import type { Resource } from '@lifeos/shared';
import { Widget, WidgetEmpty } from './widget.js';

interface RecentResourcesWidgetProps {
  resources: Resource[];
}

export function RecentResourcesWidget({
  resources,
}: RecentResourcesWidgetProps): JSX.Element {
  return (
    <Widget title="Recent resources" count={resources.length}>
      {resources.length === 0 ? (
        <WidgetEmpty text="Nothing saved yet." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {resources.map((r) => (
            <li key={r.id}>
              <Link
                to={`/resources/${r.id}`}
                className="flex items-center justify-between gap-3 py-2 text-sm hover:text-slate-600"
              >
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="shrink-0 text-xs uppercase text-slate-400">
                  {r.source_kind}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
