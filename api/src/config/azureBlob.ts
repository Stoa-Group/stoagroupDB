/**
 * Azure Blob Storage for deal pipeline attachments.
 * When AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER are set,
 * uploads/downloads use blob storage so files persist across redeploys.
 */

import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || 'deal-pipeline-attachments';

export function isBlobStorageConfigured(): boolean {
  return Boolean(CONNECTION_STRING && CONTAINER_NAME);
}

function getBlobClient(blobPath: string): BlockBlobClient | null {
  if (!CONNECTION_STRING || !CONTAINER_NAME) return null;
  const client = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  const container = client.getContainerClient(CONTAINER_NAME);
  return container.getBlockBlobClient(blobPath);
}

/**
 * Upload buffer to blob at path (e.g. deal-pipeline/123/uuid-file.pdf).
 * Returns the same path for StoragePath in DB.
 */
export async function uploadBufferToBlob(
  blobPath: string,
  buffer: Buffer,
  contentType?: string
): Promise<string> {
  const blob = getBlobClient(blobPath);
  if (!blob) throw new Error('Azure Blob Storage is not configured');
  await blob.uploadData(buffer, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
  });
  return blobPath;
}

/**
 * Download blob to stream. Caller pipes to response.
 */
export async function downloadBlobToStream(
  blobPath: string
): Promise<{ readableStream: NodeJS.ReadableStream; contentType?: string } | null> {
  const blob = getBlobClient(blobPath);
  if (!blob) return null;
  const download = await blob.download();
  return {
    readableStream: download.readableStreamBody!,
    contentType: download.contentType,
  };
}

/**
 * Delete blob if it exists.
 */
export async function deleteBlob(blobPath: string): Promise<boolean> {
  const blob = getBlobClient(blobPath);
  if (!blob) return false;
  try {
    await blob.deleteIfExists();
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure container exists (call once at startup if using blob).
 */
export async function ensureContainerExists(): Promise<void> {
  if (!CONNECTION_STRING || !CONTAINER_NAME) return;
  const client = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  const container = client.getContainerClient(CONTAINER_NAME);
  await container.createIfNotExists();
}
