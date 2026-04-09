import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ResourceCreateSchema,
  type ResourceCreate,
  type Resource,
  type ResourceKind,
} from '@lifeos/shared';
import { Button } from '../ui/button.js';
import { Input, Textarea, Select, Field } from '../ui/input.js';
import { mapApiErrorToForm } from '../../lib/form-errors.js';
import { useState } from 'react';
import { useAreas } from '../../hooks/use-areas.js';

interface ResourceFormProps {
  initial?: Resource;
  submitLabel?: string;
  defaultAreaId?: string;
  onSubmit: (values: ResourceCreate) => Promise<void>;
  onCancel: () => void;
}

const KIND_OPTIONS: ResourceKind[] = ['note', 'url', 'clipping'];

export function ResourceForm({
  initial,
  submitLabel = 'Save',
  defaultAreaId,
  onSubmit,
  onCancel,
}: ResourceFormProps): JSX.Element {
  const [banner, setBanner] = useState<string | null>(null);
  const areas = useAreas();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResourceCreate>({
    resolver: zodResolver(ResourceCreateSchema),
    defaultValues: {
      title: initial?.title ?? '',
      url: initial?.url ?? '',
      body_md: initial?.body_md ?? '',
      source_kind: initial?.source_kind ?? 'note',
      area_id: initial?.area_id ?? defaultAreaId ?? '',
    },
  });

  async function submit(values: ResourceCreate): Promise<void> {
    setBanner(null);
    try {
      const normalized: ResourceCreate = {
        ...values,
        url: values.url || null,
        body_md: values.body_md || null,
        area_id: values.area_id || null,
      };
      await onSubmit(normalized);
    } catch (err) {
      const { bannerError } = mapApiErrorToForm<ResourceCreate>(err, setError);
      setBanner(bannerError);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {banner && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {banner}
        </div>
      )}
      <Field
        label="Title"
        error={errors.title?.message}
        htmlFor="resource-title"
      >
        <Input id="resource-title" autoFocus {...register('title')} />
      </Field>
      <Field
        label="Kind"
        error={errors.source_kind?.message}
        htmlFor="resource-kind"
      >
        <Select id="resource-kind" {...register('source_kind')}>
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="URL" error={errors.url?.message} htmlFor="resource-url">
        <Input
          id="resource-url"
          placeholder="https://…"
          {...register('url')}
        />
      </Field>
      <Field
        label="Notes (markdown)"
        error={errors.body_md?.message}
        htmlFor="resource-body"
      >
        <Textarea id="resource-body" rows={6} {...register('body_md')} />
      </Field>
      <Field
        label="Area"
        error={errors.area_id?.message}
        htmlFor="resource-area"
      >
        <Select id="resource-area" {...register('area_id')}>
          <option value="">No area</option>
          {areas.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
