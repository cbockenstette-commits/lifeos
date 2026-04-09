import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SprintCreateSchema,
  startOfSprint,
  todayInTz,
  type SprintCreate,
  type Sprint,
} from '@lifeos/shared';
import { Button } from '../ui/button.js';
import { Input, Textarea, Field } from '../ui/input.js';
import { mapApiErrorToForm } from '../../lib/form-errors.js';
import { useState } from 'react';

interface SprintFormProps {
  initial?: Sprint;
  submitLabel?: string;
  onSubmit: (values: SprintCreate) => Promise<void>;
  onCancel: () => void;
}

function defaultStartDate(): string {
  // Default to the Sunday of the current week in the browser's tz.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return startOfSprint(todayInTz(tz));
}

export function SprintForm({
  initial,
  submitLabel = 'Save',
  onSubmit,
  onCancel,
}: SprintFormProps): JSX.Element {
  const [banner, setBanner] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SprintCreate>({
    resolver: zodResolver(SprintCreateSchema),
    defaultValues: {
      start_date: (initial?.start_date as string | undefined) ?? defaultStartDate(),
      goal: initial?.goal ?? '',
    },
  });

  async function submit(values: SprintCreate): Promise<void> {
    setBanner(null);
    try {
      await onSubmit({
        ...values,
        goal: values.goal || null,
      });
    } catch (err) {
      const { bannerError } = mapApiErrorToForm<SprintCreate>(err, setError);
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
        label="Start date (Sunday)"
        error={errors.start_date?.message as string | undefined}
        htmlFor="sprint-start"
      >
        <Input id="sprint-start" type="date" {...register('start_date')} />
      </Field>
      <Field label="Goal" error={errors.goal?.message} htmlFor="sprint-goal">
        <Textarea
          id="sprint-goal"
          rows={3}
          placeholder="What does success look like this week?"
          {...register('goal')}
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
