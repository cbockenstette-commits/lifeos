import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AreaCreateSchema, type AreaCreate, type Area } from '@lifeos/shared';
import { Button } from '../ui/button.js';
import { Input, Textarea, Field } from '../ui/input.js';
import { mapApiErrorToForm } from '../../lib/form-errors.js';
import { useState } from 'react';

interface AreaFormProps {
  initial?: Area;
  submitLabel?: string;
  onSubmit: (values: AreaCreate) => Promise<void>;
  onCancel: () => void;
}

export function AreaForm({
  initial,
  submitLabel = 'Save',
  onSubmit,
  onCancel,
}: AreaFormProps): JSX.Element {
  const [banner, setBanner] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AreaCreate>({
    resolver: zodResolver(AreaCreateSchema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      color: initial?.color ?? '',
    },
  });

  async function submit(values: AreaCreate): Promise<void> {
    setBanner(null);
    try {
      // Normalize empty strings to null so the API stores them consistently.
      const normalized: AreaCreate = {
        ...values,
        description: values.description || null,
        color: values.color || null,
      };
      await onSubmit(normalized);
    } catch (err) {
      const { bannerError } = mapApiErrorToForm<AreaCreate>(err, setError);
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
      <Field label="Name" error={errors.name?.message} htmlFor="area-name">
        <Input id="area-name" autoFocus {...register('name')} />
      </Field>
      <Field
        label="Description"
        error={errors.description?.message}
        htmlFor="area-description"
      >
        <Textarea
          id="area-description"
          placeholder="Optional"
          {...register('description')}
        />
      </Field>
      <Field label="Color" error={errors.color?.message} htmlFor="area-color">
        <Input
          id="area-color"
          placeholder="#10b981"
          {...register('color')}
        />
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
