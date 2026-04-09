import { Link } from 'react-router-dom';
import type { Sprint } from '@lifeos/shared';
import { Widget, WidgetEmpty } from './widget.js';

interface CurrentSprintSummaryProps {
  sprint: Sprint | null;
  inProgressCount: number;
}

export function CurrentSprintSummary({
  sprint,
  inProgressCount,
}: CurrentSprintSummaryProps): JSX.Element {
  return (
    <Widget
      title="Current sprint"
      action={
        sprint && (
          <Link
            to={`/sprints/${sprint.id}`}
            className="text-xs text-slate-500 hover:text-slate-900"
          >
            Open board →
          </Link>
        )
      }
    >
      {sprint ? (
        <div className="space-y-1 text-sm">
          <div className="font-medium text-slate-900">
            {formatDate(sprint.start_date)} → {formatDate(sprint.end_date)}
          </div>
          {sprint.goal && (
            <div className="text-xs text-slate-500">{sprint.goal}</div>
          )}
          <div className="pt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{inProgressCount}</span>{' '}
            in progress · status{' '}
            <span className="font-mono">{sprint.status}</span>
          </div>
        </div>
      ) : (
        <WidgetEmpty text="No sprint for this week yet." />
      )}
    </Widget>
  );
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}
