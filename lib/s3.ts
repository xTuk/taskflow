import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REQUIRED_ENV_VARS = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
] as const;

/**
 * True only when every AWS env var needed for uploads is present.
 * The app must build and run without these set — callers use this
 * to show a friendly "not configured" message instead of crashing.
 */
export function isS3Configured(): boolean {
  return REQUIRED_ENV_VARS.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.length > 0;
  });
}

let cachedClient: S3Client | null = null;

function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
  return cachedClient;
}

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Generates a short-lived presigned URL the browser can PUT a file to
 * directly, plus the public object URL to store once the upload succeeds.
 * Throws if S3 is not configured — check `isS3Configured()` first.
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<PresignedUpload> {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured");
  }

  const bucket = process.env.S3_BUCKET_NAME as string;
  const region = process.env.AWS_REGION as string;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 60 * 5, // 5 minutes
  });

  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl };
}

/** Builds a namespaced, collision-resistant object key for a task attachment. */
export function buildAttachmentKey(taskId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `attachments/${taskId}/${Date.now()}-${safeName}`;
}
