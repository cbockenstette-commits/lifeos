import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { ListItemRow } from '../components/ui/list-item-row.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { SprintForm } from '../components/forms/sprint-form.js';
import {
  useSprints,
  useCreateSprint,
  useCurrentSprint,
} from '../hooks/use-sprints.js';
import type { SprintCreate } from '@lifeos/shared';

export default function SprintsPage(): JSX.Element {
  const navigate = useNavigate();
  const sprints = useSprints();
  const createSprint = useCreateSprint();
  const currentSprint = useCurrentSprint();
  const [creating, setCreating] = useState(false);

  async function handleCreate(values: SprintCreate): Promise<void> {
    const sprint = await createSprint.mutateAsync(values);
    setCreating(false);
    navigate(`/sprints/${sprint.id}`);
  }

  async function handleStartThisWeek(): Promise<void> {
    if (currentSprint.data) {
      navigate(`/sprints/${currentSprint.data.id}`);
      return;
    }
    // currentSprint is find-or-create; triggering a refetch is enough,
    // but if it errored we fall through to the explicit form.
    setCreating(true);
  }

  return (
    <>
      <PageHeader
        title="Sprints"
        subtitle="One week at a time"
        actions={
          <div className="flex gap-2">
            <Button onClick={handleStartThisWeek}>
              {currentSprint.data ? 'Open this week' : "Start this week's sprint"}
            </Button>
            <Button variant="secondary" onClick={() => setCreating(true)}>
              + Manual
            </Button>
          </div>
        }
      />
      <div className="p-6">
        {sprints.isLoading ? (
          <CenteredSpinner />
        ) : !sprints.data || sprints.data.length === 0 ? (
          <EmptyState
            title="No sprints yet"
            description="Start your first weekly sprint to begin tracking work."
            action={
              <Button onClick={handleStartThisWeek}>Start this week's sprint</Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {sprints.data.map((sp) => (
              <ListItemRow
                key={sp.id}
                title={`${formatDate(sp.start_date)} → ${formatDate(sp.end_date)}`}
                subtitle={sp.goal ?? undefined}
                meta={<span className="uppercase">{sp.status}</span>}
                onClick={() => navigate(`/sprints/${sp.id}`)}
              />
            ))}
          </div>
        )}
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title="New sprint">
        <SprintForm
          submitLabel="Create"
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </>
  );
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}
