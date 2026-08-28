"use client";

import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import DraggableTaskCard from "./DraggableTaskCard";
import ConfirmDialog from "./ConfirmDialog";
import type { ColumnDTO, TaskDTO } from "@/types";

interface BoardColumnProps {
  column: ColumnDTO;
  onAddTask: (columnId: string) => void;
  onTaskClick: (task: TaskDTO) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export default function BoardColumn({
  column,
  onAddTask,
  onTaskClick,
  onRenameColumn,
  onDeleteColumn,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function submitRename() {
    const trimmed = name.trim();
    setRenaming(false);
    if (!trimmed || trimmed === column.name) {
      setName(column.name);
      return;
    }
    onRenameColumn(column.id, trimmed);
  }

  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col rounded-xl bg-slate-100/70 sm:w-80">
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        {renaming ? (
          <input
            autoFocus
            className="input h-8 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setName(column.name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <h3 className="flex items-center gap-2 truncate text-sm font-semibold text-slate-700">
            {column.name}
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
              {column.tasks.length}
            </span>
          </h3>
        )}

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            aria-label="Column options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg bg-white py-1 shadow-popover ring-1 ring-slate-900/5">
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setRenaming(true);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  Delete column
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`scroll-thin mx-2 mb-2 mt-2 flex-1 space-y-2 overflow-y-auto rounded-lg p-1 transition-colors ${
          isOver ? "bg-brand-50 ring-2 ring-inset ring-brand-300" : ""
        }`}
      >
        {column.tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {column.tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
            Drop tasks here
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddTask(column.id)}
        className="mx-2 mb-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        Add task
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete column"
        message={`This deletes "${column.name}" and all ${column.tasks.length} task(s) in it. This can't be undone.`}
        confirmLabel="Delete column"
        onConfirm={() => {
          setConfirmDelete(false);
          onDeleteColumn(column.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
