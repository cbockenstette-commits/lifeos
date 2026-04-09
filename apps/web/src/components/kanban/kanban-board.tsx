import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@lifeos/shared';
import { KanbanColumn } from './kanban-column.js';
import { KanbanCard } from './kanban-card.js';
import { computeInsertSortOrder } from './sort-order.js';
import { useUpdateTaskPosition } from '../../hooks/use-update-task-position.js';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review', label: 'Review' },
  { status: 'done', label: 'Done' },
];

function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
  for (const t of tasks) {
    groups[t.status].push(t);
  }
  for (const status of Object.keys(groups) as TaskStatus[]) {
    groups[status].sort((a, b) => a.sort_order - b.sort_order);
  }
  return groups;
}

function parseStatusFromOverId(overId: string): TaskStatus | null {
  if (overId.startsWith('column:')) {
    return overId.slice('column:'.length) as TaskStatus;
  }
  return null;
}

interface KanbanBoardProps {
  tasks: Task[];
}

export function KanbanBoard({ tasks }: KanbanBoardProps): JSX.Element {
  const updatePosition = useUpdateTaskPosition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const groups = useMemo(() => groupByStatus(tasks), [tasks]);
  const activeTask = useMemo(
    () => (activeId ? tasks.find((t) => t.id === activeId) ?? null : null),
    [activeId, tasks],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const source = tasks.find((t) => t.id === activeId);
    if (!source) return;

    // Target column: either the column droppable, or the status of the
    // task we're hovering over.
    const overColumnStatus = parseStatusFromOverId(overId);
    const overTask = tasks.find((t) => t.id === overId);
    const targetStatus: TaskStatus | null =
      overColumnStatus ?? overTask?.status ?? null;
    if (!targetStatus) return;

    // Build the destination column's ordering, excluding the source.
    const destColumn = groups[targetStatus].filter((t) => t.id !== activeId);

    // Where in destColumn does the source land?
    let index: number;
    if (overColumnStatus || !overTask) {
      // Dropped on the column itself (empty or on the drop zone), append.
      index = destColumn.length;
    } else {
      const overIndex = destColumn.findIndex((t) => t.id === overTask.id);
      index = overIndex < 0 ? destColumn.length : overIndex;
    }

    const newSortOrder = computeInsertSortOrder(destColumn, index);

    // Skip mutation if nothing would change.
    if (source.status === targetStatus && source.sort_order === newSortOrder) {
      return;
    }

    updatePosition.mutate({
      id: activeId,
      status: targetStatus,
      sort_order: newSortOrder,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto p-2">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            tasks={groups[col.status]}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
