import { PageHeader } from '../components/page-header.js';
import { PlaceholderPanel } from '../components/placeholder-panel.js';

export default function AreasPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Areas" subtitle="Ongoing life domains" />
      <PlaceholderPanel
        title="CRUD lands in P4"
        phase="P4"
        body="Create, view, edit, and archive Areas. Each Area hosts Projects and can have standalone Tasks."
      />
    </>
  );
}
