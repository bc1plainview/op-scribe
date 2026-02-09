import { API_BASE_URL, MAX_FILE_SIZE } from '../types/config';

/** Result returned by the backend upload endpoint. */
export interface IpfsUploadResult {
    readonly cid: string;
    readonly fileName: string;
    readonly fileSize: number;
    readonly mimeType: string;
}

/**
 * Uploads a file to IPFS via the backend API.
 *
 * @param file - The file to upload.
 * @returns The IPFS upload result containing CID and metadata.
 * @throws Error if the file is too large or the upload fails.
 */
export async function uploadToIpfs(file: File): Promise<IpfsUploadResult> {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
    }

    if (file.size === 0) {
        throw new Error('Cannot upload an empty file.');
    }

    const response: Response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-File-Name': file.name,
        },
        body: file,
    });

    if (!response.ok) {
        const errorBody: { error?: string } = await response.json().catch(() => ({}));
        const message: string = errorBody.error ?? `Upload failed with status ${response.status}`;
        throw new Error(message);
    }

    const result: IpfsUploadResult = (await response.json()) as IpfsUploadResult;
    return result;
}
