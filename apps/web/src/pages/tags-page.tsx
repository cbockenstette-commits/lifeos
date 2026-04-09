import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { Input, Field } from '../components/ui/input.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { CenteredSpinner } from '../components/ui/spinner.js';
import { TagChip } from '../components/tags/tag-chip.js';
import { useTags, useCreateTag } from '../hooks/use-tags.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TagCreateSchema, type TagCreate } from '@lifeos/shared';

export default function TagsPage(): JSX.Element {
  const navigate = useNavigate();
  const tags = useTags();
  const createTag = useCreateTag();
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TagCreate>({
    resolver: zodResolver(TagCreateSchema),
    defaultValues: { name: '', color: '' },
  });

  async function onSubmit(values: TagCreate): Promise<void> {
    await createTag.mutateAsync({
      ...values,
      color: values.color || null,
    });
    reset();
    setCreating(false);
  }

  return (
    <>
      <PageHeader
        title="Tags"
        subtitle="Cross-entity labels"
        actions={<Button onClick={() => setCreating(true)}>+ New tag</Button>}
      />
      <div className="p-6">
        {tags.isLoading ? (
          <CenteredSpinner />
        ) : !tags.data || tags.data.length === 0 ? (
          <EmptyState
            title="No tags yet"
            description="Tags let you group entities across PARA — create one and attach it to any area, project, task, or resource."
            action={<Button onClick={() => setCreating(true)}>+ New tag</Button>}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.data.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => navigate(`/tags/${tag.id}`)}
                className="transition-transform hover:scale-105"
              >
                <TagChip tag={tag} clickable={false} />
              </button>
            ))}
          </div>
        )}
      </div>
      <Modal
        open={creating}
        onClose={() => {
          reset();
          setCreating(false);
        }}
        title="New tag"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message} htmlFor="tag-name">
            <Input id="tag-name" autoFocus {...register('name')} />
          </Field>
          <Field label="Color" error={errors.color?.message} htmlFor="tag-color">
            <Input
              id="tag-color"
              placeholder="#10b981 (optional)"
              {...register('color')}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setCreating(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
