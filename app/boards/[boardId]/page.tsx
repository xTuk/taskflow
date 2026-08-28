import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isS3Configured } from "@/lib/s3";
import Navbar from "@/components/Navbar";
import BoardView from "@/components/BoardView";
import type { BoardDTO } from "@/types";

export const dynamic = "force-dynamic";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
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

  if (!board || board.ownerId !== user.id) {
    notFound();
  }

  const boardDTO: BoardDTO = {
    id: board.id,
    name: board.name,
    ownerId: board.ownerId,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    columns: board.columns.map((column) => ({
      id: column.id,
      name: column.name,
      order: column.order,
      boardId: column.boardId,
      tasks: column.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        order: task.order,
        columnId: task.columnId,
        attachmentKey: task.attachmentKey,
        attachmentName: task.attachmentName,
        attachmentUrl: task.attachmentUrl,
        attachmentType: task.attachmentType,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    })),
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Navbar userName={user.name} />
      <BoardView initialBoard={boardDTO} s3Configured={isS3Configured()} />
    </div>
  );
}
