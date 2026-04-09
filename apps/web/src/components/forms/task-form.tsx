import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  TaskCreateSchema,
  type TaskCreate,
  type Task,
  type TaskStatus,
} from '@lifeos/shared';
import { Button } from '../ui/button.js';
import { Input, Textarea, Select, Field } from '../ui/input.js';
import { mapApiErrorToForm } from '../../lib/form-errors.js';
import { useState } from 'react';
import { useAreas } from '../../hooks/use-areas.js';
import { useProjects } from '../../hooks/use-projects.js';

interface TaskFormProps {
  initial?: Task;
  submitLabel?: string;
  defaults?: {
    project_id?: string;
    area_id?: string;
  };
  onSubmit: (values: TaskCreate) => Promise<void>;
  onCancel: () => void;
}

const STATUS_OPTIONS: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
];

type ParentKind = 'project' | 'area';

function initialParentKind(initial: Task | undefined, defaults?: TaskFormProps['defaults']): ParentKind {
  if (initial?.project_id) return 'project';
  if (initial?.area_id) return 'area';
  if (defaults?.project_id) return 'project';
  if (defaults?.area_id) return 'area';
  return 'project';
}

export function TaskForm({
  initial,
  submitLabel = 'Save',
  defaults,
  onSubmit,
  onCancel,
}: TaskFormProps): JSX.Element {
  const [banner, setBanner] = useState<string | null>(null);
  const [parentKind, setParentKind] = useState<ParentKind>(
    initialParentKind(initial, defaults),
  );
  const areas = useAreas();
  const projects = useProjects();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskCreate>({
    resolver: zodResolver(TaskCreateSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      project_id: initial?.project_id ?? defaults?.project_id ?? '',
      area_id: initial?.area_id ?? defaults?.area_id ?? '',
      status: initial?.status ?? 'backlog',
      urgency: initial?.urgency ?? 0,
      importance: initial?.importance ?? 0,
      estimate_minutes: initial?.estimate_minutes ?? undefined,
      due_date: (initial?.due_date as string | null) ?? '',
    },
  });

  async function submit(values: TaskCreate): Promise<void> {
    setBanner(null);
    try {
      // XOR: zero out the other side before sending.
      const normalized: TaskCreate = {
        ...values,
        description: values.description || null,
        project_id: parentKind === 'project' ? values.project_id || null : null,
        area_id: parentKind === 'area' ? values.area_id || null : null,
        due_date: values.due_date || null,
        estimate_minutes:
          values.estimate_minutes === undefined ||
          (values.estimate_minutes as unknown) === ''
            ? null
            : Number(values.estimate_minutes),
      };
      // Final client-side XOR guard so the form's own refine catches it
      // before the network round-trip.
      if (!normalized.project_id && !normalized.area_id) {
        setBanner('Pick either a project or an area');
        return;
      }
      await onSubmit(normalized);
    } catch (err) {
      const { bannerError } = mapApiErrorToForm<TaskCreate>(err, setError);
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
      <Field label="Title" error={errors.title?.message} htmlFor="task-title">
        <Input id="task-title" autoFocus {...register('title')} />
      </Field>
      <Field
        label="Description"
        error={errors.description?.message}
        htmlFor="task-description"
      >
        <Textarea id="task-description" rows={3} {...register('description')} />
      </Field>
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Parent
        </div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={parentKind === 'project'}
              onChange={() => setParentKind('project')}
            />
            Under a project
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={parentKind === 'area'}
              onChange={() => setParentKind('area')}
            />
            Standalone (under an area)
          </label>
        </div>
        {parentKind === 'project' ? (
          <Field error={errors.project_id?.message} htmlFor="task-project">
            <Select id="task-project" {...register('project_id')}>
              <option value="">Select project…</option>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field error={errors.area_id?.message} htmlFor="task-area">
            <Select id="task-area" {...register('area_id')}>
              <option value="">Select area…</option>
              {areas.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Urgency (0-3)"
          error={errors.urgency?.message}
          htmlFor="task-urgency"
        >
          <Controller
            control={control}
            name="urgency"
            render={({ field }) => (
              <Select
                id="task-urgency"
                value={String(field.value ?? 0)}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </Select>
            )}
          />
        </Field>
        <Field
          label="Importance (0-3)"
          error={errors.importance?.message}
          htmlFor="task-importance"
        >
          <Controller
            control={control}
            name="importance"
            render={({ field }) => (
              <Select
                id="task-importance"
                value={String(field.value ?? 0)}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </Select>
            )}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Estimate (min)"
          error={errors.estimate_minutes?.message as string | undefined}
          htmlFor="task-estimate"
        >
          <Input
            id="task-estimate"
            type="number"
            min={0}
            {...register('estimate_minutes', {
              setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
            })}
          />
        </Field>
        <Field
          label="Due date"
          error={errors.due_date?.message as string | undefined}
          htmlFor="task-due"
        >
          <Input id="task-due" type="date" {...register('due_date')} />
        </Field>
      </div>
      <Field
        label="Status"
        error={errors.status?.message}
        htmlFor="task-status"
      >
        <Select id="task-status" {...register('status')}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
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
