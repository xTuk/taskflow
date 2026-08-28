import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { presignUploadSchema } from "@/lib/validators";
import { isS3Configured, createPresignedUploadUrl, buildAttachmentKey } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      {
        error:
          "File uploads are not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and S3_BUCKET_NAME to enable attachments.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = presignUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { taskId, fileName, fileType, fileSize } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: true } } },
  });

  if (!task || task.column.board.ownerId !== session.userId) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const key = buildAttachmentKey(taskId, fileName);

  try {
    const presigned = await createPresignedUploadUrl(key, fileType);
    return NextResponse.json({
      uploadUrl: presigned.uploadUrl,
      key: presigned.key,
      publicUrl: presigned.publicUrl,
      fileName,
      fileType,
      fileSize,
    });
  } catch (error) {
    console.error("Failed to create presigned upload URL", error);
    return NextResponse.json(
      { error: "Could not create an upload URL. Please try again." },
      { status: 500 }
    );
  }
}
