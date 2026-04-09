import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import type { Task } from '@lifeos/shared';

interface KanbanCardProps {
  task: Task;
  dragging?: boolean;
}

// Sortable task card used inside a Kanban column. Pointer dragging via
// dnd-kit's default PointerSensor; keyboard dragging via KeyboardSensor
// (configured at the board level). Clicking (without drag) navigates
// to the task detail page.

export function KanbanCard({ task, dragging }: KanbanCardProps): JSX.Element {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status, sort_order: task.sort_order },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isGhost = isDragging || dragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        'group relative rounded-md border border-slate-200 bg-white p-3 shadow-sm',
        isGhost ? 'opacity-40' : 'cursor-grab active:cursor-grabbing hover:border-slate-400',
      ].join(' ')}
      onClick={(e) => {
        // Only navigate on click if it's not part of a drag. dnd-kit
        // synthesizes mousedown/mouseup that ends up firing click on
        // short interactions, which is what we want.
        if (e.defaultPrevented) return;
        navigate(`/tasks/${task.id}`);
      }}
    >
      <div className="text-sm font-medium text-slate-900">{task.title}</div>
      {task.description && (
        <div className="mt-1 line-clamp-2 text-xs text-slate-500">
          {task.description}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
        <span>
          ⚡{task.urgency} · ✨{task.importance}
        </span>
        {task.estimate_minutes && <span>{task.estimate_minutes}m</span>}
      </div>
    </div>
  );
}
