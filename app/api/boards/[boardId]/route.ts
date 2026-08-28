import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { renameBoardSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ boardId: string }>;
}

async function assertOwnedBoard(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.ownerId !== userId) return null;
  return board;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { boardId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: { tasks: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!board || board.ownerId !== session.userId) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json({ board });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { boardId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedBoard(boardId, session.userId);
  if (!owned) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = renameBoardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const board = await prisma.board.update({
    where: { id: boardId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ board });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { boardId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedBoard(boardId, session.userId);
  if (!owned) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await prisma.board.delete({ where: { id: boardId } });

  return NextResponse.json({ ok: true });
}
