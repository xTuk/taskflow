import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createBoardSchema = z.object({
  name: z.string().trim().min(1, "Board name is required").max(80),
});

export const renameBoardSchema = z.object({
  name: z.string().trim().min(1, "Board name is required").max(80),
});

export const createColumnSchema = z.object({
  name: z.string().trim().min(1, "Column name is required").max(60),
});

export const renameColumnSchema = z.object({
  name: z.string().trim().min(1, "Column name is required").max(60),
});

export const createTaskSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().trim().min(1, "Task title is required").max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  columnId: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  attachmentKey: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
  attachmentType: z.string().optional().nullable(),
});

export const presignUploadSchema = z.object({
  taskId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(120),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // 10 MB cap
});
