import { PageHeader } from '../components/page-header.js';
import { PlaceholderPanel } from '../components/placeholder-panel.js';

export default function TagsPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Tags" subtitle="Cross-entity tagging" />
      <PlaceholderPanel
        title="Tag management + tag detail pages land in P7"
        phase="P7"
        body="Create, rename, delete tags. Click any tag to see all entities tagged with it, grouped by type (Areas / Projects / Tasks / Resources)."
      />
    </>
  );
}
