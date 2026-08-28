import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import DashboardClient from "@/components/DashboardClient";
import type { BoardSummaryDTO } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const boards = await prisma.board.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      columns: { select: { _count: { select: { tasks: true } } } },
    },
  });

  const boardSummaries: BoardSummaryDTO[] = boards.map((board) => ({
    id: board.id,
    name: board.name,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    taskCount: board.columns.reduce((sum, col) => sum + col._count.tasks, 0),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName={user.name} />
      <DashboardClient initialBoards={boardSummaries} />
    </div>
  );
}
