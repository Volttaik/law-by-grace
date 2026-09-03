import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 storage (S3-compatible).
 *
 * THE LAW With Gracious media lives in the shared R2 bucket under a dedicated
 * `law-by-grace/` key prefix so it never collides with other projects'
 * objects. Database records only ever store a compact media reference
 * (`/api/r2/<base64url key>`); the actual bytes stay in R2.
 */

const PREFIX = "law-by-grace/";
const MEDIA_MARKER = "/api/r2/";

export function isConfigured() {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.R2_REGION ?? "auto",
      endpoint: process.env.R2_ENDPOINT ?? undefined,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
      maxAttempts: 2,
    });
  }
  return client;
}

function safeObjectName(original: string) {
  return original.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140);
}

/** Build an isolated, collision-resistant object key for a scope + filename. */
export function buildKey(scope: string, originalName: string) {
  return `${PREFIX}${scope}/${Date.now()}_${safeObjectName(originalName)}`;
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array | string | Blob,
  contentType: string
) {
  if (!isConfigured()) throw new Error("R2 storage is not configured");
  await s3().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body as any,
      ContentType: contentType || "application/octet-stream",
    })
  );
  return { key };
}

/**
 * Presign a PUT URL so the browser can upload straight to R2 — bypassing the
 * serverless request-body limit. Callers still validate the file server-side
 * (see src/lib/uploads.ts) before signing.
 */
export async function presignPut(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  return getSignedUrl(s3(), command, { expiresIn });
}

export async function deleteObject(key: string) {
  if (!isConfigured()) return;
  try {
    await s3().send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (err) {
    console.error("[storage] delete failed", key, err);
  }
}

/** Base64url-encoded media reference stored in the database. */
export function mediaRef(key: string) {
  return `${MEDIA_MARKER}${Buffer.from(key, "utf8").toString("base64url")}`;
}

/** Extract the R2 key from a stored media reference, or null if it isn't ours. */
export function keyFromRef(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const i = ref.indexOf(MEDIA_MARKER);
  if (i < 0) return null;
  const encoded = ref.slice(i + MEDIA_MARKER.length).split(/[?#]/)[0];
  try {
    const key = Buffer.from(encoded, "base64url").toString("utf8");
    return key.startsWith(PREFIX) ? key : null;
  } catch {
    return null;
  }
}

export function isLegacyHttpRef(ref: string | null | undefined): boolean {
  return /^https?:\/\//.test(ref ?? "");
}

/** Copy a typed array into a standalone ArrayBuffer (safe for Response bodies). */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

/** Fully read a stored reference into memory (used by server-side text extraction). */
export async function readRefBytes(
  ref: string | null | undefined
): Promise<Uint8Array | null> {
  const content = await readRef(ref);
  if (!content) return null;
  if (content.bytes) return content.bytes;
  if (content.stream) {
    const reader = content.stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const total = chunks.reduce((acc, c) => acc + c.byteLength, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return out;
  }
  return null;
}

/** Delete every object referenced by a stored value (media ref or legacy URL). */
export async function deleteRef(ref: string | null | undefined) {
  const key = keyFromRef(ref);
  if (key) {
    await deleteObject(key);
    return;
  }
  // Legacy Vercel Blob / external URLs cannot be removed without the old
  // provider credentials — the record is gone, which is the important part.
}

/** Delete a reference plus its companion `.decoy` object (used for PDFs). */
export async function deleteRefWithDecoy(ref: string | null | undefined) {
  const key = keyFromRef(ref);
  if (key) {
    await deleteObject(key);
    await deleteObject(key + ".decoy");
  }
}

async function streamFromBody(body: any): Promise<ReadableStream<Uint8Array> | null> {
  if (!body) return null;
  try {
    if (typeof body.transformToWebStream === "function") {
      return body.transformToWebStream() as ReadableStream<Uint8Array>;
    }
    if (typeof body.transformToByteArray === "function") {
      const bytes = (await body.transformToByteArray()) as Uint8Array;
      return new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });
    }
    // Node.js readable stream fallback.
    const { Readable } = await import("node:stream");
    if (body && typeof body.pipe === "function") {
      return Readable.toWeb(body) as unknown as ReadableStream<Uint8Array>;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export interface StoredContent {
  contentType: string;
  length: number;
  stream?: ReadableStream<Uint8Array>;
  bytes?: Uint8Array;
}

/**
 * Resolve a stored reference to streamable content.
 * Works for R2 media refs (primary) and legacy external URLs (fallback).
 */
export async function readRef(
  ref: string | null | undefined
): Promise<StoredContent | null> {
  const key = keyFromRef(ref);
  if (key) {
    const obj = await s3().send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
    const contentType = obj.ContentType ?? "application/octet-stream";
    const length = Number(obj.ContentLength ?? 0);
    const stream = await streamFromBody(obj.Body);
    if (stream) return { contentType, length, stream };
    return null;
  }

  if (isLegacyHttpRef(ref)) {
    const res = await fetch(ref as string);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return {
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      length: bytes.byteLength,
      bytes,
    };
  }

  return null;
}
