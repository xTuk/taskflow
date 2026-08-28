import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createBoardSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

const DEFAULT_COLUMNS = ["To Do", "In Progress", "Done"];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boards = await prisma.board.findMany({
    where: { ownerId: session.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { columns: true } },
      columns: {
        select: { _count: { select: { tasks: true } } },
      },
    },
  });

  const boardSummaries = boards.map((board) => ({
    id: board.id,
    name: board.name,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    taskCount: board.columns.reduce((sum, col) => sum + col._count.tasks, 0),
  }));

  return NextResponse.json({ boards: boardSummaries });
}

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

  const parsed = createBoardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const board = await prisma.board.create({
    data: {
      name: parsed.data.name,
      ownerId: session.userId,
      columns: {
        create: DEFAULT_COLUMNS.map((name, index) => ({
          name,
          order: index,
        })),
      },
    },
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: { tasks: { orderBy: { order: "asc" } } },
      },
    },
  });

  return NextResponse.json({ board }, { status: 201 });
}
