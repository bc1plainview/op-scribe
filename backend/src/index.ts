/**
 * OP_Scribe Backend -- IPFS Upload API
 *
 * Handles file uploads to Pinata IPFS and returns CID + metadata
 * for the frontend to submit as on-chain proof via OPWallet.
 *
 * NOTE: This backend does NOT interact with the OPNet contract directly.
 * The user's browser (via OPWallet) signs and submits the registerFile
 * transaction. This server only handles IPFS pinning.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { PinataSDK } from 'pinata';

/** Maximum file size in bytes (10 MB). */
const MAX_FILE_SIZE: number = 10 * 1024 * 1024;

/** Server port. */
const PORT: number = Number(process.env['PORT'] ?? '3001');

/** Pinata JWT from environment. */
const PINATA_JWT: string = process.env['PINATA_JWT'] ?? '';

/** Pinata gateway URL (optional). */
const PINATA_GATEWAY: string = process.env['PINATA_GATEWAY'] ?? '';

/** Allowed frontend origins for CORS. */
const ALLOWED_ORIGINS: readonly string[] = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://ipfs.opnet.org',
];

/** Result of a successful IPFS upload. */
interface UploadResult {
    readonly cid: string;
    readonly fileName: string;
    readonly fileSize: number;
    readonly mimeType: string;
}

/** Standard error response shape. */
interface ErrorResponse {
    readonly error: string;
}

/**
 * Sets CORS headers on the response.
 *
 * @param req - Incoming HTTP request.
 * @param res - Outgoing HTTP response.
 * @returns Whether this was a preflight (OPTIONS) request that was handled.
 */
function handleCors(req: IncomingMessage, res: ServerResponse): boolean {
    const origin: string = req.headers['origin'] ?? '';

    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return true;
    }

    return false;
}

/**
 * Sends a JSON response.
 *
 * @param res - HTTP server response.
 * @param statusCode - HTTP status code.
 * @param body - Response body (serialized to JSON).
 */
function sendJson(res: ServerResponse, statusCode: number, body: UploadResult | ErrorResponse | { status: string }): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

/**
 * Reads the full body of an incoming request into a Buffer.
 *
 * @param req - Incoming HTTP request.
 * @param maxSize - Maximum allowed body size in bytes.
 * @returns Promise resolving to the body buffer.
 * @throws Error if body exceeds maxSize.
 */
async function readBody(req: IncomingMessage, maxSize: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let totalSize: number = 0;

    for await (const chunk of req) {
        const buf: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
        totalSize += buf.length;
        if (totalSize > maxSize) {
            throw new Error(`File exceeds maximum size of ${maxSize} bytes`);
        }
        chunks.push(buf);
    }

    return Buffer.concat(chunks);
}

/**
 * Extracts the filename from a Content-Disposition header or query param.
 *
 * @param req - Incoming HTTP request.
 * @returns Filename string, or 'upload' as default.
 */
function extractFileName(req: IncomingMessage): string {
    // Try Content-Disposition header
    const disposition: string | undefined = req.headers['content-disposition'];
    if (disposition) {
        const match: RegExpMatchArray | null = disposition.match(/filename="?([^";\n]+)"?/i);
        if (match?.[1]) {
            return match[1].trim();
        }
    }

    // Try X-File-Name custom header
    const customHeader: string | string[] | undefined = req.headers['x-file-name'];
    if (typeof customHeader === 'string' && customHeader.length > 0) {
        return customHeader;
    }

    // Try query parameter
    const url: URL = new URL(req.url ?? '/', `http://${req.headers['host'] ?? 'localhost'}`);
    const queryName: string | null = url.searchParams.get('filename');
    if (queryName) {
        return queryName;
    }

    return 'upload';
}

/**
 * Handles the POST /upload endpoint.
 * Receives a raw file body, pins it to Pinata IPFS, and returns CID + metadata.
 *
 * @param req - Incoming HTTP request (body is the raw file).
 * @param res - Outgoing HTTP response.
 */
async function handleUpload(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!PINATA_JWT) {
        sendJson(res, 500, { error: 'PINATA_JWT not configured on server' });
        return;
    }

    const contentType: string = req.headers['content-type'] ?? 'application/octet-stream';
    const fileName: string = extractFileName(req);

    let body: Buffer;
    try {
        body = await readBody(req, MAX_FILE_SIZE);
    } catch (err: unknown) {
        const message: string = err instanceof Error ? err.message : 'Upload failed';
        sendJson(res, 413, { error: message });
        return;
    }

    if (body.length === 0) {
        sendJson(res, 400, { error: 'Empty file body' });
        return;
    }

    const pinata: PinataSDK = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY });

    try {
        const fileBytes: Uint8Array<ArrayBuffer> = new Uint8Array(body.buffer as ArrayBuffer, body.byteOffset, body.byteLength);
        const file: File = new File([fileBytes], fileName, { type: contentType });
        const result = await pinata.upload.file(file);

        const uploadResult: UploadResult = {
            cid: result.cid,
            fileName: fileName,
            fileSize: body.length,
            mimeType: contentType,
        };

        sendJson(res, 200, uploadResult);
    } catch (err: unknown) {
        const message: string = err instanceof Error ? err.message : 'Pinata upload failed';
        sendJson(res, 502, { error: message });
    }
}

/**
 * Main HTTP request router.
 *
 * @param req - Incoming HTTP request.
 * @param res - Outgoing HTTP response.
 */
async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (handleCors(req, res)) {
        return;
    }

    const url: URL = new URL(req.url ?? '/', `http://${req.headers['host'] ?? 'localhost'}`);

    if (url.pathname === '/health' && req.method === 'GET') {
        sendJson(res, 200, { status: 'ok' });
        return;
    }

    if (url.pathname === '/upload' && req.method === 'POST') {
        await handleUpload(req, res);
        return;
    }

    sendJson(res, 404, { error: 'Not found' });
}

const server = createServer((req: IncomingMessage, res: ServerResponse): void => {
    handler(req, res).catch((err: unknown): void => {
        const message: string = err instanceof Error ? err.message : 'Internal error';
        console.error('[OP_Scribe Backend] Unhandled error:', message);
        if (!res.headersSent) {
            sendJson(res, 500, { error: 'Internal server error' });
        }
    });
});

server.listen(PORT, (): void => {
    console.log(`[OP_Scribe Backend] Listening on port ${PORT}`);
    console.log(`[OP_Scribe Backend] Pinata JWT: ${PINATA_JWT ? 'configured' : 'MISSING'}`);
});
