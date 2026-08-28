import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { renameColumnSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ columnId: string }>;
}

async function assertOwnedColumn(columnId: string, userId: string) {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: true },
  });
  if (!column || column.board.ownerId !== userId) return null;
  return column;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { columnId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedColumn(columnId, session.userId);
  if (!owned) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = renameColumnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const column = await prisma.column.update({
    where: { id: columnId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ column });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { columnId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedColumn(columnId, session.userId);
  if (!owned) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  await prisma.column.delete({ where: { id: columnId } });

  return NextResponse.json({ ok: true });
}
