import { PageHeader } from '../components/page-header.js';
import { PlaceholderPanel } from '../components/placeholder-panel.js';

export default function SprintsPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Sprints" subtitle="One week at a time" />
      <PlaceholderPanel
        title="Sprint list + Kanban board land in P5"
        phase="P5"
        body="Start this week's sprint, drag tasks across Backlog → To Do → In Progress → Review → Done. Sunday planning view with capacity and area balance."
      />
    </>
  );
}
