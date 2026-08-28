"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import BoardColumn from "./BoardColumn";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import ConfirmDialog from "./ConfirmDialog";
import type { BoardDTO, ColumnDTO, TaskDTO } from "@/types";

interface BoardViewProps {
  initialBoard: BoardDTO;
  s3Configured: boolean;
}

export default function BoardView({ initialBoard, s3Configured }: BoardViewProps) {
  const router = useRouter();

  const [boardName, setBoardName] = useState(initialBoard.name);
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [columns, setColumns] = useState<ColumnDTO[]>(initialBoard.columns);
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalColumnId, setTaskModalColumnId] = useState<string | null>(null);
  const [taskModalTask, setTaskModalTask] = useState<TaskDTO | null>(null);

  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);

  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function findColumnOfTask(taskId: string): ColumnDTO | undefined {
    return columns.find((col) => col.tasks.some((t) => t.id === taskId));
  }

  function handleDragStart(event: DragStartEvent) {
    const taskId = event.active.id as string;
    const column = findColumnOfTask(taskId);
    const task = column?.tasks.find((t) => t.id === taskId) ?? null;
    setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const targetColumnId = over.id as string;
    const sourceColumn = findColumnOfTask(taskId);
    if (!sourceColumn || sourceColumn.id === targetColumnId) return;

    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    const movingTask = sourceColumn.tasks.find((t) => t.id === taskId);
    if (!movingTask) return;

    const previousColumns = columns;
    const newOrder = targetColumn.tasks.length;

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === sourceColumn.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            tasks: [
              ...col.tasks,
              { ...movingTask, columnId: targetColumnId, order: newOrder },
            ],
          };
        }
        return col;
      })
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: targetColumnId, order: newOrder }),
      });
      if (!res.ok) setColumns(previousColumns);
    } catch {
      setColumns(previousColumns);
    }
  }

  async function handleCreateTask(
    columnId: string,
    data: { title: string; description: string | null; dueDate: string | null }
  ): Promise<TaskDTO | null> {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, ...data }),
    });
    const json = await res.json();
    if (!res.ok) return null;

    const task: TaskDTO = json.task;
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, tasks: [...col.tasks, task] } : col
      )
    );
    return task;
  }

  async function handleUpdateTask(
    taskId: string,
    data: Partial<TaskDTO>
  ): Promise<TaskDTO | null> {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return null;

    const task: TaskDTO = json.task;
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === taskId ? task : t)),
      }))
    );
    return task;
  }

  async function handleDeleteTask(taskId: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }))
      );
    }
  }

  async function handleRenameColumn(columnId: string, name: string) {
    const previous = columns;
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, name } : col))
    );
    const res = await fetch(`/api/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) setColumns(previous);
  }

  async function handleDeleteColumn(columnId: string) {
    const previous = columns;
    setColumns((prev) => prev.filter((col) => col.id !== columnId));
    const res = await fetch(`/api/columns/${columnId}`, { method: "DELETE" });
    if (!res.ok) setColumns(previous);
  }

  async function handleAddColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newColumnName.trim();
    if (!trimmed) return;

    setAddingColumn(true);
    try {
      const res = await fetch(`/api/boards/${initialBoard.id}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (res.ok) {
        setColumns((prev) => [...prev, json.column]);
        setNewColumnName("");
        setAddColumnOpen(false);
      }
    } finally {
      setAddingColumn(false);
    }
  }

  async function submitBoardRename() {
    const trimmed = boardName.trim();
    setRenamingBoard(false);
    if (!trimmed || trimmed === initialBoard.name) {
      setBoardName(initialBoard.name || trimmed);
      return;
    }
    await fetch(`/api/boards/${initialBoard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  }

  async function handleDeleteBoard() {
    setDeletingBoard(true);
    const res = await fetch(`/api/boards/${initialBoard.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setDeletingBoard(false);
      setDeleteBoardOpen(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <a href="/dashboard" className="text-slate-400 hover:text-slate-600" aria-label="Back to boards">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.66l4.1 3.95a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08l-4.1 3.95h10.59A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
          </a>
          {renamingBoard ? (
            <input
              autoFocus
              className="input h-9 max-w-xs py-1 text-lg font-semibold"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={submitBoardRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setBoardName(initialBoard.name);
                  setRenamingBoard(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setRenamingBoard(true)}
              className="truncate text-lg font-semibold text-slate-900 hover:text-brand-600"
              title="Click to rename"
            >
              {boardName}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDeleteBoardOpen(true)}
          className="btn-ghost flex-shrink-0 text-red-600 hover:bg-red-50"
        >
          Delete board
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="scroll-thin flex flex-1 items-start gap-4 overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              onAddTask={(columnId) => {
                setTaskModalColumnId(columnId);
                setTaskModalTask(null);
                setTaskModalOpen(true);
              }}
              onTaskClick={(task) => {
                setTaskModalColumnId(task.columnId);
                setTaskModalTask(task);
                setTaskModalOpen(true);
              }}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
            />
          ))}

          <div className="w-72 flex-shrink-0 sm:w-80">
            {addColumnOpen ? (
              <form onSubmit={handleAddColumn} className="rounded-xl bg-slate-100/70 p-3">
                <input
                  autoFocus
                  className="input"
                  placeholder="Column name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setAddColumnOpen(false);
                      setNewColumnName("");
                    }
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <button type="submit" className="btn-primary" disabled={addingColumn || !newColumnName.trim()}>
                    {addingColumn ? "Adding…" : "Add column"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setAddColumnOpen(false);
                      setNewColumnName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddColumnOpen(true)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={taskModalOpen}
        columnId={taskModalColumnId}
        task={taskModalTask}
        s3Configured={s3Configured}
        onClose={() => setTaskModalOpen(false)}
        onCreate={handleCreateTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      <ConfirmDialog
        open={deleteBoardOpen}
        title="Delete board"
        message="This permanently deletes the board, its columns, and every task inside it. This can't be undone."
        confirmLabel="Delete board"
        busy={deletingBoard}
        onConfirm={handleDeleteBoard}
        onCancel={() => setDeleteBoardOpen(false)}
      />
    </div>
  );
}
