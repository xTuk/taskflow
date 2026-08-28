"use client";

import { formatDate, isOverdue } from "@/lib/utils";
import type { TaskDTO } from "@/types";

interface TaskCardProps {
  task: TaskDTO;
  onClick?: () => void;
  dragging?: boolean;
}

export default function TaskCard({ task, onClick, dragging = false }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate);

  return (
    <div
      onClick={onClick}
      className={`group cursor-grab select-none rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow active:cursor-grabbing ${
        dragging ? "shadow-popover ring-2 ring-brand-400" : "hover:shadow-popover"
      }`}
    >
      <p className="text-sm font-medium text-slate-900">{task.title}</p>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>
      )}

      {(task.dueDate || task.attachmentName) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                overdue
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <CalendarIcon />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.attachmentName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <PaperclipIcon />
              Attachment
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 6.5a.5.5 0 000 1h10.5a.5.5 0 000-1H4.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
      <path
        fillRule="evenodd"
        d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z"
        clipRule="evenodd"
      />
    </svg>
  );
}
