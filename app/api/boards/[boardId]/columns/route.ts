import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createColumnSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ boardId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { boardId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.ownerId !== session.userId) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createColumnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const lastColumn = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { order: "desc" },
  });

  const column = await prisma.column.create({
    data: {
      name: parsed.data.name,
      boardId,
      order: (lastColumn?.order ?? -1) + 1,
    },
    include: { tasks: true },
  });

  return NextResponse.json({ column }, { status: 201 });
}
