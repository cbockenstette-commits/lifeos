import { PageHeader } from '../components/page-header.js';
import { PlaceholderPanel } from '../components/placeholder-panel.js';

export default function DashboardPage(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your current week at a glance"
      />
      <PlaceholderPanel
        title="Aggregator endpoint lands in P6"
        phase="P6"
        body="This page will show current sprint in-progress tasks, tasks due today, this week's focus per Area, recent Resources, and stale-task warnings — all from a single /api/dashboard round-trip."
      />
    </>
  );
}
