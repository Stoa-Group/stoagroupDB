import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { isBlobStorageConfigured } from '../config/azureBlob';

/** Resolve relative to api folder so server and attach scripts use the same path (dist is api/dist). */
const DEFAULT_UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const UPLOAD_DIR = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
const DEAL_PIPELINE_SUBDIR = 'deal-pipeline';
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

export function getDealPipelineUploadDir(dealPipelineId: number): string {
  const dir = path.join(UPLOAD_DIR, DEAL_PIPELINE_SUBDIR, String(dealPipelineId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getFullPath(storagePath: string): string {
  return path.join(UPLOAD_DIR, storagePath);
}

/** Path relative to UPLOAD_DIR for storing in DB (portable). Same format used for blob path: deal-pipeline/{id}/{filename}. */
export function getRelativeStoragePath(fullPath: string): string {
  return path.relative(UPLOAD_DIR, fullPath).split(path.sep).join('/');
}

/** Build storage path string for blob or disk: deal-pipeline/{dealPipelineId}/{filename}. */
export function buildStoragePath(dealPipelineId: number, fileName: string): string {
  const ext = path.extname(fileName) || '';
  const base = sanitizeFileName(path.basename(fileName, ext)).slice(0, 180);
  const name = `${randomUUID()}-${base}${ext}`;
  return `${DEAL_PIPELINE_SUBDIR}/${dealPipelineId}/${name}`.split(path.sep).join('/');
}

/**
 * Multer config for deal pipeline attachments.
 * When Azure Blob is configured, uses memory storage (buffer) so controller can upload to blob.
 * Otherwise uses disk storage.
 * Expects route param :id to be DealPipelineId. Field name: "file"
 */
export const dealPipelineAttachmentUpload = multer({
  storage: isBlobStorageConfigured()
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, _file, cb) => {
          const id = req.params?.id;
          if (!id) {
            cb(new Error('Deal pipeline id is required'), '');
            return;
          }
          const dealPipelineId = parseInt(id, 10);
          if (isNaN(dealPipelineId)) {
            cb(new Error('Invalid deal pipeline id'), '');
            return;
          }
          const dir = getDealPipelineUploadDir(dealPipelineId);
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || '';
          const base = sanitizeFileName(path.basename(file.originalname, ext));
          const name = `${randomUUID()}-${base}${ext}`;
          cb(null, name);
        },
      }),
  limits: { fileSize: MAX_FILE_SIZE },
});
