import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { updateTaskSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

async function assertOwnedTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: true } } },
  });
  if (!task || task.column.board.ownerId !== userId) return null;
  return task;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedTask(taskId, session.userId);
  if (!owned) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // If the task is moving to a different column, make sure that column
  // belongs to the same board (and thus the same owner).
  if (parsed.data.columnId && parsed.data.columnId !== owned.columnId) {
    const targetColumn = await prisma.column.findUnique({
      where: { id: parsed.data.columnId },
    });
    if (!targetColumn || targetColumn.boardId !== owned.column.boardId) {
      return NextResponse.json(
        { error: "Target column not found" },
        { status: 404 }
      );
    }
  }

  const { dueDate, ...rest } = parsed.data;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...rest,
      ...(dueDate !== undefined
        ? { dueDate: dueDate ? new Date(dueDate) : null }
        : {}),
    },
  });

  await prisma.board.update({
    where: { id: owned.column.boardId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ task });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedTask(taskId, session.userId);
  if (!owned) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id: taskId } });

  return NextResponse.json({ ok: true });
}
