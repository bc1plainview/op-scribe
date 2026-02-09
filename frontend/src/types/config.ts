/** Application configuration constants. */

/** Backend API base URL for IPFS uploads. */
export const API_BASE_URL: string = 'http://localhost:3001';

/** OPNet RPC endpoint (regtest). */
export const OPNET_RPC_URL: string = 'https://regtest.opnet.org';

/** OP_Scribe contract address on regtest (set after deployment). */
export const CONTRACT_ADDRESS: string = '';

/** Maximum file size in bytes (10 MB). */
export const MAX_FILE_SIZE: number = 10 * 1024 * 1024;

/** Maximum file size display string. */
export const MAX_FILE_SIZE_DISPLAY: string = '10 MB';
