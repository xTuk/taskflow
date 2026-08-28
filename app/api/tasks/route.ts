import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createTaskSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const column = await prisma.column.findUnique({
    where: { id: parsed.data.columnId },
    include: { board: true },
  });

  if (!column || column.board.ownerId !== session.userId) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  const lastTask = await prisma.task.findFirst({
    where: { columnId: parsed.data.columnId },
    orderBy: { order: "desc" },
  });

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      columnId: parsed.data.columnId,
      order: (lastTask?.order ?? -1) + 1,
    },
  });

  // Bumping the board's updatedAt keeps the dashboard's "recently active" ordering accurate.
  await prisma.board.update({
    where: { id: column.boardId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ task }, { status: 201 });
}
