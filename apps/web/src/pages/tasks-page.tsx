import { PageHeader } from '../components/page-header.js';
import { PlaceholderPanel } from '../components/placeholder-panel.js';

export default function TasksPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Tasks" subtitle="Everything you're doing" />
      <PlaceholderPanel
        title="CRUD lands in P4, Kanban in P5"
        phase="P4"
        body="List all tasks with sort/filter by project, area, sprint, status, and tag. The Kanban board view lives on the Sprint detail page."
      />
    </>
  );
}
