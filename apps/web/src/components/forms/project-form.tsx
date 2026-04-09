import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProjectCreateSchema,
  type ProjectCreate,
  type Project,
  type ProjectStatus,
} from '@lifeos/shared';
import { Button } from '../ui/button.js';
import { Input, Textarea, Select, Field } from '../ui/input.js';
import { mapApiErrorToForm } from '../../lib/form-errors.js';
import { useState } from 'react';
import { useAreas } from '../../hooks/use-areas.js';

interface ProjectFormProps {
  initial?: Project;
  submitLabel?: string;
  defaultAreaId?: string;
  onSubmit: (values: ProjectCreate) => Promise<void>;
  onCancel: () => void;
}

const STATUS_OPTIONS: ProjectStatus[] = [
  'not_started',
  'active',
  'blocked',
  'complete',
];

export function ProjectForm({
  initial,
  submitLabel = 'Save',
  defaultAreaId,
  onSubmit,
  onCancel,
}: ProjectFormProps): JSX.Element {
  const [banner, setBanner] = useState<string | null>(null);
  const areas = useAreas();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectCreate>({
    resolver: zodResolver(ProjectCreateSchema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      area_id: initial?.area_id ?? defaultAreaId ?? '',
      status: initial?.status ?? 'not_started',
      target_date:
        (initial?.target_date as string | null) ?? '',
    },
  });

  async function submit(values: ProjectCreate): Promise<void> {
    setBanner(null);
    try {
      const normalized: ProjectCreate = {
        ...values,
        description: values.description || null,
        area_id: values.area_id || null,
        target_date: values.target_date || null,
      };
      await onSubmit(normalized);
    } catch (err) {
      const { bannerError } = mapApiErrorToForm<ProjectCreate>(err, setError);
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
      <Field label="Name" error={errors.name?.message} htmlFor="project-name">
        <Input id="project-name" autoFocus {...register('name')} />
      </Field>
      <Field
        label="Description"
        error={errors.description?.message}
        htmlFor="project-description"
      >
        <Textarea id="project-description" {...register('description')} />
      </Field>
      <Field label="Area" error={errors.area_id?.message} htmlFor="project-area">
        <Select id="project-area" {...register('area_id')}>
          <option value="">No area</option>
          {areas.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Status"
        error={errors.status?.message}
        htmlFor="project-status"
      >
        <Select id="project-status" {...register('status')}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Target date"
        error={errors.target_date?.message as string | undefined}
        htmlFor="project-target"
      >
        <Input id="project-target" type="date" {...register('target_date')} />
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
