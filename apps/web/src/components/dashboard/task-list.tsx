import { Link } from 'react-router-dom';
import type { Task } from '@lifeos/shared';
import { WidgetEmpty } from './widget.js';

interface TaskListProps {
  tasks: Task[];
  emptyText: string;
}

export function TaskList({ tasks, emptyText }: TaskListProps): JSX.Element {
  if (tasks.length === 0) return <WidgetEmpty text={emptyText} />;
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link
            to={`/tasks/${t.id}`}
            className="flex items-center justify-between gap-3 py-2 text-sm hover:text-slate-600"
          >
            <div className="min-w-0 flex-1 truncate">{t.title}</div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
              <span>{t.status}</span>
              {t.due_date && (
                <span>due {formatDate(t.due_date)}</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}
