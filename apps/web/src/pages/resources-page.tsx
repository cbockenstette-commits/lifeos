import { PageHeader } from '../components/page-header.js';
import { PlaceholderPanel } from '../components/placeholder-panel.js';

export default function ResourcesPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Resources" subtitle="Your saved references" />
      <PlaceholderPanel
        title="CRUD lands in P4"
        phase="P4"
        body="Save notes, URLs, and clippings. Tag and link them to any other entity."
      />
    </>
  );
}
