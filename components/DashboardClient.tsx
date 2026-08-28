"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import BoardCard from "./BoardCard";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import type { BoardSummaryDTO } from "@/types";

interface DashboardClientProps {
  initialBoards: BoardSummaryDTO[];
}

export default function DashboardClient({ initialBoards }: DashboardClientProps) {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummaryDTO[]>(initialBoards);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newBoardName.trim();
    if (!trimmed) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create board");
        return;
      }
      router.push(`/boards/${data.board.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(boardId: string, name: string) {
    const previous = boards;
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, name } : b)));
    const res = await fetch(`/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setBoards(previous);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/boards/${deleteTarget}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setBoards((prev) => prev.filter((b) => b.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your boards</h1>
          <p className="mt-1 text-sm text-slate-500">
            {boards.length === 0
              ? "Create your first board to get started."
              : `${boards.length} board${boards.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          <PlusIcon /> New board
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <PlusIcon className="h-6 w-6" />
          </div>
          <p className="font-medium text-slate-900">No boards yet</p>
          <p className="max-w-sm text-sm text-slate-500">
            Boards help you organize tasks into columns like To Do, In Progress, and Done.
          </p>
          <button type="button" className="btn-primary mt-2" onClick={() => setCreateOpen(true)}>
            Create your first board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onRename={handleRename}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setNewBoardName("");
          setError(null);
        }}
        title="Create a new board"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="board-name" className="label">
              Board name
            </label>
            <input
              id="board-name"
              autoFocus
              className="input"
              placeholder="e.g. Website Redesign"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">
            We&apos;ll set up To Do, In Progress, and Done columns for you automatically.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating || !newBoardName.trim()}>
              {creating ? "Creating…" : "Create board"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete board"
        message="This permanently deletes the board, its columns, and every task inside it. This can't be undone."
        confirmLabel="Delete board"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}
