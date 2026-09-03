/**
 * THE LAW With Gracious · shared upload policy.
 *
 * Used by every material upload path so the rules can never drift:
 *  - the classic multipart POST /api/courses/[slug]/files
 *  - the presigned direct-to-R2 flow (presign → PUT to R2 → record)
 */

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/msword",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
  "video/webm",
]);

export const BLOCKED_EXTENSIONS =
  /\\.(html?|svg|php|sh|exe|bat|cmd|js|mjs|ts|jsx|tsx|py|rb|go|java|c|cpp)$/i;

export const MEDIA_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
  "video/webm",
]);

export function isMediaMime(mime: string): boolean {
  return MEDIA_MIMES.has(mime);
}

export interface UploadIssue {
  status: number;
  error: string;
}

/** Returns an issue when the file must be rejected, otherwise null. */
export function validateUpload(
  name: string,
  mimeType: string,
  size: number
): UploadIssue | null {
  if (!name) return { status: 400, error: "No file name provided" };
  if (size > MAX_FILE_SIZE) {
    return { status: 413, error: "File exceeds 50 MB limit" };
  }
  if (BLOCKED_EXTENSIONS.test(name)) {
    return { status: 415, error: "File type not allowed" };
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType) && !mimeType.startsWith("text/")) {
    return { status: 415, error: "File type not allowed" };
  }
  return null;
}
