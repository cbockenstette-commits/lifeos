import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@lifeos/shared';
import { KanbanCard } from './kanban-card.js';

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
}

export function KanbanColumn({ status, label, tasks }: KanbanColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${status}`,
    data: { type: 'column', status },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'flex min-w-[240px] flex-1 flex-col rounded-lg border bg-slate-50 p-2 transition-colors',
        isOver ? 'border-slate-900 bg-slate-100' : 'border-slate-200',
      ].join(' ')}
      data-testid={`kanban-column-${status}`}
    >
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span>{label}</span>
        <span className="text-slate-400">{tasks.length}</span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-[120px] flex-col gap-2">
          {tasks.map((t) => (
            <KanbanCard key={t.id} task={t} />
          ))}
          {tasks.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
