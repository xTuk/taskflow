"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import type { TaskDTO } from "@/types";

interface TaskModalProps {
  open: boolean;
  columnId: string | null;
  task: TaskDTO | null;
  s3Configured: boolean;
  onClose: () => void;
  onCreate: (
    columnId: string,
    data: { title: string; description: string | null; dueDate: string | null }
  ) => Promise<TaskDTO | null>;
  onUpdate: (taskId: string, data: Partial<TaskDTO>) => Promise<TaskDTO | null>;
  onDelete: (taskId: string) => Promise<void>;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function TaskModal({
  open,
  columnId,
  task,
  s3Configured,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: TaskModalProps) {
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(task);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTask(task);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(toDateInputValue(task?.dueDate ?? null));
    setError(null);
    setUploadError(null);
  }, [open, task]);

  const isEdit = activeTask !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setSaving(true);
    setError(null);

    const payload = {
      title: trimmedTitle,
      description: description.trim() ? description.trim() : null,
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : null,
    };

    try {
      if (isEdit && activeTask) {
        const updated = await onUpdate(activeTask.id, payload);
        if (updated) {
          setActiveTask(updated);
          onClose();
        } else {
          setError("Could not save changes. Please try again.");
        }
      } else if (columnId) {
        const created = await onCreate(columnId, payload);
        if (created) {
          // Switch into edit mode in place (instead of closing) so the
          // attachment picker unlocks immediately after creation.
          setActiveTask(created);
        } else {
          setError("Could not create the task. Please try again.");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activeTask) return;

    if (!s3Configured) {
      setUploadError(
        "File uploads are not configured. Set the AWS_* environment variables to enable attachments."
      );
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeTask.id,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setUploadError(presignData.error ?? "Could not start the upload.");
        return;
      }

      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        setUploadError("Upload to S3 failed. Please try again.");
        return;
      }

      const updated = await onUpdate(activeTask.id, {
        attachmentKey: presignData.key,
        attachmentName: presignData.fileName,
        attachmentUrl: presignData.publicUrl,
        attachmentType: presignData.fileType,
      });
      if (updated) setActiveTask(updated);
    } catch {
      setUploadError("Network error while uploading. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAttachment() {
    if (!activeTask) return;
    const updated = await onUpdate(activeTask.id, {
      attachmentKey: null,
      attachmentName: null,
      attachmentUrl: null,
      attachmentType: null,
    });
    if (updated) setActiveTask(updated);
  }

  async function handleDelete() {
    if (!activeTask) return;
    setDeleting(true);
    await onDelete(activeTask.id);
    setDeleting(false);
    setConfirmDelete(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit task" : "New task"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="task-title" className="label">
            Title
          </label>
          <input
            id="task-title"
            autoFocus
            required
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="task-description" className="label">
            Description
          </label>
          <textarea
            id="task-description"
            rows={3}
            className="input resize-none"
            placeholder="Add more detail (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="task-due" className="label">
            Due date
          </label>
          <input
            id="task-due"
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <span className="label">Attachment</span>

          {!isEdit && (
            <p className="text-xs text-slate-500">Save the task first, then attach a file.</p>
          )}

          {isEdit && (
            <div className="space-y-2">
              {activeTask?.attachmentName ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <a
                    href={activeTask.attachmentUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate text-sm font-medium text-brand-600 hover:underline"
                  >
                    {activeTask.attachmentName}
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="flex-shrink-0 text-xs font-medium text-slate-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 ${
                    uploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {uploading ? "Uploading…" : "Click to choose a file (max 10 MB)"}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              )}
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              {!s3Configured && !uploadError && (
                <p className="text-xs text-amber-600">
                  S3 is not configured on this deployment — attachments are disabled.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-ghost text-red-600 hover:bg-red-50"
              >
                Delete task
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !title.trim()}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        message="This permanently deletes the task and its attachment. This can't be undone."
        confirmLabel="Delete task"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  );
}
