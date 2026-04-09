import { PageHeader } from '../components/page-header.js';
import { PlaceholderPanel } from '../components/placeholder-panel.js';

export default function ProjectsPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Projects" subtitle="Completable outcomes" />
      <PlaceholderPanel
        title="CRUD lands in P4"
        phase="P4"
        body="Create, view, edit, archive, and nest Projects. Filter by Area. Each project holds Tasks."
      />
    </>
  );
}
