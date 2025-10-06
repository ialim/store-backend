import type { AssetEntityType, AssetKind } from '../generated/graphql';
import { getApiBase, getAuthToken } from './api';

export type UploadAssetOptions = {
  file: File;
  kind?: AssetKind;
  entityType?: AssetEntityType;
  entityId?: string;
  isPrimary?: boolean;
  metadata?: Record<string, unknown>;
};

export type UploadedAssetAssignment = {
  id: string;
  assetId: string;
  entityType: AssetEntityType;
  entityId: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UploadedAsset = {
  id: string;
  kind: AssetKind;
  url: string;
  filename?: string | null;
  mimetype?: string | null;
  size?: number | null;
  metadata?: unknown;
  assignments?: UploadedAssetAssignment[];
};

export async function uploadAsset(options: UploadAssetOptions): Promise<UploadedAsset> {
  const { file, kind, entityType, entityId, isPrimary, metadata } = options;
  const apiBase = getApiBase();
  const fd = new FormData();
  fd.append('file', file);
  if (kind) fd.append('kind', kind);
  if (entityType) fd.append('entityType', entityType);
  if (entityId) fd.append('entityId', entityId);
  if (typeof isPrimary === 'boolean') {
    fd.append('isPrimary', isPrimary ? 'true' : 'false');
  }
  if (metadata) {
    try {
      fd.append('metadata', JSON.stringify(metadata));
    } catch {
      // Ignore serialization issues for now
    }
  }

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}/assets`, {
    method: 'POST',
    body: fd,
    headers,
  });

  if (!response.ok) {
    let message = `Failed to upload asset (status ${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) {
        message = body.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {}
    }
    throw new Error(message);
  }

  const data = (await response.json()) as UploadedAsset;
  return data;
}
