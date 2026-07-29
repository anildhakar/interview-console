import fs from "fs";
import path from "path";
import crypto from "crypto";
import { UPLOADS_DIR } from "./db";
import { ApiError } from "./auth";

const ALLOWED_EXT = [".pdf", ".doc", ".docx"];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export interface StoredFile {
  storedName: string; // relative name inside UPLOADS_DIR
  originalName: string;
}

export async function saveResume(file: File): Promise<StoredFile> {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    throw new ApiError(400, "Resume must be a PDF, DOC or DOCX file");
  }
  if (file.size > MAX_BYTES) {
    throw new ApiError(400, "Resume must be 10MB or smaller");
  }
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const storedName = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOADS_DIR, storedName), buf);
  return { storedName, originalName: file.name };
}

export function deleteResume(storedName: string | null) {
  if (!storedName) return;
  // Guard against path traversal — only a bare filename is valid.
  const base = path.basename(storedName);
  const full = path.join(UPLOADS_DIR, base);
  if (fs.existsSync(full)) {
    try {
      fs.unlinkSync(full);
    } catch {
      /* ignore */
    }
  }
}

export function resumeContentType(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}
