import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { useSprint } from '../hooks/use-sprints.js';
import { useTasks, useUpdateTask } from '../hooks/use-tasks.js';
import { useAreas } from '../hooks/use-areas.js';
import { useProjects } from '../hooks/use-projects.js';
import type { Task, TaskUpdate } from '@lifeos/shared';
import { useMemo } from 'react';

export default function SprintPlanningPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const sprint = useSprint(id);

  // Assigned tasks: in this sprint.
  const assigned = useTasks({ sprint_id: id });
  // Candidate pool: unsprinted, non-archived, non-completed tasks.
  // The API doesn't directly support `sprint_id=null`; we fetch all
  // non-archived tasks and filter client-side. At v1 single-user scale
  // this is fine.
  const allTasks = useTasks();
  const updateTask = useUpdateTask();

  const candidates = useMemo(() => {
    if (!allTasks.data) return [];
    return allTasks.data.filter(
      (t) =>
        t.sprint_id === null &&
        t.archived_at === null &&
        t.status !== 'done',
    );
  }, [allTasks.data]);

  const areas = useAreas();
  const projects = useProjects();

  // Area balance: count by area id via the transitive path
  // (task → project → area) or direct (task → area).
  const areaById = useMemo(() => {
    const map = new Map<string, string>();
    (areas.data ?? []).forEach((a) => map.set(a.id, a.name));
    return map;
  }, [areas.data]);

  const projectToArea = useMemo(() => {
    const map = new Map<string, string | null>();
    (projects.data ?? []).forEach((p) => map.set(p.id, p.area_id));
    return map;
  }, [projects.data]);

  function taskAreaId(task: Task): string | null {
    if (task.area_id) return task.area_id;
    if (task.project_id) return projectToArea.get(task.project_id) ?? null;
    return null;
  }

  const balance = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of assigned.data ?? []) {
      const aid = taskAreaId(t);
      if (!aid) continue;
      counts.set(aid, (counts.get(aid) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([aid, count]) => ({
      name: areaById.get(aid) ?? 'Unknown',
      count,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigned.data, areaById, projectToArea]);

  const totalMinutes = (assigned.data ?? []).reduce(
    (sum, t) => sum + (t.estimate_minutes ?? 0),
    0,
  );

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

  async function assign(task: Task): Promise<void> {
    if (!id) return;
    const body: TaskUpdate = { sprint_id: id };
    await updateTask.mutateAsync({ id: task.id, body });
  }

  async function unassign(task: Task): Promise<void> {
    const body: TaskUpdate = { sprint_id: null };
    await updateTask.mutateAsync({ id: task.id, body });
  }

  return (
    <>
      <PageHeader
        title="Sprint planning"
        subtitle={`${formatDate(sprint.data.start_date)} → ${formatDate(sprint.data.end_date)} · ${sprint.data.goal ?? 'No goal set'}`}
        actions={
          <Link to={`/sprints/${sprint.data.id}`}>
            <Button variant="secondary">Open board</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Backlog ({candidates.length})
            </h3>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {candidates.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                No unsprinted tasks available
              </div>
            ) : (
              candidates.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  action={
                    <Button size="sm" onClick={() => assign(t)}>
                      Add →
                    </Button>
                  }
                />
              ))
            )}
          </div>
        </section>
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              In this sprint ({(assigned.data ?? []).length})
            </h3>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {(assigned.data ?? []).length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                No tasks assigned yet
              </div>
            ) : (
              (assigned.data ?? []).map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => unassign(t)}
                    >
                      ← Remove
                    </Button>
                  }
                />
              ))
            )}
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Capacity</span>
              <span className="font-medium">
                {totalMinutes} min ({Math.round(totalMinutes / 60)}h)
              </span>
            </div>
            {balance.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="mb-1 text-xs uppercase text-slate-500">
                  Area balance
                </div>
                <ul className="space-y-1 text-xs">
                  {balance.map((b) => (
                    <li
                      key={b.name}
                      className="flex items-center justify-between"
                    >
                      <span>{b.name}</span>
                      <span className="font-mono">{b.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function TaskRow({
  task,
  action,
}: {
  task: Task;
  action: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-sm last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-900">{task.title}</div>
        <div className="text-xs text-slate-500">
          {task.status} · ⚡{task.urgency} · ✨{task.importance}
          {task.estimate_minutes && ` · ${task.estimate_minutes}m`}
        </div>
      </div>
      <div className="ml-3 shrink-0">{action}</div>
    </div>
  );
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}
