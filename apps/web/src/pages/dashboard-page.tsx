import { PageHeader } from '../components/page-header.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { useDashboard } from '../hooks/use-dashboard.js';
import { Widget, WidgetEmpty } from '../components/dashboard/widget.js';
import { TaskList } from '../components/dashboard/task-list.js';
import { CurrentSprintSummary } from '../components/dashboard/current-sprint-summary.js';
import { AreaFocusWidget } from '../components/dashboard/area-focus.js';
import { RecentResourcesWidget } from '../components/dashboard/recent-resources.js';

export default function DashboardPage(): JSX.Element {
  const dashboard = useDashboard();

  if (dashboard.isLoading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your current week at a glance" />
        <CenteredSpinner />
      </>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your current week at a glance" />
        <div className="p-6 text-sm text-red-600">
          Failed to load dashboard:{' '}
          {(dashboard.error as Error | null)?.message ?? 'unknown error'}
        </div>
      </>
    );
  }

  const d = dashboard.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your current week at a glance"
      />
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
        <CurrentSprintSummary
          sprint={d.currentSprint}
          inProgressCount={d.inProgressTasks.length}
        />

        <Widget
          title="In progress"
          count={d.inProgressTasks.length}
        >
          <TaskList
            tasks={d.inProgressTasks}
            emptyText="Nothing in progress. Drag a task into the In Progress column on your sprint board."
          />
        </Widget>

        <Widget title="Due today" count={d.dueToday.length}>
          <TaskList tasks={d.dueToday} emptyText="Nothing due today. Nice." />
        </Widget>

        <AreaFocusWidget items={d.weeklyFocusByArea} />

        <Widget title="Stale" count={d.staleTasks.length}>
          {d.staleTasks.length === 0 ? (
            <WidgetEmpty text="Nothing's fallen through the cracks." />
          ) : (
            <TaskList
              tasks={d.staleTasks}
              emptyText="Nothing stale."
            />
          )}
        </Widget>

        <RecentResourcesWidget resources={d.recentResources} />
      </div>
    </>
  );
}
