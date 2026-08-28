"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import type { BoardSummaryDTO } from "@/types";

interface BoardCardProps {
  board: BoardSummaryDTO;
  onRename: (boardId: string, name: string) => Promise<void>;
  onDelete: (boardId: string) => void;
}

export default function BoardCard({ board, onRename, onDelete }: BoardCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(board.name);

  async function submitRename() {
    const trimmed = name.trim();
    setRenaming(false);
    if (!trimmed || trimmed === board.name) {
      setName(board.name);
      return;
    }
    await onRename(board.id, trimmed);
  }

  return (
    <div className="card group relative flex flex-col p-5 transition-shadow hover:shadow-popover">
      <div className="mb-3 flex items-start justify-between gap-2">
        {renaming ? (
          <input
            autoFocus
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setName(board.name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <Link href={`/boards/${board.id}`} className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900 group-hover:text-brand-600">
              {board.name}
            </h3>
          </Link>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Board options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
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
                    onDelete(board.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Link href={`/boards/${board.id}`} className="flex flex-1 flex-col justify-end">
        <p className="text-sm text-slate-500">
          {board.taskCount} {board.taskCount === 1 ? "task" : "tasks"}
        </p>
        <p className="mt-1 text-xs text-slate-400">Updated {formatDate(board.updatedAt)}</p>
      </Link>
    </div>
  );
}
