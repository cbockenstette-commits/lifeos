import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { KanbanBoard } from '../components/kanban/kanban-board.js';
import { useSprint, useUpdateSprint } from '../hooks/use-sprints.js';
import { useTasks } from '../hooks/use-tasks.js';
import type { SprintStatus } from '@lifeos/shared';

export default function SprintDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sprint = useSprint(id);
  const tasks = useTasks({ sprint_id: id });
  const updateSprint = useUpdateSprint();

  if (sprint.isLoading) return <CenteredSpinner />;
  if (sprint.isError || !sprint.data) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load sprint.{' '}
        <Link to="/sprints" className="text-blue-600">
          Back
        </Link>
      </div>
    );
  }

  const s = sprint.data;
  const totalMinutes = (tasks.data ?? []).reduce(
    (sum, t) => sum + (t.estimate_minutes ?? 0),
    0,
  );
  const completedCount = (tasks.data ?? []).filter((t) => t.status === 'done').length;

  async function setStatus(status: SprintStatus): Promise<void> {
    if (!id) return;
    await updateSprint.mutateAsync({ id, body: { status } });
  }

  return (
    <>
      <PageHeader
        title={`Sprint ${formatDate(s.start_date)} → ${formatDate(s.end_date)}`}
        subtitle={s.goal ?? 'No goal set'}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/sprints/${s.id}/plan`)}
            >
              Plan
            </Button>
            {s.status === 'planned' && (
              <Button onClick={() => setStatus('active')}>Start sprint</Button>
            )}
            {s.status === 'active' && (
              <Button variant="secondary" onClick={() => setStatus('complete')}>
                Complete sprint
              </Button>
            )}
            {s.status === 'complete' && (
              <Button variant="secondary" onClick={() => setStatus('active')}>
                Reopen
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <Stat label="Status" value={s.status} />
          <Stat label="Tasks" value={(tasks.data ?? []).length} />
          <Stat label="Capacity" value={`${totalMinutes}m`} />
          <Stat label="Completed" value={`${completedCount}`} />
        </div>
        {tasks.isLoading ? (
          <CenteredSpinner />
        ) : (
          <KanbanBoard tasks={tasks.data ?? []} />
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}
