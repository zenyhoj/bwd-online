import "server-only";

import { randomUUID } from "crypto";

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png"
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
const MAX_DOCUMENT_SIZE_BYTES = 1024 * 1024;

const MIME_TYPE_EXTENSIONS: Record<string, Set<string>> = {
  "application/pdf": new Set([".pdf"]),
  "image/jpeg": new Set([".jpg", ".jpeg"]),
  "image/png": new Set([".png"])
};

function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

function sanitizeDisplayName(fileName: string) {
  const normalized = fileName.normalize("NFKC").replace(/[^\w.\- ]+/g, "_").trim();
  return normalized.slice(0, 120) || "document";
}

async function detectMagicMimeType(file: File) {
  const buffer = Buffer.from(await file.slice(0, 12).arrayBuffer());

  if (buffer.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
    return "application/pdf";
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }

  return null;
}

export async function validateDocumentFile(file: File) {
  if (file.size <= 0) {
    throw new Error("The uploaded file is empty.");
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(
      "Each document must be less than 1 MB. Compress the file before uploading: for images, lower the resolution or quality; for PDFs, use a PDF compressor or scan in grayscale/standard quality."
    );
  }

  const extension = getFileExtension(file.name);
  if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    throw new Error("Only PDF, JPG, JPEG, and PNG files are allowed.");
  }

  const detectedMimeType = await detectMagicMimeType(file);
  if (!detectedMimeType || !ALLOWED_DOCUMENT_MIME_TYPES.has(detectedMimeType)) {
    throw new Error("The uploaded file content is not a valid PDF, JPG, JPEG, or PNG file.");
  }

  if (!MIME_TYPE_EXTENSIONS[detectedMimeType]?.has(extension)) {
    throw new Error("The uploaded file extension does not match the actual file type.");
  }

  return {
    sanitizedFileName: sanitizeDisplayName(file.name),
    extension,
    mimeType: detectedMimeType
  };
}

export function buildSecureDocumentPath(applicantId: string, applicationId: string, extension: string) {
  return `${applicantId}/${applicationId}/${randomUUID()}${extension}`;
}
